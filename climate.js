const crypto = require('crypto');

const CLIMATE_LOCATIONS = [
  { id: 'ooty', name: 'Ooty (Udhagamandalam)', latitude: 11.4102, longitude: 76.695 },
  { id: 'coonoor', name: 'Coonoor', latitude: 11.353, longitude: 76.7959 },
  { id: 'kotagiri', name: 'Kotagiri', latitude: 11.4201, longitude: 76.8601 },
  { id: 'gudalur', name: 'Gudalur', latitude: 11.5005, longitude: 76.5001 },
  { id: 'pandalur', name: 'Pandalur', latitude: 11.493, longitude: 76.367 },
  { id: 'kundah', name: 'Kundah', latitude: 11.328, longitude: 76.537 }
];

const LOCATION_ALIASES = new Map([
  ['ooty', 'ooty'],
  ['udhagamandalam', 'ooty'],
  ['udhagamandalamooty', 'ooty'],
  ['coonoor', 'coonoor'],
  ['kotagiri', 'kotagiri'],
  ['gudalur', 'gudalur'],
  ['pandalur', 'pandalur'],
  ['kundah', 'kundah'],
  ['kilkundah', 'kundah']
]);

const SAFETY_STATUSES = new Set(['safe', 'caution', 'not-recommended']);
const ADVISORY_TYPES = new Set([
  'assessment',
  'heavy-rain',
  'thunderstorm',
  'dense-fog',
  'strong-winds',
  'flooding',
  'landslide',
  'road-closure',
  'travel-advisory'
]);
const SAFETY_REVIEW_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_ADVISORY_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function resolveClimateLocation(value) {
  const key = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  const id = LOCATION_ALIASES.get(key);
  return CLIMATE_LOCATIONS.find((location) => location.id === id) || null;
}

function isOfficialSourceUrl(value) {
  try {
    const url = new URL(String(value || ''));
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (host.endsWith('.gov.in') || host.endsWith('.nic.in'));
  } catch {
    return false;
  }
}

function normalizeClimateAdvisory(input, previous, now = Date.now()) {
  const locationId = input?.locationId === 'all' ? 'all' : resolveClimateLocation(input?.locationId)?.id;
  const status = String(input?.status || '');
  const type = String(input?.type || '');
  const title = String(input?.title || '').trim();
  const message = String(input?.message || '').trim();
  const sourceTitle = String(input?.sourceTitle || '').trim();
  const sourceUrl = String(input?.sourceUrl || '').trim();
  const confirmedOfficial = input?.confirmedOfficial === true;
  const recommendedPeriod = String(input?.recommendedPeriod || '').trim();
  const precautions = String(input?.precautions || '').trim();
  const expiresAt = Date.parse(input?.expiresAt);

  if (!locationId || !SAFETY_STATUSES.has(status) || !ADVISORY_TYPES.has(type)) {
    throw new Error('Choose a supported location, advisory type, and safety status.');
  }
  if (!title || title.length > 120 || !message || message.length > 1000) {
    throw new Error('Enter a title (up to 120 characters) and details (up to 1,000 characters).');
  }
  if (!sourceTitle || sourceTitle.length > 120 || !isOfficialSourceUrl(sourceUrl) || !confirmedOfficial) {
    throw new Error('Confirm the official source and provide its name and an HTTPS .gov.in or .nic.in URL.');
  }
  if (!Number.isFinite(expiresAt) || expiresAt <= now || expiresAt > now + MAX_ADVISORY_LIFETIME_MS) {
    throw new Error('Set an expiry time within the next 7 days.');
  }
  if (status === 'safe' && expiresAt > now + SAFETY_REVIEW_MAX_AGE_MS) {
    throw new Error('A safe-to-visit assessment must expire within 12 hours so it is reviewed frequently.');
  }
  if (recommendedPeriod.length > 120 || precautions.length > 1000) {
    throw new Error('Keep the recommended period under 120 characters and precautions under 1,000 characters.');
  }

  const checkedAt = new Date(now).toISOString();
  return {
    id: previous?.id || crypto.randomUUID(),
    locationId,
    status,
    type,
    title,
    message,
    precautions,
    recommendedPeriod,
    sourceTitle,
    sourceUrl,
    sourceVerified: true,
    checkedAt,
    publishedAt: previous?.publishedAt || checkedAt,
    expiresAt: new Date(expiresAt).toISOString(),
    updatedAt: checkedAt
  };
}

function getWeatherDescription(code) {
  const value = Number(code);
  if (value === 0) return 'Clear';
  if (value === 1) return 'Mainly clear';
  if (value === 2) return 'Partly cloudy';
  if (value === 3) return 'Overcast';
  if (value === 45 || value === 48) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(value)) return 'Drizzle';
  if ([61, 63, 65, 66, 67].includes(value)) return 'Rain';
  if ([71, 73, 75, 77].includes(value)) return 'Snow';
  if ([80, 81, 82].includes(value)) return 'Rain showers';
  if ([85, 86].includes(value)) return 'Snow showers';
  if (value === 95) return 'Thunderstorm';
  if ([96, 99].includes(value)) return 'Thunderstorm with hail';
  return 'Condition unavailable';
}

function summarizeForecast(payload) {
  const current = payload?.current;
  if (!current || !Number.isFinite(Number(current.temperature_2m))) {
    throw new Error('The weather provider returned incomplete current conditions.');
  }
  const hourly = payload.hourly || {};
  const currentHour = String(current.time || '').slice(0, 13);
  const hourIndex = Array.isArray(hourly.time)
    ? Math.max(0, hourly.time.findIndex((time) => String(time).slice(0, 13) === currentHour))
    : 0;
  const nextSixHours = Array.isArray(hourly.precipitation)
    ? hourly.precipitation.slice(hourIndex, hourIndex + 6).map(Number).filter(Number.isFinite)
    : [];
  const finiteNumber = (value) => value !== null && value !== undefined && Number.isFinite(Number(value))
    ? Number(value)
    : null;
  return {
    current: {
      temperatureC: Number(current.temperature_2m),
      apparentTemperatureC: finiteNumber(current.apparent_temperature),
      humidityPercent: finiteNumber(current.relative_humidity_2m),
      rainfallLastHourMm: finiteNumber(current.precipitation),
      windSpeedKmh: finiteNumber(current.wind_speed_10m),
      windGustKmh: finiteNumber(current.wind_gusts_10m),
      visibilityM: finiteNumber(current.visibility),
      weatherCode: Number(current.weather_code),
      condition: getWeatherDescription(current.weather_code),
      time: current.time
    },
    precipitationNextSixHoursMm: nextSixHours.length
      ? Number(nextSixHours.reduce((sum, amount) => sum + amount, 0).toFixed(1))
      : null,
    source: 'Open-Meteo',
    sourceUrl: 'https://open-meteo.com/',
    timezone: payload.timezone || 'Asia/Kolkata'
  };
}

function getActiveClimateAdvisories(advisories, locationId, now = Date.now()) {
  return (Array.isArray(advisories) ? advisories : [])
    .filter((advisory) => {
      const expiry = Date.parse(advisory.expiresAt);
      const published = Date.parse(advisory.publishedAt);
      return (advisory.locationId === 'all' || advisory.locationId === locationId) &&
        advisory.sourceVerified === true &&
        isOfficialSourceUrl(advisory.sourceUrl) &&
        Number.isFinite(expiry) &&
        expiry > now &&
        (!Number.isFinite(published) || published <= now);
    })
    .sort((first, second) => Date.parse(first.expiresAt) - Date.parse(second.expiresAt));
}

function assessTravelSafety(weather, advisories, now = Date.now()) {
  const activeAdvisories = Array.isArray(advisories) ? advisories : [];
  const blocked = activeAdvisories.find((advisory) => advisory.status === 'not-recommended');
  if (blocked) {
    return {
      status: 'not-recommended',
      title: 'NOT RECOMMENDED',
      reason: blocked.title,
      sourceTitle: blocked.sourceTitle,
      sourceUrl: blocked.sourceUrl,
      checkedAt: blocked.checkedAt
    };
  }

  const caution = activeAdvisories.find((advisory) => advisory.status === 'caution');
  if (caution) {
    return {
      status: 'caution',
      title: 'CAUTION',
      reason: caution.title,
      sourceTitle: caution.sourceTitle,
      sourceUrl: caution.sourceUrl,
      checkedAt: caution.checkedAt
    };
  }

  if (!weather?.current || !Number.isFinite(Date.parse(weather.current.time))) {
    return {
      status: 'unable-to-verify',
      title: 'UNABLE TO VERIFY SAFETY',
      reason: 'Current weather or safety information is unavailable.'
    };
  }

  const current = weather.current;
  const weatherConcerns = [];
  if (weather.precipitationNextSixHoursMm >= 20) weatherConcerns.push('Forecast rainfall may make travel difficult.');
  if (current.visibilityM !== null && current.visibilityM < 1000) weatherConcerns.push('Low visibility is reported by the weather model.');
  if (current.windGustKmh !== null && current.windGustKmh >= 50) weatherConcerns.push('Strong wind gusts are reported by the weather model.');
  if ([95, 96, 99].includes(current.weatherCode)) weatherConcerns.push('Thunderstorm conditions are reported by the weather model.');
  if (weatherConcerns.length) {
    return { status: 'caution', title: 'CAUTION', reason: weatherConcerns.join(' ') };
  }

  const safeAssessment = activeAdvisories.find((advisory) => advisory.status === 'safe');
  const reviewedAt = Date.parse(safeAssessment?.checkedAt);
  if (
    safeAssessment &&
    isOfficialSourceUrl(safeAssessment.sourceUrl) &&
    Number.isFinite(reviewedAt) &&
    now - reviewedAt >= 0 &&
    now - reviewedAt <= SAFETY_REVIEW_MAX_AGE_MS
  ) {
    return {
      status: 'safe',
      title: 'SAFE TO VISIT',
      reason: safeAssessment.message,
      precautions: safeAssessment.precautions,
      recommendedPeriod: safeAssessment.recommendedPeriod,
      sourceTitle: safeAssessment.sourceTitle,
      sourceUrl: safeAssessment.sourceUrl,
      checkedAt: safeAssessment.checkedAt
    };
  }

  return {
    status: 'unable-to-verify',
    title: 'UNABLE TO VERIFY SAFETY',
    reason: 'No current, source-linked safety assessment is available. Check official weather and local road advisories before travelling.'
  };
}

function summarizeHistoricalAverages(payload) {
  const dates = payload?.daily?.time;
  const temperatures = payload?.daily?.temperature_2m_mean;
  if (!Array.isArray(dates) || !Array.isArray(temperatures) || dates.length !== temperatures.length) {
    throw new Error('The historical climate provider returned incomplete data.');
  }
  const totals = Array.from({ length: 12 }, () => ({ sum: 0, count: 0 }));
  dates.forEach((date, index) => {
    const month = Number(String(date).slice(5, 7)) - 1;
    const temperature = Number(temperatures[index]);
    if (month >= 0 && month < 12 && Number.isFinite(temperature)) {
      totals[month].sum += temperature;
      totals[month].count += 1;
    }
  });
  if (totals.some((month) => month.count === 0)) {
    throw new Error('The historical climate archive is missing one or more monthly averages.');
  }
  return totals.map((month, index) => ({
    month: index + 1,
    averageTemperatureC: Number((month.sum / month.count).toFixed(1)),
    dailyReadings: month.count
  }));
}

module.exports = {
  ADVISORY_TYPES,
  CLIMATE_LOCATIONS,
  SAFETY_STATUSES,
  assessTravelSafety,
  getActiveClimateAdvisories,
  getWeatherDescription,
  isOfficialSourceUrl,
  normalizeClimateAdvisory,
  resolveClimateLocation,
  summarizeForecast,
  summarizeHistoricalAverages
};
