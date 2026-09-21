const config = require('./config.js')

App({
  onLaunch() {
    if (config.cloudEnv && wx.cloud) wx.cloud.init({ env: config.cloudEnv, traceUser: true })
  },
  globalData: { cloudEnv: config.cloudEnv, weatherEnabled: config.weatherEnabled }
})
