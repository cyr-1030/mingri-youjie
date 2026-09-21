const cloud = require('wx-server-sdk')
const { getForecast } = require('./weather')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async event => {
  if (!cloud.getWXContext().OPENID) {
    return { ok: false, code: 'AUTH_REQUIRED', error: '请在微信小程序内使用天气服务。' }
  }
  return getForecast(event || {})
}
