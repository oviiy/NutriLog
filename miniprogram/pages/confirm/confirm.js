// pages/confirm/confirm.js
const storage = require('../../utils/storage.js')
const i18n = require('../../utils/i18n.js')

Page({
  data: {
    items: [],
    baseItems: [], // Reference AI estimates
    notes: '',
    rawText: '',
    inputType: 'text',
    rawInput: '',
    total: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    scaledTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    selectedDate: '',
    selectedTime: '',
    portionScale: 100,
    t: {}
  },

  onLoad() {
    const pending = getApp().globalData.pendingEntry
    if (!pending) {
      wx.showToast({ title: 'Nothing to confirm', icon: 'none' })
      wx.navigateBack()
      return
    }

    const lang = wx.getStorageSync('nutrilog.lang') || 'en'
    const t = i18n[lang]

    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')

    const items = (pending.parsed.items || []).map(it => ({
      name: it.name || '',
      portion: it.portion || '',
      calories: Number(it.calories) || 0,
      protein_g: Number(it.protein_g) || 0,
      carbs_g: Number(it.carbs_g) || 0,
      fat_g: Number(it.fat_g) || 0
    }))

    // Keep a deep copy of AI's original data as a base for scaling
    const baseItems = JSON.parse(JSON.stringify(items))
    
    // Default time logic: If not today, fallback to 18:00
    const isToday = pending.defaultDate === storage.todayKey()
    const defaultTime = isToday ? `${hh}:${mm}` : '18:00'

    this.setData({
      items,
      baseItems,
      notes: pending.parsed.notes || '',
      rawText: pending.transcript || '',
      inputType: pending.inputType || 'text',
      rawInput: pending.transcript || pending.tempImagePath || '',
      selectedDate: pending.defaultDate || `${y}-${m}-${d}`,
      selectedTime: defaultTime,
      t
    })
    this.recalc()
  },

  onDateChange(e) {
    this.setData({ selectedDate: e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ selectedTime: e.detail.value })
  },

  recalc() {
    const total = storage.totals(this.data.items)
    const scale = this.data.portionScale / 100
    const scaledTotal = {
      calories: Math.round(total.calories * scale),
      protein:  Math.round(total.protein * scale),
      carbs:    Math.round(total.carbs * scale),
      fat:      Math.round(total.fat * scale)
    }
    Object.keys(total).forEach(k => total[k] = Math.round(total[k]))
    this.setData({ total, scaledTotal })
  },

  onScaleChange(e) {
    this.setData({ portionScale: e.detail.value }, () => {
      this.recalc()
    })
  },

  onQuickScale(e) {
    this.setData({ portionScale: Number(e.currentTarget.dataset.val) }, () => {
      this.recalc()
    })
  },

  // Helper to extract first number from a string (e.g. "200g" -> 200)
  _parseNum(str) {
    const m = String(str).match(/(\d+(\.\d+)?)/)
    return m ? parseFloat(m[1]) : null
  },

  onEdit(e) {
    const { i, k } = e.currentTarget.dataset
    const items = this.data.items
    const val = e.detail.value
    items[i][k] = val
    
    // SMART FEATURE: If user overwrites the portion (e.g. "100g" -> "200g"), 
    // auto-adjust calories/macros based on the ratio.
    if (k === 'portion') {
      const baseVal = this._parseNum(this.data.baseItems[i].portion)
      const newVal = this._parseNum(val)
      
      if (baseVal && newVal && baseVal > 0) {
        const ratio = newVal / baseVal
        const base = this.data.baseItems[i]
        items[i].calories = Math.round(base.calories * ratio)
        items[i].protein_g = Number((base.protein_g * ratio).toFixed(1))
        items[i].carbs_g = Number((base.carbs_g * ratio).toFixed(1))
        items[i].fat_g = Number((base.fat_g * ratio).toFixed(1))
      }
    }
    
    this.setData({ items })
    this.recalc()
  },

  onEditNum(e) {
    const { i, k } = e.currentTarget.dataset
    const items = this.data.items
    items[i][k] = Number(e.detail.value) || 0
    this.setData({ items })
    this.recalc()
  },

  onRemove(e) {
    const i = e.currentTarget.dataset.i
    const items = this.data.items.filter((_, idx) => idx !== i)
    this.setData({ items })
    this.recalc()
  },

  onAddItem() {
    const items = this.data.items.concat([{
      name: '', portion: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0
    }])
    this.setData({ items })
    this.recalc()
  },

  onCancel() {
    getApp().globalData.pendingEntry = null
    wx.navigateBack()
  },

  onSave() {
    if (!this.data.items.length) {
      wx.showToast({ title: 'Add at least one item', icon: 'none' })
      return
    }

    const scale = this.data.portionScale / 100
    const scaledItems = this.data.items.map(it => ({
      ...it,
      calories:  Math.round(it.calories * scale),
      protein_g: Number((it.protein_g * scale).toFixed(1)),
      carbs_g:   Number((it.carbs_g * scale).toFixed(1)),
      fat_g:     Number((it.fat_g * scale).toFixed(1)),
      portion:   this.data.portionScale === 100 ? it.portion : `${it.portion} (${this.data.portionScale}%)`
    }))

    // Construct custom timestamp from selected date and time
    const [y, m, d] = this.data.selectedDate.split('-').map(Number)
    const [hh, mm] = this.data.selectedTime.split(':').map(Number)
    const customDate = new Date(y, m - 1, d, hh, mm)
    
    storage.addEntry({
      date: this.data.selectedDate,
      timestamp: customDate.getTime(),
      inputType: this.data.inputType,
      rawInput: this.data.rawInput,
      items: scaledItems,
      notes: this.data.notes
    })
    
    getApp().globalData.pendingEntry = null
    wx.showToast({ title: this.data.t.save, icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  }
})
