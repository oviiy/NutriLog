# NutriLog — Recreation Prompt

> Paste this entire file as a prompt into a fresh Claude session and Claude will recreate the full WeChat Mini Program project on your laptop. The prompt is self-contained: every file's full content is included below.

---

## Instructions for the AI

You are going to recreate a WeChat Mini Program project called **NutriLog** — a lean nutrition/calorie tracker with voice and photo input that pipes through an LLM to produce structured nutrition data.

**Your task:**

1. Ask the user **once, up front**, where to create the project (e.g. `~/projects/nutrition-mini-program`). Do not create the folder yet — just confirm the path.
2. Once confirmed, create the **exact file hierarchy** shown in the "File tree" section below.
3. For each file listed in the "File contents" section, write the file with the **exact content shown** — do not paraphrase, summarize, or "improve" the code. The content has been tested and works. Empty lines and comments matter.
4. After all files are created, print the "Post-creation setup" checklist so the user knows what to do next.
5. Do **not** install npm dependencies or run any build commands — the WeChat Developer Tools handles that.

**Important constraints:**

- File paths are relative to the project root the user picks.
- Use UTF-8 encoding for all files.
- Preserve indentation exactly (2 spaces in JS/JSON, 2 spaces in WXML/WXSS).
- The folder name itself doesn't matter (the user picks it). Nothing inside the code references the folder name.

**If you are a less-capable model:** work file by file, in the order listed below. Do not skip files. Do not combine files. After each file, briefly state "Created `<path>`" so the user can follow progress.

---

## What this project is

NutriLog is a WeChat Mini Program that lets a user log meals with one tap. The home page has two big buttons:

- **Snap a meal** — take a photo, vision LLM identifies foods and estimates nutrition.
- **Hold to speak** — push-to-talk voice input via WeChat's free on-device speech-recognition plugin (WechatSI), then a text LLM parses the transcript into structured nutrition.

The LLM call runs in a CloudBase cloud function (server-side) so the API key stays off the client. After parsing, the user lands on a confirm screen where they can edit the items, then the entry saves to local storage. A history page shows the last 30 days.

**Tech choices:**

- Frontend: native WeChat Mini Program (WXML/WXSS/JS, no React/Vue).
- Backend: Tencent CloudBase serverless functions (no server to run).
- LLM (text/voice): DeepSeek (`deepseek-chat`) — cheap and Chinese-friendly.
- LLM (vision): Aliyun DashScope (`qwen-vl-max`) — reliable in mainland China.
- Speech-to-text: WechatSI plugin (free, on-device).
- Storage: `wx.setStorageSync` (local only for v1).

---

## File tree

```
<project-root>/
├── prompt.md                              # this file (optional to keep)
├── README.md                              # human setup guide
├── project.config.json                    # WeChat DevTools project config
├── miniprogram/
│   ├── app.js                             # mini program entry, cloud init
│   ├── app.json                           # pages, plugins, permissions
│   ├── app.wxss                           # global styles
│   ├── sitemap.json                       # search index hints
│   ├── utils/
│   │   └── storage.js                     # local-storage CRUD + daily totals
│   └── pages/
│       ├── index/                         # home page (today summary + 2 big buttons)
│       │   ├── index.js
│       │   ├── index.json
│       │   ├── index.wxml
│       │   └── index.wxss
│       ├── confirm/                       # review/edit LLM-parsed items
│       │   ├── confirm.js
│       │   ├── confirm.json
│       │   ├── confirm.wxml
│       │   └── confirm.wxss
│       └── history/                       # last 30 days summary
│           ├── history.js
│           ├── history.json
│           ├── history.wxml
│           └── history.wxss
└── cloudfunctions/
    └── parseFood/                         # LLM call (text + vision)
        ├── index.js
        └── package.json
```

**Total: 21 source files, ~1,140 lines.**

---

## File contents

Each file below is delimited by `<file path="...">` and `</file>` tags. Write each file's content **verbatim** — including comments, blank lines, and trailing newlines.

---

<file path="project.config.json">
{
  "description": "NutriLog - voice + photo nutrition tracker",
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true,
    "newFeature": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    }
  },
  "compileType": "miniprogram",
  "libVersion": "3.0.0",
  "appid": "REPLACE_WITH_YOUR_APPID",
  "projectname": "NutriLog",
  "cloud": true
}
</file>

---

<file path="miniprogram/app.json">
{
  "pages": [
    "pages/index/index",
    "pages/confirm/confirm",
    "pages/history/history"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTitleText": "NutriLog",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#f7f7f5"
  },
  "permission": {
    "scope.record": {
      "desc": "Used to record what you ate via voice"
    },
    "scope.camera": {
      "desc": "Used to photograph your meals"
    }
  },
  "plugins": {
    "WechatSI": {
      "version": "0.3.5",
      "provider": "wx069ba97219f66d99"
    }
  },
  "sitemapLocation": "sitemap.json",
  "style": "v2"
}
</file>

---

<file path="miniprogram/app.js">
// app.js
App({
  onLaunch() {
    // Initialize cloud env. Replace 'your-cloud-env-id' with your CloudBase env ID
    // (find it at https://cloud.weixin.qq.com once you enable cloud development).
    if (!wx.cloud) {
      console.error('Please use a base library version >= 2.2.3')
    } else {
      wx.cloud.init({
        env: 'your-cloud-env-id',
        traceUser: true
      })
    }
  },
  globalData: {
    // App-wide state if needed
  }
})
</file>

---

<file path="miniprogram/app.wxss">
/* Global styles */
page {
  background: #f7f7f5;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 30rpx;
}

.container {
  padding: 32rpx;
  box-sizing: border-box;
  min-height: 100vh;
}

.btn-primary {
  background: #2f9e6e;
  color: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
}

.btn-secondary {
  background: #fff;
  color: #1a1a1a;
  border: 2rpx solid #e5e5e0;
  border-radius: 16rpx;
  padding: 28rpx;
  text-align: center;
  font-size: 32rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
}

.muted {
  color: #888;
  font-size: 26rpx;
}
</file>

---

<file path="miniprogram/sitemap.json">
{
  "rules": [{
    "action": "allow",
    "page": "*"
  }]
}
</file>

---

<file path="miniprogram/utils/storage.js">
// utils/storage.js
// Lightweight local-storage layer for nutrition entries.
// Keyed by date (YYYY-MM-DD) so daily aggregation is O(1).

const KEY = 'nutrilog.entries.v1'

function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function loadAll() {
  return wx.getStorageSync(KEY) || {}
}

function saveAll(all) {
  wx.setStorageSync(KEY, all)
}

function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// Sum nutrition across an array of items.
function totals(items = []) {
  return items.reduce((acc, it) => ({
    calories: acc.calories + (Number(it.calories) || 0),
    protein:  acc.protein  + (Number(it.protein_g) || 0),
    carbs:    acc.carbs    + (Number(it.carbs_g) || 0),
    fat:      acc.fat      + (Number(it.fat_g) || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
}

function addEntry(entry) {
  const all = loadAll()
  const date = entry.date || todayKey()
  const list = all[date] || []
  const record = {
    id: uuid(),
    timestamp: Date.now(),
    date,
    inputType: entry.inputType || 'text',
    rawInput: entry.rawInput || '',
    items: entry.items || [],
    notes: entry.notes || ''
  }
  list.unshift(record)
  all[date] = list
  saveAll(all)
  return record
}

function getDay(date = todayKey()) {
  const all = loadAll()
  const list = all[date] || []
  // Aggregate totals across all entries of the day.
  const flat = list.flatMap(e => e.items || [])
  return { date, entries: list, totals: totals(flat) }
}

function deleteEntry(date, id) {
  const all = loadAll()
  const list = (all[date] || []).filter(e => e.id !== id)
  if (list.length) all[date] = list
  else delete all[date]
  saveAll(all)
}

function getRecentDays(n = 14) {
  const all = loadAll()
  const days = Object.keys(all).sort((a, b) => b.localeCompare(a)).slice(0, n)
  return days.map(d => {
    const flat = (all[d] || []).flatMap(e => e.items || [])
    return { date: d, totals: totals(flat), entryCount: (all[d] || []).length }
  })
}

module.exports = {
  todayKey,
  totals,
  addEntry,
  getDay,
  deleteEntry,
  getRecentDays
}
</file>

---

<file path="miniprogram/pages/index/index.json">
{
  "navigationBarTitleText": "Today",
  "usingComponents": {}
}
</file>

---

<file path="miniprogram/pages/index/index.wxml">
<view class="container">

  <!-- Today summary -->
  <view class="summary card">
    <view class="summary-top">
      <text class="summary-label">Today</text>
      <text class="summary-date">{{day.date}}</text>
    </view>
    <view class="kcal">
      <text class="kcal-num">{{day.totals.calories}}</text>
      <text class="kcal-unit">kcal</text>
    </view>
    <view class="macros">
      <view class="macro"><text class="macro-num">{{day.totals.protein}}g</text><text class="macro-lbl">protein</text></view>
      <view class="macro"><text class="macro-num">{{day.totals.carbs}}g</text><text class="macro-lbl">carbs</text></view>
      <view class="macro"><text class="macro-num">{{day.totals.fat}}g</text><text class="macro-lbl">fat</text></view>
    </view>
  </view>

  <!-- Two big actions -->
  <view class="actions">
    <view class="action-btn snap" bindtap="onSnap">
      <view class="icon">📷</view>
      <text class="action-title">Snap a meal</text>
      <text class="action-sub">Photo → AI estimates portions</text>
    </view>

    <view class="action-btn voice {{recording ? 'recording' : ''}}"
          bindtouchstart="onVoiceStart"
          bindtouchend="onVoiceEnd"
          bindtouchcancel="onVoiceEnd">
      <view class="icon">🎙</view>
      <text class="action-title">{{recording ? 'Listening…' : 'Hold to speak'}}</text>
      <text class="action-sub">"two pork buns and millet porridge"</text>
    </view>
  </view>

  <!-- Text fallback -->
  <view class="text-fallback" bindtap="onTextInput">
    <text class="muted">+ Type it instead</text>
  </view>

  <!-- Recent entries -->
  <view wx:if="{{day.entries.length}}" class="recent">
    <view class="section-title">
      <text>Today's log</text>
      <text class="muted" bindtap="onHistory">All days ›</text>
    </view>
    <view wx:for="{{day.entries}}" wx:key="id" class="entry card">
      <view class="entry-head">
        <text class="entry-time">{{item.timeText}}</text>
        <text class="entry-kcal">{{item.subtotal.calories}} kcal</text>
      </view>
      <view wx:for="{{item.items}}" wx:for-item="food" wx:key="name" class="food-row">
        <text class="food-name">{{food.name}}</text>
        <text class="food-portion muted">{{food.portion}}</text>
        <text class="food-kcal">{{food.calories}}</text>
      </view>
      <view class="entry-foot">
        <text class="muted del" data-id="{{item.id}}" bindtap="onDelete">delete</text>
      </view>
    </view>
  </view>

  <view wx:else class="empty">
    <text class="muted">No entries yet today. Tap a button above.</text>
  </view>

</view>
</file>

---

<file path="miniprogram/pages/index/index.wxss">
.summary {
  background: linear-gradient(135deg, #2f9e6e 0%, #25855a 100%);
  color: #fff;
  padding: 40rpx 32rpx;
}
.summary-top {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  opacity: 0.85;
}
.summary-date { font-variant-numeric: tabular-nums; }
.kcal {
  display: flex;
  align-items: baseline;
  margin: 16rpx 0 24rpx;
}
.kcal-num {
  font-size: 88rpx;
  font-weight: 600;
  letter-spacing: -2rpx;
}
.kcal-unit {
  font-size: 32rpx;
  margin-left: 12rpx;
  opacity: 0.85;
}
.macros {
  display: flex;
  justify-content: space-between;
  border-top: 2rpx solid rgba(255,255,255,0.2);
  padding-top: 20rpx;
}
.macro {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}
.macro-num { font-size: 32rpx; font-weight: 500; }
.macro-lbl { font-size: 24rpx; opacity: 0.85; margin-top: 4rpx; }

.actions {
  display: flex;
  gap: 20rpx;
  margin-bottom: 24rpx;
}
.action-btn {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 36rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  transition: transform 0.1s;
}
.action-btn:active { transform: scale(0.97); }
.action-btn .icon { font-size: 64rpx; margin-bottom: 12rpx; }
.action-title { font-size: 30rpx; font-weight: 500; margin-bottom: 4rpx; }
.action-sub { font-size: 22rpx; color: #888; line-height: 1.4; }
.voice.recording {
  background: #fef3c7;
}
.voice.recording .icon { animation: pulse 1s infinite; }
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.text-fallback {
  text-align: center;
  padding: 16rpx;
  margin-bottom: 32rpx;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 12rpx 4rpx 16rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.entry {
  padding: 24rpx 28rpx;
}
.entry-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
  font-size: 26rpx;
}
.entry-time { color: #888; }
.entry-kcal { color: #2f9e6e; font-weight: 500; }
.food-row {
  display: flex;
  align-items: center;
  padding: 8rpx 0;
  font-size: 28rpx;
}
.food-name { flex: 1; }
.food-portion { margin: 0 16rpx; font-size: 24rpx; }
.food-kcal {
  font-variant-numeric: tabular-nums;
  font-size: 26rpx;
  color: #555;
  min-width: 80rpx;
  text-align: right;
}
.entry-foot {
  margin-top: 8rpx;
  text-align: right;
}
.del { font-size: 22rpx; }

.empty {
  padding: 64rpx 16rpx;
  text-align: center;
}
</file>

---

<file path="miniprogram/pages/index/index.js">
// pages/index/index.js
const storage = require('../../utils/storage.js')

// Speech-recognition plugin (WechatSI / 同声传译).
// Add the plugin in mp.weixin.qq.com → Settings → Third-party services → Plugins,
// then it's already declared in app.json.
let speechManager = null
try {
  const plugin = requirePlugin('WechatSI')
  speechManager = plugin.getRecordRecognitionManager()
} catch (e) {
  console.warn('WechatSI plugin not loaded yet — voice will be unavailable until added.')
}

Page({
  data: {
    day: { date: '', totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, entries: [] },
    recording: false
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const day = storage.getDay()
    // Decorate entries with display fields.
    day.entries = day.entries.map(e => ({
      ...e,
      timeText: new Date(e.timestamp).toTimeString().slice(0, 5),
      subtotal: storage.totals(e.items)
    }))
    // Round totals for display.
    Object.keys(day.totals).forEach(k => {
      day.totals[k] = Math.round(day.totals[k])
    })
    this.setData({ day })
  },

  // ───── Photo flow ────────────────────────────────────────────────
  onSnap() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      camera: 'back',
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.parseAndConfirm({ inputType: 'photo', tempImagePath: tempPath })
      }
    })
  },

  // ───── Voice flow (push-to-talk) ─────────────────────────────────
  onVoiceStart() {
    if (!speechManager) {
      wx.showToast({ title: 'Voice plugin not installed', icon: 'none' })
      return
    }
    this.setData({ recording: true })
    speechManager.onStop = (res) => {
      this.setData({ recording: false })
      const text = (res && res.result) ? res.result.trim() : ''
      if (!text) {
        wx.showToast({ title: 'Didn’t catch that', icon: 'none' })
        return
      }
      this.parseAndConfirm({ inputType: 'audio', transcript: text })
    }
    speechManager.onError = (err) => {
      this.setData({ recording: false })
      wx.showToast({ title: 'Recognition failed', icon: 'none' })
      console.error(err)
    }
    speechManager.start({ duration: 30000, lang: 'zh_CN' })
  },

  onVoiceEnd() {
    if (this.data.recording && speechManager) speechManager.stop()
  },

  // ───── Text-input fallback ───────────────────────────────────────
  onTextInput() {
    wx.showModal({
      title: 'What did you eat?',
      editable: true,
      placeholderText: 'e.g. one bowl of beef noodles',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          this.parseAndConfirm({ inputType: 'text', transcript: res.content.trim() })
        }
      }
    })
  },

  // ───── Send to LLM via cloud function, then go to confirm screen ──
  parseAndConfirm(payload) {
    wx.showLoading({ title: 'Estimating…', mask: true })

    const finish = (parsed) => {
      wx.hideLoading()
      if (!parsed || !parsed.items || !parsed.items.length) {
        wx.showToast({ title: 'No food detected', icon: 'none' })
        return
      }
      // Stash on global app data so confirm page can pick it up
      // (avoids huge URL params).
      getApp().globalData.pendingEntry = {
        ...payload,
        parsed
      }
      wx.navigateTo({ url: '/pages/confirm/confirm' })
    }

    const fail = (err) => {
      wx.hideLoading()
      console.error(err)
      wx.showModal({
        title: 'Could not parse',
        content: (err && err.errMsg) || 'Try again or use text input.',
        showCancel: false
      })
    }

    if (payload.inputType === 'photo') {
      // Upload photo to cloud storage, then call function with file ID.
      wx.cloud.uploadFile({
        cloudPath: `meals/${Date.now()}.jpg`,
        filePath: payload.tempImagePath,
        success: (uploadRes) => {
          wx.cloud.callFunction({
            name: 'parseFood',
            data: { mode: 'photo', fileID: uploadRes.fileID },
            success: (r) => finish(r.result),
            fail
          })
        },
        fail
      })
    } else {
      wx.cloud.callFunction({
        name: 'parseFood',
        data: { mode: 'text', transcript: payload.transcript },
        success: (r) => finish(r.result),
        fail
      })
    }
  },

  // ───── Misc ──────────────────────────────────────────────────────
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: 'Delete this entry?',
      success: (res) => {
        if (res.confirm) {
          storage.deleteEntry(this.data.day.date, id)
          this.refresh()
        }
      }
    })
  },

  onHistory() {
    wx.navigateTo({ url: '/pages/history/history' })
  }
})
</file>

---

<file path="miniprogram/pages/confirm/confirm.json">
{
  "navigationBarTitleText": "Confirm",
  "usingComponents": {}
}
</file>

---

<file path="miniprogram/pages/confirm/confirm.wxml">
<view class="container">

  <view wx:if="{{rawText}}" class="card raw">
    <text class="muted small">You said</text>
    <text class="raw-text">{{rawText}}</text>
  </view>

  <view class="card">
    <view class="card-header">
      <text>Detected items</text>
      <text class="total muted">{{total.calories}} kcal</text>
    </view>

    <view wx:for="{{items}}" wx:key="index" class="item">
      <input class="item-name"
             value="{{item.name}}"
             data-i="{{index}}"
             data-k="name"
             bindinput="onEdit" />
      <view class="item-row">
        <input class="item-portion"
               value="{{item.portion}}"
               data-i="{{index}}"
               data-k="portion"
               bindinput="onEdit"
               placeholder="portion" />
        <input class="item-num"
               type="digit"
               value="{{item.calories}}"
               data-i="{{index}}"
               data-k="calories"
               bindinput="onEditNum" />
        <text class="item-unit">kcal</text>
        <text class="del" data-i="{{index}}" bindtap="onRemove">×</text>
      </view>
      <view class="item-row macro-edit">
        <text class="macro-lbl">P</text>
        <input class="item-num small" type="digit" value="{{item.protein_g}}"
               data-i="{{index}}" data-k="protein_g" bindinput="onEditNum" />
        <text class="macro-lbl">C</text>
        <input class="item-num small" type="digit" value="{{item.carbs_g}}"
               data-i="{{index}}" data-k="carbs_g" bindinput="onEditNum" />
        <text class="macro-lbl">F</text>
        <input class="item-num small" type="digit" value="{{item.fat_g}}"
               data-i="{{index}}" data-k="fat_g" bindinput="onEditNum" />
        <text class="macro-lbl">g</text>
      </view>
    </view>

    <view class="add-row" bindtap="onAddItem">+ add item</view>
  </view>

  <view wx:if="{{notes}}" class="card notes">
    <text class="muted small">Notes</text>
    <text>{{notes}}</text>
  </view>

  <view class="footer">
    <view class="btn-secondary" bindtap="onCancel">Cancel</view>
    <view class="btn-primary" bindtap="onSave">Save to log</view>
  </view>

</view>
</file>

---

<file path="miniprogram/pages/confirm/confirm.wxss">
.raw .raw-text { display: block; margin-top: 8rpx; font-size: 28rpx; }
.small { font-size: 24rpx; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16rpx;
  font-size: 28rpx;
  font-weight: 500;
}
.card-header .total { font-weight: 400; }

.item {
  border-top: 2rpx solid #f0f0eb;
  padding: 20rpx 0;
}
.item:first-of-type { border-top: none; padding-top: 0; }
.item-name {
  font-size: 30rpx;
  font-weight: 500;
  padding: 6rpx 0;
}
.item-row {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
  font-size: 26rpx;
}
.item-portion {
  flex: 1;
  color: #555;
  font-size: 26rpx;
  padding: 4rpx 0;
}
.item-num {
  width: 100rpx;
  text-align: right;
  font-variant-numeric: tabular-nums;
  padding: 4rpx 8rpx;
  background: #f5f5f0;
  border-radius: 8rpx;
}
.item-num.small { width: 70rpx; }
.item-unit { color: #888; margin-left: 6rpx; font-size: 24rpx; }
.del {
  margin-left: 16rpx;
  width: 48rpx;
  height: 48rpx;
  text-align: center;
  line-height: 48rpx;
  font-size: 36rpx;
  color: #c00;
}
.macro-edit {
  gap: 6rpx;
  flex-wrap: wrap;
}
.macro-lbl {
  color: #888;
  font-size: 24rpx;
  margin: 0 6rpx;
}

.add-row {
  margin-top: 16rpx;
  text-align: center;
  color: #2f9e6e;
  font-size: 26rpx;
  padding: 16rpx;
  border: 2rpx dashed #d0d0c8;
  border-radius: 12rpx;
}

.notes text:last-child { display: block; margin-top: 8rpx; font-size: 26rpx; }

.footer {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
  position: sticky;
  bottom: 0;
}
.footer .btn-secondary, .footer .btn-primary {
  flex: 1;
}
</file>

---

<file path="miniprogram/pages/confirm/confirm.js">
// pages/confirm/confirm.js
const storage = require('../../utils/storage.js')

Page({
  data: {
    items: [],
    notes: '',
    rawText: '',
    inputType: 'text',
    rawInput: '',
    total: { calories: 0, protein: 0, carbs: 0, fat: 0 }
  },

  onLoad() {
    const pending = getApp().globalData.pendingEntry
    if (!pending) {
      wx.showToast({ title: 'Nothing to confirm', icon: 'none' })
      wx.navigateBack()
      return
    }
    const items = (pending.parsed.items || []).map(it => ({
      name: it.name || '',
      portion: it.portion || '',
      calories: Number(it.calories) || 0,
      protein_g: Number(it.protein_g) || 0,
      carbs_g: Number(it.carbs_g) || 0,
      fat_g: Number(it.fat_g) || 0
    }))
    this.setData({
      items,
      notes: pending.parsed.notes || '',
      rawText: pending.transcript || '',
      inputType: pending.inputType || 'text',
      rawInput: pending.transcript || pending.tempImagePath || ''
    })
    this.recalc()
  },

  recalc() {
    const total = storage.totals(this.data.items)
    Object.keys(total).forEach(k => total[k] = Math.round(total[k]))
    this.setData({ total })
  },

  onEdit(e) {
    const { i, k } = e.currentTarget.dataset
    const items = this.data.items
    items[i][k] = e.detail.value
    this.setData({ items })
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
    storage.addEntry({
      inputType: this.data.inputType,
      rawInput: this.data.rawInput,
      items: this.data.items,
      notes: this.data.notes
    })
    getApp().globalData.pendingEntry = null
    wx.showToast({ title: 'Saved', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  }
})
</file>

---

<file path="miniprogram/pages/history/history.json">
{
  "navigationBarTitleText": "History",
  "usingComponents": {}
}
</file>

---

<file path="miniprogram/pages/history/history.wxml">
<view class="container">
  <view wx:if="{{days.length}}">
    <view wx:for="{{days}}" wx:key="date" class="day card">
      <view class="day-head">
        <text class="day-date">{{item.date}}</text>
        <text class="day-kcal">{{item.totals.calories}} kcal</text>
      </view>
      <view class="day-macros muted">
        P {{item.totals.protein}}g · C {{item.totals.carbs}}g · F {{item.totals.fat}}g · {{item.entryCount}} entries
      </view>
    </view>
  </view>
  <view wx:else class="empty muted">
    <text>No history yet.</text>
  </view>
</view>
</file>

---

<file path="miniprogram/pages/history/history.wxss">
.day {
  padding: 24rpx 28rpx;
}
.day-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8rpx;
}
.day-date { font-size: 30rpx; font-weight: 500; }
.day-kcal { color: #2f9e6e; font-weight: 500; }
.day-macros { font-size: 24rpx; }
.empty { padding: 80rpx 0; text-align: center; }
</file>

---

<file path="miniprogram/pages/history/history.js">
// pages/history/history.js
const storage = require('../../utils/storage.js')

Page({
  data: { days: [] },

  onShow() {
    const days = storage.getRecentDays(30).map(d => ({
      ...d,
      totals: {
        calories: Math.round(d.totals.calories),
        protein:  Math.round(d.totals.protein),
        carbs:    Math.round(d.totals.carbs),
        fat:      Math.round(d.totals.fat)
      }
    }))
    this.setData({ days })
  }
})
</file>

---

<file path="cloudfunctions/parseFood/package.json">
{
  "name": "parseFood",
  "version": "1.0.0",
  "description": "Parse text or photo of a meal into structured nutrition JSON via DeepSeek.",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~3.0.0"
  }
}
</file>

---

<file path="cloudfunctions/parseFood/index.js">
// cloudfunctions/parseFood/index.js
//
// Receives either a transcript ("text" mode) or a photo file ID ("photo" mode),
// asks an LLM to identify food items + estimate nutrition, returns clean JSON.
//
// Default text provider: DeepSeek (cheap, fast, supports Chinese well).
// Default vision provider: Aliyun DashScope (Qwen-VL) — reliably available in China.
// Both speak the OpenAI-compatible chat-completions API, so swapping providers is easy.
//
// Configure these as cloud-function env vars in the WeChat Cloud Console
// (DevTools → Cloud Console → Functions → parseFood → Config):
//   DEEPSEEK_API_KEY  = sk-xxxxx           (required for text/voice mode)
//   DASHSCOPE_API_KEY = sk-xxxxx           (required for photo mode; optional)

const cloud = require('wx-server-sdk')
const https = require('https')
const { URL } = require('url')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const TEXT_PROVIDER = {
  endpoint: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat',
  key: process.env.DEEPSEEK_API_KEY || ''
}

const VISION_PROVIDER = {
  endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  model: 'qwen-vl-max',
  key: process.env.DASHSCOPE_API_KEY || ''
}

const SYSTEM_PROMPT = `You are a nutrition logging assistant. The user describes or photographs a meal.
Identify each distinct food item and estimate nutrition with realistic Chinese-cuisine portions when relevant.

Respond with ONLY valid minified JSON in exactly this shape:
{"items":[{"name":"","portion":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}],"notes":""}

Rules:
- name: short, in the user's language (Chinese if they spoke Chinese).
- portion: human-friendly ("1 bowl", "200g", "2 pieces").
- calories: integer kcal.
- protein_g/carbs_g/fat_g: numbers, grams, one decimal allowed.
- notes: one short sentence flagging assumptions ("assumed medium oil", "estimated portion") — empty string if none.
- If the input is too vague to identify any food, return {"items":[],"notes":"could not identify food"}.
- Never include any text outside the JSON.`

exports.main = async (event) => {
  try {
    if (event.mode === 'photo' && event.fileID) {
      if (!VISION_PROVIDER.key) {
        return { error: 'DASHSCOPE_API_KEY not set — photo mode disabled. Use voice/text for now.' }
      }
      const dl = await cloud.downloadFile({ fileID: event.fileID })
      const b64 = dl.fileContent.toString('base64')
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: [
          { type: 'text', text: 'Identify the food in this photo and return JSON.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }
        ]}
      ]
      return await callLLM(VISION_PROVIDER, messages)
    }

    if (event.mode === 'text' && event.transcript) {
      if (!TEXT_PROVIDER.key) {
        return { error: 'DEEPSEEK_API_KEY env var not set on cloud function.' }
      }
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `User said: "${event.transcript}"\nReturn JSON only.` }
      ]
      return await callLLM(TEXT_PROVIDER, messages)
    }

    return { error: 'invalid input — need {mode:"text",transcript} or {mode:"photo",fileID}' }
  } catch (err) {
    console.error(err)
    return { error: err.message || String(err) }
  }
}

function callLLM(provider, messages) {
  const body = JSON.stringify({
    model: provider.model,
    messages,
    temperature: 0.2,
    response_format: { type: 'json_object' }
  })

  const u = new URL(provider.endpoint)
  const opts = {
    hostname: u.hostname,
    port: u.port || 443,
    path: u.pathname + u.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.key}`,
      'Content-Length': Buffer.byteLength(body)
    },
    timeout: 30000
  }

  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf8')
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`LLM ${res.statusCode}: ${txt.slice(0, 300)}`))
        }
        try {
          const data = JSON.parse(txt)
          const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
          if (!content) return reject(new Error('Empty LLM response'))

          let parsed
          try {
            parsed = JSON.parse(content)
          } catch (e) {
            const cleaned = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
            parsed = JSON.parse(cleaned)
          }

          parsed.items = Array.isArray(parsed.items) ? parsed.items.map(it => ({
            name: String(it.name || ''),
            portion: String(it.portion || ''),
            calories: Number(it.calories) || 0,
            protein_g: Number(it.protein_g) || 0,
            carbs_g:   Number(it.carbs_g)   || 0,
            fat_g:     Number(it.fat_g)     || 0
          })) : []
          parsed.notes = String(parsed.notes || '')

          resolve(parsed)
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('LLM request timed out')))
    req.write(body)
    req.end()
  })
}
</file>

---

<file path="README.md">
# NutriLog — minimal voice + photo nutrition tracker

A lean WeChat Mini Program v1. Two big buttons on the home page (snap or speak), an LLM
parses the input into structured nutrition JSON, you confirm/edit, it logs locally.

## Architecture

Mini Program → CloudBase cloud function → DeepSeek (text) or Qwen-VL (vision) → JSON → confirm screen → wx.storage.

Voice transcription runs on-device via the WechatSI plugin (free, official Tencent), so we don't pay for ASR.

## Setup (first time, ~30 minutes)

1. Register a Mini Program account at https://mp.weixin.qq.com (need Chinese phone + ID, or a business license). Save the AppID.
2. Install WeChat Developer Tools from https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
3. Open this folder in DevTools. Paste your AppID into project.config.json.
4. In DevTools, click "Cloud Development" → create environment. Note the env ID. Paste it into miniprogram/app.js (replace 'your-cloud-env-id').
5. Add the WechatSI plugin: mp.weixin.qq.com → Settings → Third-party services → Plugins → search 同声传译 (provider AppID wx069ba97219f66d99) → apply.
6. Get API keys:
   - DeepSeek (text/voice): https://platform.deepseek.com — ¥10 covers thousands of meals.
   - Aliyun DashScope (vision, optional): https://dashscope.console.aliyun.com — free tier covers v1.
7. Deploy cloud function: right-click cloudfunctions/parseFood → Upload and deploy: cloud install dependencies. Then in Cloud Console add env vars DEEPSEEK_API_KEY and DASHSCOPE_API_KEY.
8. Click Compile in DevTools. Try the text fallback first to verify the LLM round-trip. Voice testing requires a real device (scan the Preview QR).

## Cost

Mini Program registration ¥0–300/yr, CloudBase free tier covers ~50k function calls/month, DeepSeek ~¥0.0001/meal, Qwen-VL ~¥0.008/photo, WechatSI free. Roughly ¥0.15/month per active user.
</file>

---

## Post-creation setup

Once the AI has created all 21 files, the user needs to do the following manual steps **on their machine** (these cannot be automated):

1. **Register a WeChat Mini Program account** at https://mp.weixin.qq.com — requires a mainland-Chinese phone number and ID, or a Chinese business license. Save the AppID.
2. **Install WeChat Developer Tools** from https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
3. **Open the project** in DevTools (File → Open project → point at the project root). Paste the AppID into `project.config.json` (replace `REPLACE_WITH_YOUR_APPID`).
4. **Enable CloudBase**: in DevTools, click the "Cloud Development" button → create environment → note the env ID. Paste it into `miniprogram/app.js` (replace `'your-cloud-env-id'`).
5. **Add the WechatSI plugin** at mp.weixin.qq.com → Settings → Third-party services → Plugins → search 同声传译 (provider AppID `wx069ba97219f66d99`) → apply.
6. **Get API keys**:
   - DeepSeek: https://platform.deepseek.com (required for voice/text)
   - Aliyun DashScope: https://dashscope.console.aliyun.com (optional, only for photo mode)
7. **Deploy the cloud function**: in DevTools, right-click `cloudfunctions/parseFood` → "Upload and deploy: cloud install dependencies". Then open Cloud Console → Functions → `parseFood` → Config → add env vars `DEEPSEEK_API_KEY` and `DASHSCOPE_API_KEY`. Save and redeploy.
8. **Test**: click Compile in DevTools. The simulator boots. Tap "+ Type it instead" to verify the LLM round-trip works without needing voice or photo set up.

---

## Verification checklist

After files are created, the AI should confirm:

- [ ] All 21 files exist at the paths shown in the file tree.
- [ ] `app.json` declares exactly three pages: `index`, `confirm`, `history`.
- [ ] Every page folder has all four files: `.js`, `.json`, `.wxml`, `.wxss`.
- [ ] `cloudfunctions/parseFood/` has `index.js` and `package.json`.
- [ ] `project.config.json` is at the project root, **not** inside `miniprogram/`.
- [ ] No file contains placeholder code or `// TODO` markers.
- [ ] The cloud function name `parseFood` matches what `pages/index/index.js` calls via `wx.cloud.callFunction`.

If all boxes are checked, print: "Project ready. Open the folder in WeChat Developer Tools, then follow the post-creation setup steps in the README."
