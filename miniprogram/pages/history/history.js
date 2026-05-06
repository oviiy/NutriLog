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
