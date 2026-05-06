// app.js
App({
  onLaunch() {
    // Initialize cloud env. Replace 'your-cloud-env-id' with your CloudBase env ID
    // (find it at https://cloud.weixin.qq.com once you enable cloud development).
    if (!wx.cloud) {
      console.error('Please use a base library version >= 2.2.3')
    } else {
      wx.cloud.init({
        env: 'cloud1-d1g7vti4f91ba1ced',
        traceUser: true,
        timeout: 60000 // 60 seconds
      })
    }
  },
  globalData: {
    // App-wide state if needed
  }
})
