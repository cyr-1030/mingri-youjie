// 浏览器版复用小程序业务逻辑，并补齐网页所需的天气、图片与剪贴板能力。
const root = document.getElementById('app')
const previewBase = new URL('.', document.currentScript.src)
const cache = new Map()
let sourceTree, page, appData = { globalData: { cloudEnv: 'web', weatherEnabled: true } }, quietRender = false

const WEATHER_LABELS = {
  0: '晴', 1: '大致晴朗', 2: '多云', 3: '阴', 45: '雾', 48: '雾凇',
  51: '小雨', 53: '小雨', 55: '较强细雨', 56: '冻雨', 57: '冻雨',
  61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '冻雨',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '米雪',
  80: '阵雨', 81: '阵雨', 82: '强阵雨', 85: '阵雪', 86: '强阵雪',
  95: '雷雨', 96: '雷雨伴冰雹', 99: '强雷雨伴冰雹'
}
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99])
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86])

async function browserForecast(data) {
  const region = data && data.region
  if (!region || region.isOverseas) return { ok: false, code: 'UNSUPPORTED_REGION', error: '海外城市暂未细分。' }
  const coordinates = await fetch(new URL('../cloudfunctions/getForecast/coordinates.json', previewBase)).then(response => response.json())
  const point = coordinates[region.code]
  if (!point) return { ok: false, code: 'UNSUPPORTED_CITY', error: '该城市暂无可核验的预报位置。' }
  const params = new URLSearchParams({
    latitude: point[1], longitude: point[0], timezone: 'auto', forecast_days: '3',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_mean,wind_speed_10m_max'
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!response.ok) throw new Error('天气预报暂不可用，请稍后重试。')
  const payload = await response.json()
  const daily = payload.daily || {}
  const index = (daily.time || []).indexOf(data.targetDate)
  if (index < 0) throw new Error('天气服务未返回所选日期的预报。')
  const code = Number(daily.weather_code[index])
  const low = Number(daily.temperature_2m_min[index])
  const high = Number(daily.temperature_2m_max[index])
  const probability = Number(daily.precipitation_probability_max[index])
  const humidityPercent = Number(daily.relative_humidity_2m_mean[index])
  const windSpeedKmh = Number(daily.wind_speed_10m_max[index])
  const precipitationType = SNOW_CODES.has(code) ? 'snow' : RAIN_CODES.has(code) ? 'rain' : 'none'
  const rain = precipitationType !== 'none' || probability >= 60 ? 'rain' : 'none'
  const climate = windSpeedKmh >= 29 ? 'windy' : humidityPercent >= 75 ? 'humid' : humidityPercent <= 35 ? 'dry' : 'normal'
  return {
    ok: true, source: 'Open-Meteo', attribution: '天气数据：Open-Meteo', attributionUrl: 'https://open-meteo.com/',
    forecast: {
      date: data.targetDate, temp: Math.round(high), tempMin: Math.round(low), tempMax: Math.round(high),
      description: WEATHER_LABELS[code] || '天气现象待确认', conditionCode: String(code), rain,
      precipitationType, rainProbability: Number.isFinite(probability) ? probability / 100 : null,
      humidity: Number.isFinite(humidityPercent) ? humidityPercent / 100 : null,
      windSpeedKmh: Number.isFinite(windSpeedKmh) ? windSpeedKmh : null, climate
    }
  }
}

function chooseBrowserImage({ success, fail }) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files && input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => success({ tempFiles: [{ tempFilePath: reader.result, size: file.size }] })
    reader.onerror = () => fail && fail({ errMsg: '读取图片失败' })
    reader.readAsDataURL(file)
  }
  input.click()
}

function copyText(value, success, fail) {
  const fallback = () => {
    const area = document.createElement('textarea')
    area.value = value
    area.style.position = 'fixed'; area.style.opacity = '0'
    document.body.appendChild(area); area.select()
    try { document.execCommand('copy'); success && success() } catch (error) { fail && fail(error) }
    area.remove()
  }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(success).catch(fallback)
  else fallback()
}

function toast(title) {
  const old = document.querySelector('.toast')
  if (old) old.remove()
  const node = document.createElement('div')
  node.className = 'toast'
  node.textContent = title
  document.querySelector('.phone').appendChild(node)
  setTimeout(() => node.remove(), 2400)
}

window.wx = {
  getStorageSync: key => { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch (_) { return null } },
  setStorageSync: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  showToast: ({ title }) => toast(title),
  showModal: ({ title, content, success }) => success({ confirm: window.confirm(`${title}\n${content}`) }),
  showLoading: ({ title }) => toast(title), hideLoading: () => {},
  pageScrollTo: () => {
    root.scrollTop = 0
    window.scrollTo({ top: 0, behavior: 'auto' })
  },
  chooseMedia: chooseBrowserImage,
  chooseImage: chooseBrowserImage,
  saveFile: ({ tempFilePath, success }) => success({ savedFilePath: tempFilePath }),
  removeSavedFile: ({ success }) => success && success(),
  setClipboardData: ({ data, success, fail }) => copyText(data, success, fail),
  cloud: { callFunction: ({ name, data }) => name === 'getForecast'
    ? browserForecast(data).then(result => ({ result }))
    : Promise.reject(new Error('网页版不支持该云函数')) }
}
window.getApp = () => appData
window.Page = definition => {
  page = Object.assign({}, definition)
  page.data = Object.assign({}, definition.data)
  page.setData = function (patch) {
    Object.assign(this.data, patch)
    if (!quietRender) render()
  }
}

async function loadModule(path) {
  const url = new URL(path, location.href).href
  if (cache.has(url)) return cache.get(url)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`无法加载 ${path} (${response.status})`)
  if (url.endsWith('.json')) {
    const data = await response.json()
    cache.set(url, data)
    return data
  }
  const source = await response.text()
  const imports = [...source.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(match => match[1])
  for (const entry of imports) await loadModule(new URL(entry, url).href)
  const module = { exports: {} }
  const require = entry => {
    const target = new URL(entry, url).href
    if (!cache.has(target)) throw new Error(`模块依赖尚未载入：${entry}`)
    return cache.get(target)
  }
  new Function('require', 'module', 'exports', `${source}\n//# sourceURL=${url}`)(require, module, module.exports)
  cache.set(url, module.exports)
  return module.exports
}

function evaluate(expression, context) {
  try { return Function('ctx', `with(ctx){return (${expression})}`)(context) }
  catch (error) { console.warn('WXML 表达式未解析：', expression, error); return undefined }
}
function binding(value, context) {
  const expression = /^{{([\s\S]*)}}$/.exec((value || '').trim())
  return evaluate(expression ? expression[1] : value, context)
}
function interpolate(value, context) {
  return String(value).replace(/{{([\s\S]*?)}}/g, (_, expression) => {
    const result = evaluate(expression, context)
    return result == null ? '' : String(result)
  })
}
function pixels(css) {
  return css.replace(/(-?\d+(?:\.\d+)?)rpx/g, (_, number) => `${Number(number) / 2}px`)
}

function multiSelector(node, context) {
  const wrapper = document.createElement('div')
  wrapper.className = 'preview-region-picker'
  const label = document.createElement('button')
  label.type = 'button'
  label.className = 'picker-field region-picker'
  label.textContent = interpolate(node.textContent, context).trim().replace(/\s+/g, ' ')
  const controls = document.createElement('div')
  controls.className = 'preview-region-controls'
  controls.hidden = true
  const province = document.createElement('select')
  const city = document.createElement('select')
  province.setAttribute('aria-label', '省份或地区')
  city.setAttribute('aria-label', '城市')
  const confirm = document.createElement('button')
  confirm.type = 'button'
  confirm.textContent = '确定'
  let columns = binding(node.getAttribute('range') || '', context) || [[], []]
  const initial = binding(node.getAttribute('value') || '', context) || [0, 0]
  function options(select, names, selected) {
    select.replaceChildren()
    names.forEach((name, index) => {
      const option = document.createElement('option')
      option.value = String(index)
      option.textContent = name
      select.appendChild(option)
    })
    select.value = String(selected)
  }
  options(province, columns[0] || [], initial[0] || 0)
  options(city, columns[1] || [], initial[1] || 0)
  label.addEventListener('click', () => { controls.hidden = !controls.hidden })
  province.addEventListener('change', () => {
    if (!page) return
    const method = node.getAttribute('bindcolumnchange')
    if (method && typeof page[method] === 'function') {
      quietRender = true
      try { page[method]({ detail: { column: 0, value: Number(province.value) } }) }
      finally { quietRender = false }
    }
    columns = binding(node.getAttribute('range') || '', page.data) || [[], []]
    options(city, columns[1] || [], 0)
  })
  confirm.addEventListener('click', () => {
    if (!page) return
    const method = node.getAttribute('bindchange')
    if (!method || typeof page[method] !== 'function') return
    try { page[method]({ detail: { value: [Number(province.value), Number(city.value)] } }) }
    catch (error) { console.error(error); toast(`交互错误：${error.message}`) }
  })
  controls.append(province, city, confirm)
  wrapper.append(label, controls)
  return wrapper
}

function appendChildren(target, template, context) {
  let matched = false, inChain = false
  for (const child of template.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && !child.textContent.trim()) continue
    if (child.nodeType === Node.ELEMENT_NODE) {
      const ifValue = child.getAttribute('data-wx-if')
      const elifValue = child.getAttribute('data-wx-elif')
      const otherwise = child.hasAttribute('data-wx-else')
      if (ifValue !== null) { matched = Boolean(binding(ifValue, context)); inChain = true; if (!matched) continue }
      else if (elifValue !== null) {
        if (matched || !Boolean(binding(elifValue, context))) continue
        matched = true; inChain = true
      } else if (otherwise) { if (matched) continue; matched = true; inChain = true }
      else if (inChain) { matched = false; inChain = false }
    }
    const result = build(child, context)
    if (result) target.appendChild(result)
  }
}

function build(node, context, skipLoop = false) {
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(interpolate(node.textContent, context))
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const loop = node.getAttribute('data-wx-for')
  if (loop !== null && !skipLoop) {
    const list = binding(loop, context) || []
    const fragment = document.createDocumentFragment()
    if (Array.isArray(list)) list.forEach((item, index) => fragment.appendChild(build(node, Object.assign({}, context, { item, index }), true)))
    return fragment
  }
  if (node.tagName.toLowerCase() === 'block') {
    const fragment = document.createDocumentFragment()
    appendChildren(fragment, node, context)
    return fragment
  }

  if (node.tagName.toLowerCase() === 'picker' && node.getAttribute('mode') === 'multiSelector') {
    return multiSelector(node, context)
  }

  const isPicker = node.tagName.toLowerCase() === 'picker'
  const pickerMode = node.getAttribute('mode')
  const tag = isPicker ? (pickerMode === 'date' || pickerMode === 'time' ? 'input' : 'select') : ({ view: 'div', text: 'span', image: 'img' }[node.tagName.toLowerCase()] || node.tagName.toLowerCase())
  const element = document.createElement(tag)
  if (tag === 'button') element.type = 'button'
  if (isPicker) {
    const label = node.querySelector('.picker-field, .category-picker')
    element.className = label ? label.className : 'picker-field'
    const selected = node.getAttribute('value')
    const value = selected == null ? '' : interpolate(selected, context)
    if (tag === 'select') {
      const range = binding(node.getAttribute('range') || '', context) || []
      range.forEach((option, index) => {
        const choice = document.createElement('option')
        choice.value = String(index); choice.textContent = option
        element.appendChild(choice)
      })
      element.value = value || '0'
    } else {
      element.type = pickerMode
      element.min = node.getAttribute('start') || ''
      element.max = node.getAttribute('end') || ''
      element.value = value
      element.dataset.pickerMode = pickerMode
    }
  }
  for (const attribute of node.attributes) {
    const name = attribute.name, raw = attribute.value
    if (name.startsWith('data-wx-') || name === 'wx:key' || name.startsWith('bind') || (isPicker && ['range', 'value', 'mode', 'start', 'end'].includes(name))) continue
    const value = interpolate(raw, context)
    if (name === 'disabled') { element.disabled = value === 'true'; continue }
    if (name === 'style') { element.setAttribute(name, pixels(value)); continue }
    if (name === 'src') {
      element.setAttribute(name, value.includes('../../assets/')
        ? new URL(`../assets/${value.split('../../assets/')[1]}`, previewBase).href : value)
      continue
    }
    if (name === 'class') { element.className = value; continue }
    element.setAttribute(name, value)
  }
  if (element.classList.contains('object-image') && context.item) {
    element.alt = context.item.name || `选物图 ${context.item.index + 1}`
  }
  for (const [binding, eventName] of [['bindtap', 'click'], ['bindinput', 'input'], ['bindblur', 'blur'], ['bindchange', 'change']]) {
    const method = node.getAttribute(binding)
    if (!method) continue
    element.addEventListener(eventName, () => {
      if (!page || typeof page[method] !== 'function') return
      quietRender = eventName === 'input'
      try {
        if (method === 'saveBirth') {
          const date = root.querySelector('input[data-picker-mode="date"]')
          const time = root.querySelector('input[data-picker-mode="time"]')
          if (date) page.state.birthDraft.date = date.value
          if (time) page.state.birthDraft.time = time.value
        }
        page[method]({ currentTarget: { dataset: element.dataset }, detail: { value: element.value } })
      }
      catch (error) { console.error(error); toast(`交互错误：${error.message}`) }
      finally { quietRender = false }
    })
  }
  if (!isPicker) appendChildren(element, node, context)
  return element
}

function render() {
  if (!sourceTree || !page) return
  const scroll = root.scrollTop
  document.body.dataset.page = page.data.page || 'home'
  document.body.dataset.theme = String(page.data.themeClass || 'neutral').replace(/^theme-/, '')
  const fragment = build(sourceTree, page.data)
  root.replaceChildren(fragment)
  root.scrollTop = scroll
}

async function boot() {
  try {
    const [wxssResponse, wxmlResponse] = await Promise.all([
      fetch(new URL('../pages/index/index.wxss', previewBase)),
      fetch(new URL('../pages/index/index.wxml', previewBase))
    ])
    if (!wxssResponse.ok || !wxmlResponse.ok) throw new Error('未能读取页面样式或模板')
    const style = document.createElement('style')
    style.textContent = pixels((await wxssResponse.text()).replace(/\bview\b(?=\s*[{.:>])/g, 'div').replace(/\bimage\b(?=\s*[{.:>])/g, 'img'))
    document.head.appendChild(style)
    const wxml = (await wxmlResponse.text()).replace(/wx:(if|elif|else|for|key)/g, 'data-wx-$1')
    sourceTree = new DOMParser().parseFromString(wxml, 'text/html').body.firstElementChild
    if (!sourceTree) throw new Error('页面模板为空')
    await loadModule(new URL('../pages/index/index.js', previewBase).href)
    if (!page) throw new Error('页面逻辑没有注册 Page')
    page.onLoad()
  } catch (error) {
    console.error(error)
    root.innerHTML = `<div class="preview-error">预览载入失败。请用本地 HTTP 服务打开 preview/index.html，不能直接双击文件。<pre></pre></div>`
    root.querySelector('pre').textContent = error.stack || error.message
  }
}
boot()
