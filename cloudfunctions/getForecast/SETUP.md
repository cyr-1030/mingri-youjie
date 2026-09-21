# 明日天气云函数

使用彩云天气 v2.6 [天级别预报](https://docs.caiyunapp.com/weather-api/v2/v2.6/4-daily.html)。请求中的经纬度来自彩云官方提供的 [2024-06-17 城市代码对照表](https://docs.caiyunapp.com/weather-api/20240617-adcode.csv)，并在云函数内按小程序城市代码查找；不接受前端任意坐标。

## 用户需准备

1. 已绑定小程序的微信云开发环境，并确认云函数可以部署和调用。
2. 自己的[彩云天气开放平台](https://platform.caiyunapp.com/)账号、天气 API 服务额度及 v2.6 Token。费用和额度以控制台显示为准。
3. 在云开发控制台的 `getForecast` 云函数环境变量中设置 **`CAIYUN_API_TOKEN`**，值只填写 Token 字符串，不要粘贴完整 API 示例链接。Token 不要发送给协作者，也不要写在前端、`config.js` 或仓库文件中。v2.6 的 Token 位于请求 URL 路径，因此也不得记录完整 URL 到日志；见[官方认证说明](https://docs.caiyunapp.com/weather-api/v2/v2.6/auth.html)。

部署 `cloudfunctions/getForecast` 时选择“云端安装依赖”。建议使用 Node.js 20。云函数环境变量设置见 [CloudBase 文档](https://docs.cloudbase.net/cloud-function/function-configuration/env)。

## 前端调用

```js
const result = await wx.cloud.callFunction({
  name: 'getForecast',
  data: {
    region: { provinceCode: '31', code: '3101' },
    targetDate: '2026-09-21'
  }
})
const response = result.result
```

`region` 必须来自城市选择器的规范对象，不能传自由输入文本。`targetDate` 可省略，默认查当地明天；显式传值时支持当地今天到后天。成功返回 `{ok:true,location,forecast,source,attribution,attributionUrl,attributions,fetchedAt}`；`forecast` 含 `date,temp,tempMin,tempMax,description,rain,rainProbability,humidity,windScale,climate`。`temp` 是白天最高温度，`tempMin`/`tempMax` 是全天低温/高温。

失败返回 `{ok:false,code,error}`，**没有 `forecast` 字段**；前端不能沿用旧预报冒充新数据。常见错误码：`NOT_CONFIGURED`、`INVALID_REGION`、`INVALID_DATE`、`UNSUPPORTED_CITY`、`UNSUPPORTED_REGION`、`FORECAST_NOT_FOUND`、`UPSTREAM_AUTH`、`UPSTREAM_RATE_LIMIT`、`UPSTREAM_UNAVAILABLE`。海外入口和未映射城市在前端提示暂无自动预报，方案不猜测气温与降雨。

## 覆盖范围与来源

当前城市选择器共 394 项，其中 1 项为“海外”。其余 393 个具体城市中，彩云官方坐标表可映射 **389 个**，包括北京、上海、广州、深圳、香港、澳门与台湾的 19 个城市。新疆白杨市，以及台湾新北市、金门县、连江县未在该表中找到可核验坐标，返回 `UNSUPPORTED_CITY`。官方表提供的是**城市代表点**，不能视作用户精确位置；逐日预报空间分辨率约为 9–13 km。彩云官方说明[常规预报覆盖全球，港澳台亦在覆盖范围内](https://docs.caiyunapp.com/weather-api/v2/v2.6/tables/coverage.html)，但本 MVP 的城市选择器尚未细分海外。

`region-catalog.json` 是 `data/regions.js` 的云函数白名单副本；`coordinates.json` 是上面官方对照表中与该白名单对应的坐标子集。若城市选择器数据更新，须重新核验并同步这两个文件，再部署云函数。

**显示天气数据的页面必须显著展示“数据来自彩云天气”。** 如可行，将其链接到 `attributionUrl`（彩云官网）。这是[彩云开放平台用户协议](https://platform.caiyunapp.com/user/user_agreement/)的来源标注要求。
