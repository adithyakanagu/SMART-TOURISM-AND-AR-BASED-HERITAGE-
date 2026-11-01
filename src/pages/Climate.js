import React, { useEffect, useMemo, useState } from 'react';
import {
  FaBolt,
  FaCheckCircle,
  FaCloud,
  FaCloudRain,
  FaCloudSun,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaEye,
  FaMapMarkerAlt,
  FaRedoAlt,
  FaSmog,
  FaSnowflake,
  FaSun,
  FaThermometerHalf,
  FaTint,
  FaWind
} from 'react-icons/fa';
import { loadAppData } from '../data/store';
import { API_BASE_URL } from '../data/api';
import './Climate.css';

const CLIMATE_LOCATIONS = [
  { id: 'ooty', name: 'Ooty (Udhagamandalam)' },
  { id: 'coonoor', name: 'Coonoor' },
  { id: 'kotagiri', name: 'Kotagiri' },
  { id: 'gudalur', name: 'Gudalur' },
  { id: 'pandalur', name: 'Pandalur' },
  { id: 'kundah', name: 'Kundah' }
];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SEASONS = [
  { label: 'January – March', months: [1, 2, 3] },
  { label: 'April – June', months: [4, 5, 6] },
  { label: 'July – September', months: [7, 8, 9] },
  { label: 'October – December', months: [10, 11, 12] }
];
const WEATHER_ICONS = {
  clear: FaSun,
  clouds: FaCloud,
  partlyCloudy: FaCloudSun,
  fog: FaSmog,
  rain: FaCloudRain,
  storm: FaBolt,
  snow: FaSnowflake
};

function getLocationId(value) {
  const normalized = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  if (['ooty', 'udhagamandalam', 'udhagamandalamooty'].includes(normalized)) return 'ooty';
  return CLIMATE_LOCATIONS.find((location) => location.id === normalized)?.id || null;
}

function getWeatherIcon(code) {
  if (code === 0) return WEATHER_ICONS.clear;
  if (code === 1 || code === 2) return WEATHER_ICONS.partlyCloudy;
  if (code === 3) return WEATHER_ICONS.clouds;
  if (code === 45 || code === 48) return WEATHER_ICONS.fog;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return WEATHER_ICONS.rain;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return WEATHER_ICONS.snow;
  if ([95, 96, 99].includes(code)) return WEATHER_ICONS.storm;
  return WEATHER_ICONS.clouds;
}

function formatTime(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Time unavailable';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function useClimateReport(locationId, refreshToken = 0) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError('');
    setReport(null);

    fetch(`${API_BASE_URL}/api/climate?location=${encodeURIComponent(locationId)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'Climate information is unavailable.');
        return result;
      })
      .then((result) => {
        if (active) setReport(result);
      })
      .catch((requestError) => {
        if (!active || requestError.name === 'AbortError') {
          if (active) setError('Climate service timed out. Please try again.');
          return;
        }
        setError(requestError.message || 'Could not load climate information.');
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locationId, refreshToken]);

  return { report, loading, error };
}

function SafetyStatus({ safety }) {
  const status = safety?.status || 'unable-to-verify';
  const Icon = status === 'safe'
    ? FaCheckCircle
    : status === 'not-recommended'
      ? FaExclamationTriangle
      : FaExclamationTriangle;
  const title = safety?.title || 'UNABLE TO VERIFY SAFETY';
  return (
    <div className={`climate-safety-status ${status}`} role="status" aria-live="polite">
      <Icon aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{safety?.reason || 'A current, source-linked travel assessment is not available.'}</p>
      </div>
    </div>
  );
}

function AdvisoryList({ report }) {
  const advisories = report?.advisories || [];
  return (
    <section className="climate-advisories" aria-labelledby="climate-advisories-title">
      <div className="climate-section-heading">
        <span className="climate-heading-icon"><FaExclamationTriangle /></span>
        <div>
          <h3 id="climate-advisories-title">Travel advisories</h3>
          <p>Admin-published notices linked to official-source domains</p>
        </div>
      </div>
      {advisories.length ? (
        <div className="climate-advisory-list">
          {advisories.map((advisory) => (
            <article key={advisory.id} className={`climate-advisory-card ${advisory.status}`}>
              <div className="climate-advisory-title">
                <strong>{advisory.title}</strong>
                <span>{advisory.type.replace(/-/g, ' ')}</span>
              </div>
              <p>{advisory.message}</p>
              {advisory.precautions && <p><strong>Precautions:</strong> {advisory.precautions}</p>}
              {advisory.recommendedPeriod && <p><strong>Recommended period:</strong> {advisory.recommendedPeriod}</p>}
              <div className="climate-advisory-meta">
                <span>Checked {formatTime(advisory.checkedAt)}</span>
                <span>Expires {formatTime(advisory.expiresAt)}</span>
                <a href={advisory.sourceUrl} target="_blank" rel="noreferrer">
                  {advisory.sourceTitle} <FaExternalLinkAlt aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="climate-no-advisories">
          <strong>No current administrator-published advisory is recorded.</strong>
          <p>This does not confirm that no official warning or road restriction exists. The app does not automatically ingest IMD or district warning feeds.</p>
        </div>
      )}
      <div className="climate-official-links">
        {(report?.officialSources || []).map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
            Check {source.title} <FaExternalLinkAlt aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}

export function ClimateSafetyCard({ location, destinationName }) {
  const locationId = getLocationId(location);
  const { report, loading, error } = useClimateReport(locationId || '');

  if (!locationId) {
    return (
      <section className="climate-destination-card" aria-label="Destination climate and safety">
        <div className="climate-destination-heading"><FaMapMarkerAlt /><strong>Weather & travel safety</strong></div>
        <SafetyStatus safety={{ reason: 'Climate coverage is not configured for this destination.' }} />
      </section>
    );
  }

  const Icon = report?.weather?.current ? getWeatherIcon(report.weather.current.weatherCode) : FaCloud;
  return (
    <section className="climate-destination-card" aria-label={`Weather and safety for ${destinationName || location}`}>
      <div className="climate-destination-heading">
        <FaMapMarkerAlt aria-hidden="true" />
        <strong>Weather & travel safety</strong>
        <span>{destinationName || location}</span>
      </div>
      {loading && <p className="climate-inline-state" role="status">Loading current weather and travel assessment…</p>}
      {error && <p className="climate-inline-error" role="alert">{error}</p>}
      {!loading && report && (
        <>
          {report.weather ? (
            <div className="climate-destination-weather">
              <Icon aria-hidden="true" />
              <strong>{report.weather.current.temperatureC.toFixed(1)}°C</strong>
              <span>{report.weather.current.condition} · Weather for {report.location.name}</span>
            </div>
          ) : <p className="climate-inline-error" role="alert">{report.weatherError || 'Live weather unavailable.'}</p>}
          <SafetyStatus safety={report.safety} />
          <p className="climate-nearby-note">Weather is from the nearest listed town centre, not an on-site measurement. Safety requires current source-linked advisories.</p>
          {(report.advisories || []).map((advisory) => (
            <div className="climate-brief-advisory" key={advisory.id}>
              <strong>{advisory.title}</strong>
              <span>{advisory.message}</span>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function Climate() {
  const [selectedTown, setSelectedTown] = useState('ooty');
  const [selectedSpotId, setSelectedSpotId] = useState('');
  const [seasonIndex, setSeasonIndex] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [averages, setAverages] = useState(null);
  const [averagesLoading, setAveragesLoading] = useState(true);
  const [averagesError, setAveragesError] = useState('');
  const [tourismSpots, setTourismSpots] = useState(() => loadAppData().tourismSpots || []);
  const selectedSpot = tourismSpots.find((spot) => String(spot.id) === selectedSpotId);
  const selectedLocationId = getLocationId(selectedSpot?.taluk) || selectedTown;
  const selectedDestinationName = selectedSpot?.name || CLIMATE_LOCATIONS.find((item) => item.id === selectedTown)?.name;
  const { report, loading, error } = useClimateReport(selectedLocationId, refreshToken);
  const chartMonths = useMemo(() => {
    const season = SEASONS[seasonIndex];
    return (averages?.months || []).filter((item) => season.months.includes(item.month));
  }, [averages, seasonIndex]);

  useEffect(() => {
    const syncSpots = () => setTourismSpots(loadAppData().tourismSpots || []);
    window.addEventListener('arSmartTourismDataUpdated', syncSpots);
    return () => window.removeEventListener('arSmartTourismDataUpdated', syncSpots);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    setAverages(null);
    setAveragesLoading(true);
    setAveragesError('');

    fetch(`${API_BASE_URL}/api/climate/averages?location=${encodeURIComponent(selectedLocationId)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'Historical averages are unavailable.');
        return result;
      })
      .then((result) => {
        if (active) setAverages(result);
      })
      .catch((requestError) => {
        if (active) setAveragesError(requestError.name === 'AbortError' ? 'Historical climate request timed out.' : requestError.message || 'Could not load historical climate.');
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setAveragesLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedLocationId, refreshToken]);

  const selectDestination = (value) => {
    if (value.startsWith('spot:')) {
      setSelectedSpotId(value.slice(5));
      return;
    }
    setSelectedSpotId('');
    setSelectedTown(value.slice(5));
  };

  const destinationOptions = useMemo(() => tourismSpots
    .map((spot) => ({ spot, locationId: getLocationId(spot.taluk) }))
    .filter(({ spot, locationId }) => locationId && spot.name)
    .sort((first, second) => first.spot.name.localeCompare(second.spot.name)), [tourismSpots]);

  const TemperatureIcon = report?.weather?.current ? getWeatherIcon(report.weather.current.weatherCode) : FaCloud;
  const statusClass = report?.safety?.status || 'unable-to-verify';

  return (
    <section className="climate-page" id="climate-panel" role="tabpanel" aria-labelledby="climate-tab">
      <header className="climate-page-header">
        <div>
          <span className="climate-eyebrow">Nilgiris climate & trip planning</span>
          <h2>Climate and travel safety</h2>
          <p>Live model weather, historical averages, and current source-linked travel assessments.</p>
        </div>
        <button type="button" className="climate-refresh" onClick={() => setRefreshToken((value) => value + 1)} disabled={loading || averagesLoading}>
          <FaRedoAlt aria-hidden="true" /> Refresh
        </button>
      </header>

      <div className="climate-location-picker">
        <label htmlFor="climate-location"><FaMapMarkerAlt aria-hidden="true" /> Choose a Nilgiris location</label>
        <select
          id="climate-location"
          value={selectedSpot ? `spot:${selectedSpotId}` : `town:${selectedTown}`}
          onChange={(event) => selectDestination(event.target.value)}
        >
          <optgroup label="Town weather locations">
            {CLIMATE_LOCATIONS.map((location) => <option key={location.id} value={`town:${location.id}`}>{location.name}</option>)}
          </optgroup>
          {destinationOptions.length > 0 && (
            <optgroup label="Tourism destinations (weather from taluk centre)">
              {destinationOptions.map(({ spot }) => (
                <option key={spot.id} value={`spot:${spot.id}`}>{spot.name} · {spot.taluk}</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {(error || report?.weatherError) && (
        <div className="climate-error" role="alert">{error || report.weatherError}</div>
      )}

      <article className={`climate-weather-card ${loading ? 'loading' : ''}`}>
        <div className="climate-weather-main">
          <div className="climate-condition-icon"><TemperatureIcon aria-hidden="true" /></div>
          <div className="climate-current-copy">
            <span>{selectedDestinationName}</span>
            <strong>{report?.weather?.current ? `${report.weather.current.temperatureC.toFixed(1)}°C` : loading ? '…' : '—'}</strong>
            <p>{report?.weather?.current?.condition || (loading ? 'Loading live conditions…' : 'Live weather unavailable')}</p>
          </div>
          <div className={`climate-model-chip ${statusClass}`}>
            <span>Travel assessment</span>
            <strong>{report?.safety?.title || 'UNABLE TO VERIFY SAFETY'}</strong>
          </div>
        </div>

        {report?.weather && (
          <>
            <div className="climate-metric-grid">
              <div className="climate-metric"><FaThermometerHalf aria-hidden="true" /><span>Feels like</span><strong>{report.weather.current.apparentTemperatureC === null ? '—' : `${report.weather.current.apparentTemperatureC.toFixed(1)}°C`}</strong></div>
              <div className="climate-metric"><FaTint aria-hidden="true" /><span>Humidity</span><strong>{report.weather.current.humidityPercent === null ? '—' : `${report.weather.current.humidityPercent}%`}</strong></div>
              <div className="climate-metric"><FaCloudRain aria-hidden="true" /><span>Rain, past hour</span><strong>{report.weather.current.rainfallLastHourMm === null ? '—' : `${report.weather.current.rainfallLastHourMm} mm`}</strong></div>
              <div className="climate-metric"><FaWind aria-hidden="true" /><span>Wind speed</span><strong>{report.weather.current.windSpeedKmh === null ? '—' : `${report.weather.current.windSpeedKmh} km/h`}</strong></div>
              <div className="climate-metric"><FaWind aria-hidden="true" /><span>Wind gusts</span><strong>{report.weather.current.windGustKmh === null ? '—' : `${report.weather.current.windGustKmh} km/h`}</strong></div>
              <div className="climate-metric"><FaEye aria-hidden="true" /><span>Visibility</span><strong>{report.weather.current.visibilityM === null ? '—' : `${(report.weather.current.visibilityM / 1000).toFixed(1)} km`}</strong></div>
              <div className="climate-metric"><FaCloudRain aria-hidden="true" /><span>Rain forecast, next 6 h</span><strong>{report.weather.precipitationNextSixHoursMm === null ? '—' : `${report.weather.precipitationNextSixHoursMm} mm`}</strong></div>
            </div>
            <div className="climate-weather-footnote">
              <span>Weather model: Open-Meteo · {report.weather.timezone}</span>
              <span>Updated {formatTime(report.weather.current.time)}</span>
            </div>
            <p className="climate-model-note">Forecast and observations are model-derived for the selected town centre. They are not an official alert or on-site measurement.</p>
          </>
        )}
      </article>

      <section className="climate-safety-section" aria-labelledby="climate-safety-title">
        <div className="climate-section-heading">
          <span className="climate-heading-icon"><FaMapMarkerAlt /></span>
          <div>
            <h3 id="climate-safety-title">Is it safe to visit now?</h3>
            <p>Safety is not inferred from temperature or weather alone.</p>
          </div>
        </div>
        <SafetyStatus safety={report?.safety} />
        {report?.safety?.precautions && <p className="climate-precautions"><strong>Precautions:</strong> {report.safety.precautions}</p>}
        {report?.safety?.recommendedPeriod ? (
          <p className="climate-precautions"><strong>Recommended visiting period:</strong> {report.safety.recommendedPeriod}</p>
        ) : (
          <p className="climate-precautions"><strong>Recommended period:</strong> No current locally reviewed recommendation is published for this location.</p>
        )}
        <p className="climate-safety-disclaimer">
          A green status is shown only when an administrator has recently recorded a source-linked assessment. Open-Meteo is a weather source, not a safety authority. Verify IMD warnings and local road conditions before departure.
        </p>
      </section>

      <AdvisoryList report={report} />

      <section className="climate-history-section" aria-labelledby="climate-history-title">
        <div className="climate-section-heading">
          <span className="climate-heading-icon"><FaThermometerHalf /></span>
          <div>
            <h3 id="climate-history-title">Average temperatures</h3>
            <p>Historical daily means · {averages?.period || '2015–2024'} · not a forecast</p>
          </div>
        </div>
        <div className="climate-season-tabs" role="tablist" aria-label="Historical temperature seasons">
          {SEASONS.map((season, index) => (
            <button key={season.label} type="button" role="tab" aria-selected={seasonIndex === index} onClick={() => setSeasonIndex(index)}>
              {season.label}
            </button>
          ))}
        </div>
        {averagesLoading ? (
          <p className="climate-inline-state" role="status">Loading historical climate archive…</p>
        ) : averagesError ? (
          <p className="climate-inline-error" role="alert">{averagesError}</p>
        ) : (
          <>
            <div className="climate-chart" role="img" aria-label={`Historical average monthly temperatures for ${SEASONS[seasonIndex].label}`}>
              {chartMonths.map((month) => {
                const MonthName = MONTH_NAMES[month.month - 1];
                const height = Math.max(12, Math.min(100, (month.averageTemperatureC / 35) * 100));
                return (
                  <div className="climate-chart-column" key={month.month} title={`${MonthName}: ${month.averageTemperatureC.toFixed(1)}°C`}>
                    <strong>{month.averageTemperatureC.toFixed(1)}°</strong>
                    <div className="climate-chart-track">
                      <span style={{ height: `${height}%` }} />
                    </div>
                    <span>{MONTH_SHORT_NAMES[month.month - 1]}</span>
                  </div>
                );
              })}
            </div>
            <p className="climate-chart-source">
              Source: <a href={averages.sourceUrl} target="_blank" rel="noreferrer">{averages.source} <FaExternalLinkAlt aria-hidden="true" /></a>. Historical monthly mean is calculated from archived daily mean temperatures for 2015–2024.
            </p>
          </>
        )}
      </section>
    </section>
  );
}

export default Climate;
