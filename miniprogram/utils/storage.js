// utils/storage.js
// Lightweight local-storage layer for nutrition entries.
// Keyed by date (YYYY-MM-DD) so daily aggregation is O(1).

const KEY = 'nutrilog.entries.v1'
const PROFILE_KEY = 'nutrilog.profile.v1'

function getProfile() {
  return wx.getStorageSync(PROFILE_KEY) || { weight: 0, height: 0, age: 25, gender: 'male', activity: 1.2 }
}

function saveProfile(profile) {
  wx.setStorageSync(PROFILE_KEY, profile)
}

function calculateTarget(p) {
  if (!p.weight || !p.height) return { calories: 2000, protein: 150, carbs: 200, fat: 65 }
  // Mifflin-St Jeor Equation
  let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age)
  bmr = (p.gender === 'male') ? bmr + 5 : bmr - 161
  const calories = Math.round(bmr * (p.activity || 1.2))

  // Estimated Macro Caps (Standard 30% P / 40% C / 30% F)
  return {
    calories,
    protein: Math.round((calories * 0.3) / 4),
    carbs: Math.round((calories * 0.4) / 4),
    fat: Math.round((calories * 0.3) / 9)
  }
}

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
    timestamp: entry.timestamp || Date.now(),
    date,
    inputType: entry.inputType || 'text',
    rawInput: entry.rawInput || '',
    items: entry.items || [],
    notes: entry.notes || ''
  }
  list.unshift(record)
  // Sort list by timestamp descending to keep chronological order
  list.sort((a, b) => b.timestamp - a.timestamp)
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

// Get a continuous range of N days ending today
function getDayRange(n = 7) {
  const all = loadAll()
  const result = []
  const now = new Date()
  
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(now.getDate() - i)
    const key = todayKey(d)
    const list = all[key] || []
    const flat = list.flatMap(e => e.items || [])
    
    result.push({
      date: key,
      displayDate: key.split('-').slice(1).join('/'),
      shortDay: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
      totals: totals(flat),
      entryCount: list.length
    })
  }
  return result.reverse() // Chronological order
}

module.exports = {
  todayKey,
  totals,
  addEntry,
  getDay,
  deleteEntry,
  getRecentDays,
  getDayRange,
  getProfile,
  saveProfile,
  calculateTarget
}
