const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assessTravelSafety,
  getActiveClimateAdvisories,
  getWeatherDescription,
  isOfficialSourceUrl,
  normalizeClimateAdvisory,
  resolveClimateLocation,
  summarizeForecast,
  summarizeHistoricalAverages
} = require('../climate');

const now = Date.parse('2026-11-01T10:00:00.000Z');
const weather = {
  current: {
    temperatureC: 17,
    humidityPercent: 70,
    rainfallLastHourMm: 0,
    windGustKmh: 20,
    visibilityM: 12000,
    weatherCode: 2,
    time: '2026-11-01T10:00'
  },
  precipitationNextSixHoursMm: 0
};

function advisory(overrides = {}) {
  return {
    id: 'notice-1',
    locationId: 'ooty',
    status: 'safe',
    type: 'assessment',
    title: 'Conditions checked',
    message: 'No restriction was listed by the checked sources.',
    sourceTitle: 'Nilgiris District Administration',
    sourceUrl: 'https://nilgiris.nic.in/',
    sourceVerified: true,
    checkedAt: new Date(now - 60 * 60 * 1000).toISOString(),
    publishedAt: new Date(now - 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
    ...overrides
  };
}

test('resolves supported Nilgiris towns and aliases', () => {
  assert.equal(resolveClimateLocation('Udhagamandalam')?.id, 'ooty');
  assert.equal(resolveClimateLocation('Coonoor')?.id, 'coonoor');
  assert.equal(resolveClimateLocation('unsupported') , null);
});

test('accepts only HTTPS Indian government and NIC source URLs', () => {
  assert.equal(isOfficialSourceUrl('https://mausam.imd.gov.in/'), true);
  assert.equal(isOfficialSourceUrl('http://nilgiris.nic.in/'), false);
  assert.equal(isOfficialSourceUrl('https://nilgiris.nic.in.attacker.example/'), false);
});

test('requires a current source-linked assessment and administrator confirmation', () => {
  const parsedExpiry = new Date(now + 6 * 60 * 60 * 1000).toISOString();
  const record = normalizeClimateAdvisory({
    locationId: 'ooty',
    status: 'safe',
    type: 'assessment',
    title: 'Checked',
    message: 'Current district information reviewed.',
    sourceTitle: 'Nilgiris District Administration',
    sourceUrl: 'https://nilgiris.nic.in/',
    confirmedOfficial: true,
    expiresAt: parsedExpiry
  }, null, now);
  assert.equal(record.sourceVerified, true);
  assert.throws(() => normalizeClimateAdvisory({
    locationId: 'ooty',
    status: 'safe',
    type: 'assessment',
    title: 'Unchecked',
    message: 'No details',
    sourceTitle: 'Blog',
    sourceUrl: 'https://example.com/',
    confirmedOfficial: true,
    expiresAt: parsedExpiry
  }, null, now), /official source/i);
});

test('does not claim safe when no fresh current source assessment exists', () => {
  assert.equal(assessTravelSafety(weather, [], now).status, 'unable-to-verify');
  assert.equal(assessTravelSafety(null, [advisory()], now).status, 'unable-to-verify');
  assert.equal(assessTravelSafety(weather, [advisory({ checkedAt: new Date(now - 13 * 60 * 60 * 1000).toISOString() })], now).status, 'unable-to-verify');
});

test('verified active restrictions override favorable model weather', () => {
  const restriction = advisory({ status: 'not-recommended', type: 'road-closure', title: 'Road closure' });
  const result = assessTravelSafety(weather, [restriction], now);
  assert.equal(result.status, 'not-recommended');
  assert.equal(result.sourceUrl, restriction.sourceUrl);
});

test('weather-model concerns can raise caution but never create a not-recommended result', () => {
  const result = assessTravelSafety({
    ...weather,
    current: { ...weather.current, visibilityM: 500 },
    precipitationNextSixHoursMm: 25
  }, [advisory()], now);
  assert.equal(result.status, 'caution');
  assert.match(result.reason, /rainfall|visibility/i);
});

test('filters expired, wrong-location, and untrusted advisories', () => {
  const records = [
    advisory(),
    advisory({ id: 'old', expiresAt: new Date(now - 1).toISOString() }),
    advisory({ id: 'other', locationId: 'gudalur' }),
    advisory({ id: 'untrusted', sourceVerified: false })
  ];
  assert.deepEqual(getActiveClimateAdvisories(records, 'ooty', now).map((item) => item.id), ['notice-1']);
});

test('summarizes provider weather without fabricating missing values', () => {
  const result = summarizeForecast({
    timezone: 'Asia/Kolkata',
    current: {
      time: '2026-11-01T10:20',
      temperature_2m: 17.4,
      relative_humidity_2m: null,
      apparent_temperature: 16.8,
      precipitation: 0,
      weather_code: 45,
      wind_speed_10m: 8,
      wind_gusts_10m: 12,
      visibility: 800
    },
    hourly: {
      time: ['2026-11-01T10:00', '2026-11-01T11:00', '2026-11-01T12:00'],
      precipitation: [1, 2, 3]
    }
  });
  assert.equal(result.current.condition, 'Fog');
  assert.equal(result.current.humidityPercent, null);
  assert.equal(result.precipitationNextSixHoursMm, 6);
  assert.equal(getWeatherDescription(999), 'Condition unavailable');
});

test('calculates monthly means from actual archived daily observations', () => {
  const result = summarizeHistoricalAverages({
    daily: {
      time: [
        '2020-01-01', '2020-01-02', '2020-02-01', '2020-02-02',
        '2020-03-01', '2020-04-01', '2020-05-01', '2020-06-01',
        '2020-07-01', '2020-08-01', '2020-09-01', '2020-10-01',
        '2020-11-01', '2020-12-01'
      ],
      temperature_2m_mean: [10, 14, 18, 20, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
    }
  });
  assert.equal(result[0].averageTemperatureC, 12);
  assert.equal(result[0].dailyReadings, 2);
  assert.equal(result[1].averageTemperatureC, 19);
});
