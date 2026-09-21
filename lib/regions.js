const regionData = require('../data/regions.js');

const REGIONS = regionData.map((region) => ({
  ...region,
  countryCode: region.code === '81' ? 'HK'
    : region.code === '82' ? 'MO'
      : region.code === 'TW' ? 'TW'
        : region.code === 'OVERSEAS' ? 'OVERSEAS' : 'CN',
}));

function choiceToLocation(region, city) {
  if (!region || !city) return null;
  return {
    code: city.code,
    provinceCode: region.code,
    province: region.name,
    city: city.name,
    displayName: region.name === city.name ? region.name : region.name + ' · ' + city.name,
    countryCode: region.countryCode,
    timeZone: region.timeZone,
    utcOffsetMinutes: region.utcOffsetMinutes,
    isOverseas: region.countryCode === 'OVERSEAS',
  };
}

function getRegionColumns(provinceIndex) {
  const index = Math.max(0, Math.min(REGIONS.length - 1, Number(provinceIndex) || 0));
  return [REGIONS.map((region) => region.name), REGIONS[index].cities.map((city) => city.name)];
}

function getRegionByIndices(indices) {
  if (!Array.isArray(indices) || indices.length < 2) return null;
  const provinceIndex = Number(indices[0]);
  const cityIndex = Number(indices[1]);
  if (!Number.isInteger(provinceIndex) || !Number.isInteger(cityIndex)) return null;
  const region = REGIONS[provinceIndex];
  return choiceToLocation(region, region && region.cities[cityIndex]);
}

function shortName(name) {
  return String(name || '').trim().replace(/(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|地区|省|市|县|盟)$/, '');
}

function normalizeRegion(input) {
  if (input == null || input === '') return null;
  if (typeof input === 'object') {
    if (Array.isArray(input)) return getRegionByIndices(input);
    const regionKey = input.provinceCode || input.province || input.region || input.countryCode;
    const cityKey = input.code || input.city;
    for (const region of REGIONS) {
      const regionMatch = !regionKey || region.code === String(regionKey)
        || region.name === regionKey || region.countryCode === regionKey
        || shortName(region.name) === shortName(regionKey);
      if (!regionMatch) continue;
      const city = region.cities.find((item) => item.code === String(cityKey) || item.name === cityKey)
        || region.cities.find((item) => shortName(item.name) === shortName(cityKey))
        || (!cityKey && region.cities.length === 1 ? region.cities[0] : null);
      if (city) return choiceToLocation(region, city);
    }
    return null;
  }
  const value = String(input).trim();
  if (value.includes(' · ')) {
    const [province, city] = value.split(' · ');
    const combined = normalizeRegion({ province, city });
    if (combined) return combined;
  }
  // Legacy profiles stored just a city name, for example “上海”.
  for (const region of REGIONS) {
    const city = region.cities.find((item) => item.code === value || item.name === value);
    if (city) return choiceToLocation(region, city);
    if (region.name === value && region.cities.length === 1) {
      return choiceToLocation(region, region.cities[0]);
    }
  }
  for (const region of REGIONS) {
    const city = region.cities.find((item) => shortName(item.name) === value);
    if (city) return choiceToLocation(region, city);
    if (shortName(region.name) === value && region.cities.length === 1) {
      return choiceToLocation(region, region.cities[0]);
    }
  }
  return null;
}

function getRegionIndices(regionOrText) {
  const normalized = normalizeRegion(regionOrText);
  if (!normalized) return [0, 0];
  const provinceIndex = REGIONS.findIndex((region) => region.code === normalized.provinceCode);
  const cityIndex = REGIONS[provinceIndex].cities.findIndex((city) => city.code === normalized.code);
  return [provinceIndex, cityIndex];
}

module.exports = {
  REGIONS,
  normalizeRegion,
  getRegionColumns,
  getRegionByIndices,
  getRegionIndices,
};
