// pages/index/index.js
const storage = require('../../utils/storage.js')
const i18n = require('../../utils/i18n.js')

const FUN_MESSAGES = [
  "Consulting the cloud-brain... 🧠",
  "Counting calories in the mist... ☁️",
  "Negotiating with the pizza gods... 🍕",
  "Whispering to the vegetables... 🥦",
  "Dreaming of a lighter you... ✨",
  "Almost there! Just one more cloud... 🌈"
]

Page({
  data: {
    day: { date: '', totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, entries: [] },
    profile: { weight: 0, height: 0 },
    targets: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    weeklyTrend: [],
    trendMax: 0,
    dateRange: [],
    selectedDate: '',
    lang: 'en',
    t: {},
    analyzing: false,
    analysisMessage: ''
  },

  onLoad() {
    const lang = wx.getStorageSync('nutrilog.lang') || 'en'
    this.setData({ 
      selectedDate: storage.todayKey(),
      lang,
      t: i18n[lang]
    })
  },

  onShow() {
    this.refresh()
  },

  onToggleLang() {
    const lang = this.data.lang === 'en' ? 'zh' : 'en'
    wx.setStorageSync('nutrilog.lang', lang)
    this.setData({ lang, t: i18n[lang] }, () => {
      this.refresh()
    })
  },

  refresh() {
    const selectedDate = this.data.selectedDate || storage.todayKey()
    const day = storage.getDay(selectedDate)
    const profile = storage.getProfile()
    const targets = storage.calculateTarget(profile)

    const fullRange = storage.getDayRange(14)
    const recent7 = fullRange.slice(-7)
    const trendMax = Math.max(...fullRange.map(d => d.totals.calories), targets.calories, 100)
    
    const weeklyTrend = recent7.map(d => ({
      label: d.shortDay,
      subLabel: d.displayDate,
      kcal: Math.round(d.totals.calories),
      height: Math.round((d.totals.calories / trendMax) * 100)
    }))

    const dateRange = fullRange.map(d => ({
      date: d.date,
      label: d.date === storage.todayKey() ? this.data.t.today : d.displayDate,
      selected: d.date === selectedDate
    }))

    day.entries = day.entries.map(e => ({
      ...e,
      x: 0, // Reset swipe position
      timeText: new Date(e.timestamp).toTimeString().slice(0, 5),
      subtotal: storage.totals(e.items)
    }))
    Object.keys(day.totals).forEach(k => day.totals[k] = Math.round(day.totals[k]))

    this.setData({ day, profile, targets, weeklyTrend, trendMax, dateRange, selectedDate })
  },

  onSelectDate(e) {
    const date = e.currentTarget.dataset.date
    this.setData({ selectedDate: date }, () => this.refresh())
  },

  // ───── Swipe Logic (Dynamic Height) ──────────────────────────────
  onTouchStart(e) {
    this.touchStartX = e.touches[0].clientX
    this.currentSwipeId = e.currentTarget.dataset.id
  },

  onTouchMove(e) {
    const deltaX = e.touches[0].clientX - this.touchStartX
    if (deltaX > 0) return // Don't swipe right
    
    const entries = this.data.day.entries.map(item => {
      if (item.id === this.currentSwipeId) {
        // Limit swipe to action width (240rpx approx 120px)
        const offset = Math.max(deltaX, -120) 
        return { ...item, offsetX: offset * 2 } // Convert to rpx
      }
      return { ...item, offsetX: 0 }
    })
    this.setData({ 'day.entries': entries })
  },

  onTouchEnd(e) {
    const entries = this.data.day.entries.map(item => {
      if (item.id === this.currentSwipeId) {
        // If swiped more than half way, snap open, else snap back
        const finalOffset = (item.offsetX < -120) ? -240 : 0
        return { ...item, offsetX: finalOffset }
      }
      return item
    })
    this.setData({ 'day.entries': entries })
  },

  onManualEdit(e) {
    const item = e.currentTarget.dataset.item
    getApp().globalData.pendingEntry = {
      inputType: item.inputType,
      transcript: item.rawInput,
      parsed: { items: item.items, notes: item.notes }
    }
    // Deep copy to avoid reference issues
    getApp().globalData.editingId = item.id
    wx.navigateTo({ url: '/pages/confirm/confirm' })
  },

  onSetProfile() {
    const current = storage.getProfile()
    const { t } = this.data
    wx.showModal({
      title: t.weight,
      content: t.enterWeight,
      editable: true,
      placeholderText: `${current.weight || 70}`,
      success: (resW) => {
        if (resW.confirm && resW.content) {
          const weight = Number(resW.content)
          wx.showModal({
            title: t.height,
            content: t.enterHeight,
            editable: true,
            placeholderText: `${current.height || 170}`,
            success: (resH) => {
              if (resH.confirm && resH.content) {
                const height = Number(resH.content)
                const newProfile = { ...current, weight, height }
                storage.saveProfile(newProfile)
                wx.showToast({ title: t.save, icon: 'success' })
                this.refresh()
              }
            }
          })
        }
      }
    })
  },

  onSnap() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const tempPath = res.tempFilePaths[0]
        this.setData({ analyzing: true, analysisMessage: FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)] })
        
        // Step 1: Compress heavily to ensure the file is tiny (<100KB)
        wx.compressImage({
          src: tempPath,
          quality: 20, 
          success: (comp) => {
            // Step 2: Upload to Cloud Storage (No 1MB limit here)
            const cloudPath = `meals/${Date.now()}-${Math.floor(Math.random()*1000)}.jpg`
            wx.cloud.uploadFile({
              cloudPath,
              filePath: comp.tempFilePath,
              success: (uploadRes) => {
                // Step 3: Pass ONLY the fileID to the AI function
                this.parseAndConfirm({ inputType: 'photo', fileID: uploadRes.fileID })
              },
              fail: (e) => {
                console.error('Upload failed:', e)
                this.setData({ analyzing: false })
                wx.showToast({ title: 'Cloud full/error', icon: 'none' })
              }
            })
          },
          fail: (e) => {
            console.error('Compression failed:', e)
            this.setData({ analyzing: false })
            wx.showToast({ title: 'Photo error', icon: 'none' })
          }
        })
      }
    })
  },

  onTextInput() {
    wx.showModal({
      title: this.data.t.describe,
      editable: true,
      placeholderText: this.data.t.describeSub,
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          this.setData({ analyzing: true, analysisMessage: FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)] })
          this.parseAndConfirm({ inputType: 'text', transcript: res.content.trim() })
        }
      }
    })
  },

  parseAndConfirm(payload) {
    const finish = (parsed) => {
      this.setData({ analyzing: false })
      if (parsed && parsed.error) {
        wx.showModal({ title: 'AI Error', content: parsed.error, showCancel: false })
        return
      }
      if (!parsed || !parsed.items || !parsed.items.length) {
        wx.showToast({ title: 'No food detected', icon: 'none' })
        return
      }
      getApp().globalData.pendingEntry = { 
        ...payload, 
        parsed,
        defaultDate: this.data.selectedDate // Pass selected timeline date
      }
      wx.navigateTo({ url: '/pages/confirm/confirm' })
    }

    const fail = (err) => {
      this.setData({ analyzing: false })
      wx.showModal({
        title: 'Could not parse',
        content: (err && err.errMsg) || 'Try again.',
        showCancel: false
      })
    }

    wx.cloud.callFunction({
      name: 'parseFood',
      config: { timeout: 60000 },
      data: { 
        mode: payload.inputType === 'photo' ? 'photo' : 'text',
        fileID: payload.fileID,
        directBase64: payload.directBase64, // FIX: Pass the actual image data!
        transcript: payload.transcript 
      },
      success: (r) => finish(r.result),
      fail
    })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: 'Delete this entry?',
      success: (res) => {
        if (res.confirm) {
          storage.deleteEntry(this.data.selectedDate, id)
          this.refresh()
        }
      }
    })
  },

  onHistory() {
    wx.navigateTo({ url: '/pages/history/history' })
  }
})
