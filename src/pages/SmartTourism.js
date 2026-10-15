import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowLeft,
  FaCompass,
  FaCar,
  FaGlobe,
  FaStreetView,
  FaTimes,
  FaSearchLocation,
  FaHeart,
  FaPlus,
  FaCheckCircle,
  FaRobot
} from 'react-icons/fa';
import { loadAppData } from '../data/store';
import './SmartTourism.css';

const defaultTourismData = loadAppData();
const googleMapsEmbedApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const streetViewCoordinateCache = new Map();

const talukaMapRegions = [
  { id: 'pandalur', name: 'Pandalur', className: 'region-pandalur' },
  { id: 'gudalur', name: 'Gudalur', className: 'region-gudalur' },
  { id: 'ooty', name: 'Ooty', className: 'region-ooty' },
  { id: 'kotagiri', name: 'Kotagiri', className: 'region-kotagiri' },
  { id: 'coonoor', name: 'Coonoor', className: 'region-coonoor' },
  { id: 'kundah', name: 'Kundah', className: 'region-kundah' }
];

function SmartTourism() {
  const navigate = useNavigate();
  const [tourismSpots, setTourismSpots] = useState(defaultTourismData.tourismSpots || []);
  const [selectedDistrict, setSelectedDistrict] = useState('Nilgiris');
  const [selectedTaluk, setSelectedTaluk] = useState('Ooty');
  const [showTalukPlaces, setShowTalukPlaces] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [earthPlace, setEarthPlace] = useState(null);
  const [earthViewMode, setEarthViewMode] = useState('satellite');
  const [streetViewCoordinates, setStreetViewCoordinates] = useState(null);
  const [streetViewMessage, setStreetViewMessage] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [showNavigation, setShowNavigation] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [tripPlan, setTripPlan] = useState([]);
  const [plannerDays, setPlannerDays] = useState('1');
  const [plannerInterest, setPlannerInterest] = useState('balanced');
  const [aiPlan, setAiPlan] = useState([]);

  useEffect(() => {
    if (!earthPlace) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setEarthPlace(null);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [earthPlace]);

  useEffect(() => {
    const syncTourismSpots = () => setTourismSpots(loadAppData().tourismSpots || []);
    window.addEventListener('arSmartTourismDataUpdated', syncTourismSpots);
    return () => window.removeEventListener('arSmartTourismDataUpdated', syncTourismSpots);
  }, []);

  const districts = useMemo(
    () => ['Nilgiris', ...new Set((tourismSpots || []).map((spot) => spot.district).filter(Boolean))],
    [tourismSpots]
  );

  const taluks = useMemo(
    () => [...new Set((tourismSpots || [])
      .filter((spot) => selectedDistrict === 'Nilgiris' || spot.district === selectedDistrict)
      .map((spot) => spot.taluk))],
    [tourismSpots, selectedDistrict]
  );

  const filteredSpots = useMemo(
    () => (tourismSpots || []).filter((spot) => {
      const matchesDistrict = selectedDistrict === 'Nilgiris' || spot.district === selectedDistrict;
      const matchesTaluk = !selectedTaluk || spot.taluk === selectedTaluk;
      return matchesDistrict && matchesTaluk;
    }),
    [tourismSpots, selectedDistrict, selectedTaluk]
  );

  const selectTaluk = (taluk) => {
    setSelectedDistrict('Nilgiris');
    setSelectedTaluk(taluk);
    setSelectedPlace(null);
    setShowTalukPlaces(true);
  };

  const handleBack = () => {
    if (showNavigation) {
      setShowNavigation(false);
      setSelectedPlace(null);
      setFromLocation('');
    } else if (showTalukPlaces) {
      setShowTalukPlaces(false);
    } else {
      navigate('/');
    }
  };

  const handleNavigation = (place) => {
    setSelectedPlace(place);
    setShowNavigation(true);
  };

  const toggleFavorite = (place) => {
    setFavorites((current) => current.includes(place.id)
      ? current.filter((id) => id !== place.id)
      : [...current, place.id]);
  };

  const addToTripPlan = (place) => {
    setTripPlan((current) => current.some((item) => item.id === place.id) ? current : [...current, place]);
  };

  const removeFromTripPlan = (placeId) => {
    setTripPlan((current) => current.filter((place) => place.id !== placeId));
  };

  const generateAiPlan = () => {
    const interestTypes = {
      nature: ['Nature', 'Viewpoint', 'Lake', 'Waterfall', 'Forest', 'Mountain', 'Nature Zone'],
      heritage: ['Heritage', 'Cultural Heritage', 'Tribal Heritage', 'Heritage Recreation'],
      tea: ['Tea Tourism', 'Community Tourism'],
      wildlife: ['Wildlife', 'Forest', 'Nature Zone'],
      hidden: ['Hidden Gem', 'Community Tourism', 'Nature Zone'],
      balanced: []
    };
    const preferredTypes = interestTypes[plannerInterest];
    const matching = filteredSpots.filter((place) => preferredTypes.length === 0 || preferredTypes.includes(place.type));
    const fallback = filteredSpots.filter((place) => !matching.some((item) => item.id === place.id));
    const placesPerDay = 3;
    const selected = [...matching, ...fallback].slice(0, Math.max(1, Number(plannerDays)) * placesPerDay);
    setAiPlan(selected);
    setTripPlan(selected);
  };

  const getDistance = () => {
    const distances = {
      Coimbatore: { Ooty: '88 km', Coonoor: '75 km', Gudalur: '110 km', Pandalur: '125 km', Kotagiri: '70 km', Kundah: '105 km' },
      Chennai: { Ooty: '535 km', Coonoor: '520 km', Gudalur: '555 km', Pandalur: '570 km', Kotagiri: '510 km', Kundah: '545 km' },
      Bangalore: { Ooty: '270 km', Coonoor: '255 km', Gudalur: '295 km', Pandalur: '315 km', Kotagiri: '245 km', Kundah: '285 km' }
    };
    return distances[fromLocation]?.[selectedTaluk] || 'Route distance unavailable';
  };

  const getTravelTime = () => {
    if (fromLocation === 'Coimbatore') return '2.5 - 3.5 hours';
    if (fromLocation === 'Bangalore') return '6 - 7 hours';
    if (fromLocation === 'Chennai') return '10 - 11 hours';
    return 'Travel time depends on route and traffic';
  };

  const openGoogleMaps = () => {
    if (!fromLocation || !selectedPlace) return;
    const destination = `${selectedPlace.name}, ${selectedPlace.taluk}, The Nilgiris, Tamil Nadu`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fromLocation)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openGoogleEarth = (place) => {
    setEarthPlace(place);
    setEarthViewMode('satellite');
    setStreetViewCoordinates(null);
    setStreetViewMessage('');
  };

  const openStreetView = async (place) => {
    setEarthPlace(place);
    setEarthViewMode('streetview');
    setStreetViewCoordinates(null);
    setStreetViewMessage('');

    if (!googleMapsEmbedApiKey) {
      setStreetViewMessage('Add a Google Maps Embed API key as REACT_APP_GOOGLE_MAPS_API_KEY in .env, then restart the app.');
      return;
    }

    const locationQuery = `${place.name}, ${place.taluk}, The Nilgiris, Tamil Nadu, India`;
    const cacheKey = locationQuery.toLowerCase();

    try {
      let coordinates = streetViewCoordinateCache.get(cacheKey);
      if (!coordinates) {
        const geocodeUrl = new URL('https://nominatim.openstreetmap.org/search');
        geocodeUrl.search = new URLSearchParams({
          format: 'jsonv2',
          limit: '1',
          countrycodes: 'in',
          q: locationQuery
        });
        const response = await fetch(geocodeUrl);
        if (!response.ok) throw new Error('Location lookup failed');
        const [match] = await response.json();
        if (!match) throw new Error('Location not found');
        coordinates = `${match.lat},${match.lon}`;
        streetViewCoordinateCache.set(cacheKey, coordinates);
      }
      setStreetViewCoordinates(coordinates);
    } catch {
      setStreetViewMessage(`Could not find coordinates for ${place.name}.`);
    }
  };

  return (
    <div className="smart-tourism-container">
      <motion.header className="tourism-header" initial={{ y: -50 }} animate={{ y: 0 }}>
        <button className="back-btn" onClick={handleBack}>
          <FaArrowLeft /> Back
        </button>
        <h1>{showNavigation ? 'Navigation Guide' : showTalukPlaces ? `${selectedTaluk} Tourism` : 'Smart Tourism'}</h1>
        <div className="header-spacer" />
      </motion.header>

      <main className="tourism-main">
        {!showNavigation && !showTalukPlaces && (
          <motion.section className="map-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="section-title">🗺️ Explore Nilgiris District</h2>
            <p className="section-subtitle">Select a district and taluk to discover tourist places, rush levels, and nearby chill spots.</p>

            <div className="filters-row">
              <label>
                District
                <select value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)}>
                  {districts.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </label>

              <label>
                Taluk
                <select value={selectedTaluk} onChange={(event) => setSelectedTaluk(event.target.value)}>
                  {taluks.map((taluk) => (
                    <option key={taluk} value={taluk}>{taluk}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="nilgiris-map-wrapper">
              <img src="/nilgiris-taluks-map.jpg" alt="Map of the six Nilgiris taluks" className="nilgiris-map" />
              {talukaMapRegions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  className={`map-click-region ${region.className}`}
                  onClick={() => selectTaluk(region.name)}
                  title={`Explore ${region.name} taluk`}
                  aria-label={`Explore ${region.name} taluk`}
                >
                  <span>{region.name}</span>
                </button>
              ))}
            </div>

            <div className="map-legend">
              {talukaMapRegions.map((region) => (
                <button key={region.id} type="button" className="legend-item" onClick={() => selectTaluk(region.name)}>
                  <span className="legend-dot" />
                  {region.name}
                </button>
              ))}
            </div>

          </motion.section>
        )}

        {!showNavigation && showTalukPlaces && (
          <motion.section className="places-section" initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="section-title">📍 Places in {selectedTaluk} Taluk</h2>
            <p className="section-subtitle">Select a place to view rush information, nearby spots, and route guidance.</p>

            <div className="ai-planner-panel">
              <div className="ai-planner-heading">
                <span className="ai-icon"><FaRobot /></span>
                <div>
                  <h3>AI Trip Planner</h3>
                  <p>Get a practical itinerary from the places available in {selectedTaluk}.</p>
                </div>
              </div>
              <div className="ai-planner-controls">
                <label>
                  Trip days
                  <select value={plannerDays} onChange={(event) => setPlannerDays(event.target.value)}>
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                  </select>
                </label>
                <label>
                  Interest
                  <select value={plannerInterest} onChange={(event) => setPlannerInterest(event.target.value)}>
                    <option value="balanced">Balanced Nilgiris</option>
                    <option value="nature">Nature and viewpoints</option>
                    <option value="heritage">Heritage and culture</option>
                    <option value="tea">Tea and community</option>
                    <option value="wildlife">Wildlife and forests</option>
                    <option value="hidden">Hidden gems</option>
                  </select>
                </label>
                <button type="button" className="ai-plan-button" onClick={generateAiPlan}><FaRobot /> Create my plan</button>
              </div>
              {aiPlan.length > 0 && (
                <div className="ai-plan-result">
                  <strong>Suggested {plannerDays}-day itinerary</strong>
                  <div className="ai-plan-days">
                    {Array.from({ length: Number(plannerDays) }, (_, dayIndex) => {
                      const dayPlaces = aiPlan.slice(dayIndex * 3, dayIndex * 3 + 3);
                      return dayPlaces.length > 0 ? (
                        <div key={`day-${dayIndex + 1}`} className="ai-plan-day">
                          <span>Day {dayIndex + 1}</span>
                          {dayPlaces.map((place) => <small key={place.id}>{place.name}</small>)}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="map-mini-grid">
              {filteredSpots.map((place) => (
                <article key={place.id} className="spot-panel">
                  <div className="spot-header">
                    <span className="spot-type">{place.type}</span>
                    <span className={`rush-tag ${place.rush.toLowerCase()}`}>{place.rush}</span>
                  </div>
                  <div className="spot-title-row">
                    <h3>{place.name}</h3>
                    <button type="button" className={`icon-action ${favorites.includes(place.id) ? 'active' : ''}`} onClick={() => toggleFavorite(place)} aria-label={`Save ${place.name}`} title="Save place">
                      <FaHeart />
                    </button>
                  </div>
                  <p>{place.description}</p>
                  <small>{place.taluk} · {place.district}</small>
                  <div className="spot-actions">
                    <button type="button" className="spot-action secondary" onClick={() => addToTripPlan(place)}>
                      <FaPlus /> Add to trip
                    </button>
                    <button type="button" className="spot-action secondary" onClick={() => openGoogleEarth(place)}>
                      <FaGlobe /> Google Earth
                    </button>
                    <button type="button" className="spot-action secondary" onClick={() => openStreetView(place)}>
                      <FaStreetView /> Street View
                    </button>
                    <button type="button" className="spot-action" onClick={() => handleNavigation(place)}>View details</button>
                  </div>
                </article>
              ))}
            </div>

            <div className="trip-planner-panel">
              <div>
                <h3>My trip plan</h3>
                <p>{tripPlan.length ? `${tripPlan.length} place${tripPlan.length === 1 ? '' : 's'} selected` : 'Build a simple itinerary from this taluk.'}</p>
              </div>
              {tripPlan.length > 0 && <div className="trip-plan-list">
                {tripPlan.map((place, index) => (
                  <div key={place.id} className="trip-plan-item">
                    <span>{index + 1}. {place.name}</span>
                    <button type="button" onClick={() => removeFromTripPlan(place.id)} aria-label={`Remove ${place.name}`}>&times;</button>
                  </div>
                ))}
              </div>}
            </div>

            {filteredSpots.length === 0 && (
              <div className="select-note">No tourism spots have been added for {selectedTaluk} yet.</div>
            )}
          </motion.section>
        )}

        {showNavigation && selectedPlace && (
          <motion.section className="navigation-section" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="navigation-card">
              <div className="nav-header">
                <FaCompass size={38} color="#2E7D32" />
                <h2>Navigate to {selectedPlace.name}</h2>
                <button type="button" className={`icon-action large ${favorites.includes(selectedPlace.id) ? 'active' : ''}`} onClick={() => toggleFavorite(selectedPlace)} aria-label="Save place" title="Save place">
                  <FaHeart />
                </button>
              </div>

              <div className="place-detail-grid">
                <div><span>Category</span><strong>{selectedPlace.type}</strong></div>
                <div><span>Crowd level</span><strong>{selectedPlace.rush}</strong></div>
                <div><span>AR experience</span><strong>{selectedPlace.arExperience || 'Interactive place history and landscape guide'}</strong></div>
              </div>

              {selectedPlace.accessNote && <div className="access-alert">⚠️ {selectedPlace.accessNote}</div>}

              <div className="detail-description">
                <h3>About this place</h3>
                <p>{selectedPlace.description}</p>
              </div>

              <div className="location-inputs">
                <div className="location-field">
                  <label htmlFor="from-location">From location</label>
                  <select id="from-location" value={fromLocation} onChange={(event) => setFromLocation(event.target.value)} className="location-select">
                    <option value="">Select your location</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Ooty">Ooty</option>
                    <option value="Coonoor">Coonoor</option>
                  </select>
                </div>

                <div className="location-field">
                  <label htmlFor="to-location">Destination</label>
                  <input id="to-location" className="location-input" readOnly value={`${selectedPlace.name}, ${selectedPlace.taluk}, Nilgiris`} />
                </div>
              </div>

              {fromLocation ? (
                <div className="route-info">
                  <div className="route-card">
                    <div className="route-icon"><FaCar size={30} /></div>
                    <div className="route-details">
                      <h3>🚗 Driving route</h3>
                      <p><strong>Distance:</strong> {getDistance()}</p>
                      <p><strong>Estimated time:</strong> {getTravelTime()}</p>
                      <p className="route-note">Actual route, time, and traffic details will be shown by Google Maps.</p>
                    </div>
                  </div>

                  <div className="map-placeholder">
                    <FaSearchLocation size={55} color="#ffffff" />
                    <p>Ready for Google Maps navigation</p>
                  </div>

                  <div className="nearby-panel">
                    <h4>Nearby shops / chill-outs</h4>
                    <ul>
                      {(selectedPlace.nearby || []).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>

                  <div className="responsible-tourism-note">
                    <FaCheckCircle /> Travel responsibly: follow local guidance, avoid littering, and respect wildlife and community access rules.
                  </div>

                  <button type="button" className="start-navigation-btn" onClick={openGoogleMaps}>
                    <FaCompass /> Open Google Maps
                  </button>
                </div>
              ) : (
                <p className="select-note">👆 Choose your starting location to view the estimated route.</p>
              )}
            </div>
          </motion.section>
        )}
      </main>

      {earthPlace && (
        <div className="earth-view-backdrop">
          <section className="earth-view-dialog" role="dialog" aria-modal="true" aria-labelledby="earth-view-title">
            <header className="earth-view-header">
              <div className="earth-view-heading">
                {earthViewMode === 'streetview' ? <FaStreetView aria-hidden="true" /> : <FaGlobe aria-hidden="true" />}
                <div>
                  <h2 id="earth-view-title">{earthPlace.name}</h2>
                  <p>{earthPlace.taluk}, The Nilgiris, Tamil Nadu</p>
                </div>
              </div>
              <button
                type="button"
                className="earth-view-close"
                onClick={() => setEarthPlace(null)}
                aria-label="Close Google Earth view"
                title="Close"
              >
                <FaTimes />
              </button>
            </header>
            {earthViewMode === 'streetview' ? (
              streetViewMessage ? (
                <div className="earth-view-message" role="status">
                  <FaStreetView aria-hidden="true" />
                  <p>{streetViewMessage}</p>
                </div>
              ) : streetViewCoordinates ? (
                <iframe
                  title={`Google Street View panorama of ${earthPlace.name}`}
                  src={`https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(googleMapsEmbedApiKey)}&location=${encodeURIComponent(streetViewCoordinates)}&radius=1000&heading=0&pitch=0&fov=90`}
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="earth-view-message" role="status">Locating {earthPlace.name}...</div>
              )
            ) : (
              <iframe
                title={`Google Earth satellite map of ${earthPlace.name}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(`${earthPlace.name}, ${earthPlace.taluk}, The Nilgiris, Tamil Nadu, India`)}&t=k&z=15&output=embed`}
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default SmartTourism;
