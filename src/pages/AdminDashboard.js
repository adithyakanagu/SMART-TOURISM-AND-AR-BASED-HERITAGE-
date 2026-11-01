import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../data/api';
import { addBusinessEntry, addProduct, addTaxi, addTourismPlace, addUserForm, confirmOrderPayment, createHotelRecord, loadAppData, replyToInquiry, saveAppData } from '../data/store';
import { defaultHotelImages, defaultProductImages } from '../data/shoppingImages';
import CommunicationCenter from '../components/CommunicationCenter';
import { FaArrowLeft, FaBox, FaHotel, FaCar, FaEnvelope, FaCheckCircle, FaMapMarkerAlt, FaBuilding, FaReceipt, FaClipboardList, FaChartBar, FaCloudSun, FaEdit, FaTrash } from 'react-icons/fa';
import './AdminDashboard.css';

const climateLocations = [
  { id: 'all', name: 'All Nilgiris' },
  { id: 'ooty', name: 'Ooty (Udhagamandalam)' },
  { id: 'coonoor', name: 'Coonoor' },
  { id: 'kotagiri', name: 'Kotagiri' },
  { id: 'gudalur', name: 'Gudalur' },
  { id: 'pandalur', name: 'Pandalur' },
  { id: 'kundah', name: 'Kundah' }
];
const climateAdvisoryTypes = [
  { value: 'assessment', label: 'General safety assessment' },
  { value: 'heavy-rain', label: 'Heavy rainfall' },
  { value: 'thunderstorm', label: 'Thunderstorm' },
  { value: 'dense-fog', label: 'Dense fog' },
  { value: 'strong-winds', label: 'Strong winds' },
  { value: 'flooding', label: 'Flooding' },
  { value: 'landslide', label: 'Landslide' },
  { value: 'road-closure', label: 'Road closure' },
  { value: 'travel-advisory', label: 'Travel advisory' }
];

const toLocalDateTime = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const getClimateDraft = () => ({
  id: '',
  locationId: 'ooty',
  status: 'caution',
  type: 'travel-advisory',
  title: '',
  message: '',
  precautions: '',
  recommendedPeriod: '',
  sourceTitle: '',
  sourceUrl: '',
  expiresAt: toLocalDateTime(Date.now() + 6 * 60 * 60 * 1000),
  confirmedOfficial: false
});

const tabs = [
  { key: 'products', label: 'Products', icon: FaBox },
  { key: 'hotels', label: 'Hotels', icon: FaHotel },
  { key: 'taxis', label: 'Taxi', icon: FaCar },
  { key: 'tourism', label: 'Tourism', icon: FaMapMarkerAlt },
  { key: 'businesses', label: 'Businesses', icon: FaBuilding },
  { key: 'orders', label: 'Orders', icon: FaReceipt },
  { key: 'forms', label: 'User Forms', icon: FaClipboardList },
  { key: 'climate', label: 'Climate Safety', icon: FaCloudSun },
  { key: 'analytics', label: 'Analytics', icon: FaChartBar },
  { key: 'queries', label: 'Queries', icon: FaEnvelope },
  { key: 'mail', label: 'Mail', icon: FaEnvelope }
];

const emptyPlace = { name: '', district: 'Nilgiris', taluk: 'Ooty', type: 'Viewpoint', rush: 'Moderate', nearby: '', description: '' };
const emptyHotel = { name: '', city: 'Ooty', district: 'Nilgiris', taluk: 'Ooty', roomsAvailable: '', pricePerNight: '', available: true, contact: '', address: '', description: '', imageOverride: '' };
const emptyBusiness = { name: '', type: 'hotel', district: 'Nilgiris', taluk: 'Ooty', category: 'Stay', status: 'Open', contact: '' };
const emptyProduct = { name: '', category: 'Food & Beverages', price: '', mrp: '', tribe: 'Nilgiris Artisan', image: '', description: '', inStock: true };
const emptyTaxi = { name: '', pricePerTrip: '', available: true };
const emptyForm = { targetEmail: '', title: '', description: '', questions: '' };

async function compressImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.');

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare this image.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.8);
  } finally {
    bitmap.close();
  }
}

const adminTalukMapRegions = [
  { id: 'pandalur', name: 'Pandalur', className: 'region-pandalur' },
  { id: 'gudalur', name: 'Gudalur', className: 'region-gudalur' },
  { id: 'ooty', name: 'Ooty', className: 'region-ooty' },
  { id: 'kotagiri', name: 'Kotagiri', className: 'region-kotagiri' },
  { id: 'coonoor', name: 'Coonoor', className: 'region-coonoor' },
  { id: 'kundah', name: 'Kundah', className: 'region-kundah' }
];

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [data, setData] = useState(loadAppData());
  const [replyDrafts, setReplyDrafts] = useState({});
  const [messageError, setMessageError] = useState('');
  const [messageSuccess, setMessageSuccess] = useState('');
  const [formSending, setFormSending] = useState(false);
  const [replySendingId, setReplySendingId] = useState(null);
  const [newPlace, setNewPlace] = useState(emptyPlace);
  const [newHotel, setNewHotel] = useState(emptyHotel);
  const [hotelSaving, setHotelSaving] = useState(false);
  const [hotelError, setHotelError] = useState('');
  const [hotelSuccess, setHotelSuccess] = useState('');
  const [newBusiness, setNewBusiness] = useState(emptyBusiness);
  const [selectedAdminTaluk, setSelectedAdminTaluk] = useState('Ooty');
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [newTaxi, setNewTaxi] = useState(emptyTaxi);
  const [newForm, setNewForm] = useState(emptyForm);
  const [imageErrors, setImageErrors] = useState({});
  const [paymentActionId, setPaymentActionId] = useState(null);
  const [climateDraft, setClimateDraft] = useState(getClimateDraft);
  const [climateAdvisories, setClimateAdvisories] = useState([]);
  const [climateLoading, setClimateLoading] = useState(false);
  const [climateSaving, setClimateSaving] = useState(false);
  const [climateError, setClimateError] = useState('');
  const [climateMessage, setClimateMessage] = useState('');

  useEffect(() => {
    if (!user || user.email !== 'adithya01022007@gmail.com') {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    const syncAppData = () => setData(loadAppData());
    window.addEventListener('arSmartTourismDataUpdated', syncAppData);
    return () => window.removeEventListener('arSmartTourismDataUpdated', syncAppData);
  }, []);

  useEffect(() => {
    if (activeTab !== 'climate' || !token) return undefined;
    let active = true;
    const controller = new AbortController();
    setClimateLoading(true);
    setClimateError('');
    fetch(`${API_BASE_URL}/api/admin/climate-advisories`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'Could not load climate advisories.');
        return result;
      })
      .then((result) => {
        if (active) setClimateAdvisories(result.advisories || []);
      })
      .catch((error) => {
        if (active && error.name !== 'AbortError') setClimateError(error.message || 'Could not load climate advisories.');
      })
      .finally(() => {
        if (active) setClimateLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeTab, token]);

  const summary = useMemo(() => ({
    products: data.products.length,
    hotels: data.hotels.length,
    taxis: data.taxis.length,
    inquiries: data.inquiries.length,
    tourismSpots: data.tourismSpots?.length || 0,
    businesses: data.businesses?.length || 0,
    orders: data.orders?.length || 0
  }), [data]);

  const notificationCounts = useMemo(() => ({
    queries: (data.inquiries || []).filter((inquiry) => inquiry.status === 'Pending').length,
    forms: (data.forms || []).filter((form) => form.status !== 'Answered').length
  }), [data.inquiries, data.forms]);

  const analytics = useMemo(() => ({
    revenue: (data.orders || []).filter((order) => order.status === 'Confirmed').reduce((total, order) => total + Number(order.total || 0), 0),
    pendingQueries: (data.inquiries || []).filter((inquiry) => inquiry.status === 'Pending').length,
    unansweredForms: (data.forms || []).filter((form) => form.status !== 'Answered').length,
    availableHotels: (data.hotels || []).filter((hotel) => hotel.available).length,
    availableTaxis: (data.taxis || []).filter((taxi) => taxi.available).length,
    topProducts: Object.entries((data.orders || []).filter((order) => order.status === 'Confirmed').flatMap((order) => order.items || []).reduce((counts, item) => ({ ...counts, [item.name]: (counts[item.name] || 0) + Number(item.quantity || 0) }), {})).sort(([, first], [, second]) => second - first).slice(0, 5)
  }), [data]);

  const persist = (nextData) => {
    setData(nextData);
    saveAppData(nextData);
  };

  const updateProduct = (id, field, value) => {
    persist({
      ...data,
      products: data.products.map((product) =>
        product.id === id ? { ...product, [field]: field === 'price' || field === 'mrp' ? Number(value) : value } : product
      )
    });
  };

  const updateHotel = (id, field, value) => {
    persist({
      ...data,
      hotels: data.hotels.map((hotel) =>
        hotel.id === id ? { ...hotel, [field]: field === 'roomsAvailable' || field === 'pricePerNight' ? Number(value) : value } : hotel
      )
    });
  };

  const handleImageUpload = async (type, id, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const errorKey = `${type}-${id}`;
    setImageErrors((current) => ({ ...current, [errorKey]: '' }));

    try {
      const image = await compressImage(file);
      if (type === 'product') updateProduct(id, 'imageOverride', image);
      else updateHotel(id, 'imageOverride', image);
    } catch (error) {
      setImageErrors((current) => ({ ...current, [errorKey]: error.message || 'Could not load this image.' }));
    }
    event.target.value = '';
  };

  const handleNewProductImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageErrors((current) => ({ ...current, newProduct: '' }));
    try {
      const image = await compressImage(file);
      setNewProduct((current) => ({ ...current, image }));
    } catch (error) {
      setImageErrors((current) => ({ ...current, newProduct: error.message || 'Could not load this image.' }));
    }
    event.target.value = '';
  };

  const handleNewHotelImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageErrors((current) => ({ ...current, newHotel: '' }));
    try {
      const imageOverride = await compressImage(file);
      setNewHotel((current) => ({ ...current, imageOverride }));
    } catch (error) {
      setImageErrors((current) => ({ ...current, newHotel: error.message || 'Could not load this image.' }));
    }
    event.target.value = '';
  };

  const handleAddHotel = async (event) => {
    event.preventDefault();
    if (hotelSaving) return;
    setHotelSaving(true);
    setHotelError('');
    setHotelSuccess('');
    try {
      const result = await createHotelRecord({
        ...newHotel,
        roomsAvailable: Number(newHotel.roomsAvailable),
        pricePerNight: Number(newHotel.pricePerNight)
      });
      setData(result.data);
      setNewHotel(emptyHotel);
      setHotelSuccess('Hotel listing added.');
    } catch (error) {
      setHotelError(error.message || 'Could not add this hotel.');
    } finally {
      setHotelSaving(false);
    }
  };

  const updateTaxi = (id, field, value) => {
    persist({
      ...data,
      taxis: data.taxis.map((taxi) =>
        taxi.id === id ? { ...taxi, [field]: field === 'pricePerTrip' ? Number(value) : value } : taxi
      )
    });
  };

  const deleteHotel = (id) => {
    if (!window.confirm('Delete this hotel from the user booking list?')) return;
    persist({ ...data, hotels: data.hotels.filter((hotel) => hotel.id !== id) });
  };

  const deleteTaxi = (id) => {
    if (!window.confirm('Delete this taxi from the user booking list?')) return;
    persist({ ...data, taxis: data.taxis.filter((taxi) => taxi.id !== id) });
  };

  const updateTourismSpot = (id, field, value) => {
    persist({
      ...data,
      tourismSpots: (data.tourismSpots || []).map((spot) =>
        spot.id === id ? { ...spot, [field]: value } : spot
      )
    });
  };

  const updateBusiness = (id, field, value) => {
    persist({
      ...data,
      businesses: (data.businesses || []).map((business) =>
        business.id === id ? { ...business, [field]: value } : business
      )
    });
  };

  const handleAddPlace = (event) => {
    event.preventDefault();
    if (!newPlace.name.trim()) return;
    const placeData = {
      ...newPlace,
      taluk: selectedAdminTaluk,
      nearby: (newPlace.nearby || '').split(',').map((item) => item.trim()).filter(Boolean)
    };
    addTourismPlace(placeData);
    setData(loadAppData());
    setNewPlace(emptyPlace);
    setSelectedAdminTaluk('Ooty');
  };

  const handleAddBusiness = (event) => {
    event.preventDefault();
    if (!newBusiness.name.trim()) return;
    addBusinessEntry(newBusiness);
    setData(loadAppData());
    setNewBusiness(emptyBusiness);
  };

  const handleAddProduct = (event) => {
    event.preventDefault();
    if (!newProduct.name.trim() || !newProduct.price) return;
    addProduct(newProduct);
    setData(loadAppData());
    setNewProduct(emptyProduct);
  };

  const handleAddTaxi = (event) => {
    event.preventDefault();
    const name = newTaxi.name.trim();
    const pricePerTrip = Number(newTaxi.pricePerTrip);
    if (!name || !Number.isFinite(pricePerTrip) || pricePerTrip < 0) return;

    addTaxi({ ...newTaxi, name, pricePerTrip });
    setData(loadAppData());
    setNewTaxi(emptyTaxi);
  };

  const handleSendForm = async (event) => {
    event.preventDefault();
    const questions = newForm.questions.split('\n').map((text, index) => ({ id: index + 1, text: text.trim() })).filter((question) => question.text);
    if (!newForm.targetEmail.trim() || !newForm.title.trim() || !questions.length) return;
    if (formSending) return;
    setFormSending(true);
    setMessageError('');
    setMessageSuccess('');
    try {
      const result = await addUserForm({ ...newForm, questions });
      setData(result.data);
      setNewForm(emptyForm);
      setMessageSuccess('Questionnaire sent. The user will see it in their app notifications.');
    } catch (error) {
      setMessageError(error.message || 'Could not send this questionnaire.');
    } finally {
      setFormSending(false);
    }
  };

  const handleConfirmOrderPayment = async (orderId) => {
    if (!window.confirm('Confirm that this UPI payment has been received, then generate and email the bill?')) return;
    setPaymentActionId(orderId);
    try {
      const result = await confirmOrderPayment(orderId);
      setData(result.data);
      window.alert(result.message);
    } catch (error) {
      window.alert(error.message || 'Could not confirm this payment.');
    } finally {
      setPaymentActionId(null);
    }
  };

  const saveClimateAdvisory = async (event) => {
    event.preventDefault();
    setClimateSaving(true);
    setClimateError('');
    setClimateMessage('');
    try {
      const { id, ...draft } = climateDraft;
      const response = await fetch(`${API_BASE_URL}/api/admin/climate-advisories${id ? `/${encodeURIComponent(id)}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...draft,
          expiresAt: new Date(draft.expiresAt).toISOString()
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Could not save this advisory.');
      setClimateAdvisories(result.advisories || []);
      setClimateDraft(getClimateDraft());
      setClimateMessage(id ? 'Climate advisory updated and published.' : 'Climate advisory published.');
    } catch (error) {
      setClimateError(error.message || 'Could not save this advisory.');
    } finally {
      setClimateSaving(false);
    }
  };

  const editClimateAdvisory = (advisory) => {
    setClimateDraft({
      ...advisory,
      expiresAt: toLocalDateTime(advisory.expiresAt),
      confirmedOfficial: false
    });
    setClimateError('');
    setClimateMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteClimateAdvisory = async (advisory) => {
    if (!window.confirm(`Remove "${advisory.title}" from current travel advisories?`)) return;
    setClimateError('');
    setClimateMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/climate-advisories/${encodeURIComponent(advisory.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Could not remove this advisory.');
      setClimateAdvisories(result.advisories || []);
      setClimateMessage('Climate advisory removed.');
    } catch (error) {
      setClimateError(error.message || 'Could not remove this advisory.');
    }
  };

  const updateInquiryStatus = (id, status) => {
    persist({
      ...data,
      inquiries: data.inquiries.map((inquiry) => inquiry.id === id ? { ...inquiry, status } : inquiry)
    });
  };

  const handleReply = async (inquiryId) => {
    const reply = (replyDrafts[inquiryId] || '').trim();
    if (!reply || replySendingId !== null) return;
    setReplySendingId(inquiryId);
    setMessageError('');
    setMessageSuccess('');
    try {
      const result = await replyToInquiry(inquiryId, reply, 'Replied');
      setReplyDrafts((previous) => ({ ...previous, [inquiryId]: '' }));
      setData(result.data);
      setMessageSuccess('Reply sent. The user will see it in their app notifications.');
    } catch (error) {
      setMessageError(error.message || 'Could not send this reply.');
    } finally {
      setReplySendingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-dashboard-container">
      <header className="admin-header">
        <div className="admin-header-left">
          <button className="admin-back-btn" onClick={() => navigate('/')}>
            <FaArrowLeft /> User View
          </button>
          <div>
            <p className="admin-label">Admin Portal</p>
            <h1>Nilgiris Operations Center</h1>
          </div>
        </div>

        <div className="admin-header-right">
          <span className="admin-user"><strong>{user?.email}</strong></span>
          <button className="admin-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="admin-main">
        <section className="admin-summary-grid">
          <div className="summary-card green">
            <span>Products</span>
            <strong>{summary.products}</strong>
          </div>
          <div className="summary-card blue">
            <span>Hotels</span>
            <strong>{summary.hotels}</strong>
          </div>
          <div className="summary-card gold">
            <span>Taxis</span>
            <strong>{summary.taxis}</strong>
          </div>
          <div className="summary-card purple">
            <span>Queries</span>
            <strong>{summary.inquiries}</strong>
          </div>
          <div className="summary-card orange">
            <span>Tourism</span>
            <strong>{summary.tourismSpots}</strong>
          </div>
          <div className="summary-card teal">
            <span>Businesses</span>
            <strong>{summary.businesses}</strong>
          </div>
          <div className="summary-card pink">
            <span>Orders</span>
            <strong>{summary.orders}</strong>
          </div>
        </section>

        <nav className="admin-tabs">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={activeTab === key ? 'admin-tab active' : 'admin-tab'}
              onClick={() => setActiveTab(key)}
            >
              <Icon /> {label}
              {notificationCounts[key] > 0 && <span className="admin-tab-count" aria-label={`${notificationCounts[key]} awaiting attention`}>{notificationCounts[key]}</span>}
            </button>
          ))}
        </nav>

        {activeTab === 'climate' && (
          <section className="admin-panel">
            <h2>Climate Safety & Travel Advisories</h2>
            <p className="admin-help-text">Publish verified, source-linked travel information. Forecast data is retrieved automatically and cannot be edited here; a missing advisory does not mean there are no official warnings.</p>
            {climateError && <p className="climate-admin-feedback error" role="alert">{climateError}</p>}
            {climateMessage && <p className="climate-admin-feedback success" role="status">{climateMessage}</p>}
            <form className="admin-form climate-admin-form" onSubmit={saveClimateAdvisory}>
              <label>
                Destination
                <select required value={climateDraft.locationId} onChange={(event) => setClimateDraft({ ...climateDraft, locationId: event.target.value })}>
                  {climateLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </label>
              <label>
                Assessment
                <select required value={climateDraft.status} onChange={(event) => setClimateDraft({ ...climateDraft, status: event.target.value })}>
                  <option value="safe">Safe to visit</option>
                  <option value="caution">Caution</option>
                  <option value="not-recommended">Not recommended</option>
                </select>
              </label>
              <label>
                Advisory type
                <select required value={climateDraft.type} onChange={(event) => setClimateDraft({ ...climateDraft, type: event.target.value })}>
                  {climateAdvisoryTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label>
                Title
                <input required maxLength="120" value={climateDraft.title} onChange={(event) => setClimateDraft({ ...climateDraft, title: event.target.value })} placeholder="e.g. Temporary road closure near destination" />
              </label>
              <label className="climate-admin-wide">
                Advisory details
                <textarea required maxLength="1000" value={climateDraft.message} onChange={(event) => setClimateDraft({ ...climateDraft, message: event.target.value })} placeholder="Describe the verified warning or assessment" />
              </label>
              <label className="climate-admin-wide">
                Precautions
                <textarea maxLength="1000" value={climateDraft.precautions} onChange={(event) => setClimateDraft({ ...climateDraft, precautions: event.target.value })} placeholder="Recommended actions for visitors" />
              </label>
              <label>
                Recommended visiting period (optional)
                <input maxLength="120" value={climateDraft.recommendedPeriod} onChange={(event) => setClimateDraft({ ...climateDraft, recommendedPeriod: event.target.value })} placeholder="e.g. October to March" />
              </label>
              <label>
                Source name
                <input required maxLength="120" value={climateDraft.sourceTitle} onChange={(event) => setClimateDraft({ ...climateDraft, sourceTitle: event.target.value })} placeholder="e.g. Nilgiris District Administration" />
              </label>
              <label className="climate-admin-wide">
                Official source URL (.gov.in or .nic.in)
                <input required type="url" value={climateDraft.sourceUrl} onChange={(event) => setClimateDraft({ ...climateDraft, sourceUrl: event.target.value })} placeholder="https://..." />
              </label>
              <label>
                Expires at
                <input required type="datetime-local" value={climateDraft.expiresAt} onChange={(event) => setClimateDraft({ ...climateDraft, expiresAt: event.target.value })} />
              </label>
              <label className="form-checkbox climate-admin-confirm climate-admin-wide">
                <input required type="checkbox" checked={climateDraft.confirmedOfficial} onChange={(event) => setClimateDraft({ ...climateDraft, confirmedOfficial: event.target.checked })} />
                I verified this information against the linked official source and confirm it is current.
              </label>
              <div className="climate-admin-actions climate-admin-wide">
                <button type="submit" className="admin-submit-btn" disabled={climateSaving}>
                  {climateSaving ? 'Saving…' : climateDraft.id ? 'Update & publish advisory' : 'Publish advisory'}
                </button>
                {climateDraft.id && <button type="button" className="climate-admin-cancel" onClick={() => setClimateDraft(getClimateDraft())}>Cancel edit</button>}
              </div>
            </form>

            <div className="climate-admin-list">
              <h3>Published advisories</h3>
              {climateLoading ? <p>Loading advisories…</p> : climateAdvisories.length === 0 ? <p>No advisories have been published.</p> : climateAdvisories.map((advisory) => {
                const expired = Date.parse(advisory.expiresAt) <= Date.now();
                return (
                  <article className="climate-admin-item" key={advisory.id}>
                    <div className="climate-admin-item-copy">
                      <strong>{advisory.title}</strong>
                      <span>{climateLocations.find((location) => location.id === advisory.locationId)?.name || advisory.locationId} · {advisory.status.replace('-', ' ')} · {expired ? 'Expired' : 'Expires'} {new Date(advisory.expiresAt).toLocaleString()}</span>
                      <span>Updated {new Date(advisory.publishedAt).toLocaleString()} · Source: {advisory.sourceTitle}</span>
                    </div>
                    <div className="climate-admin-item-actions">
                      <button type="button" onClick={() => editClimateAdvisory(advisory)} aria-label={`Edit ${advisory.title}`}><FaEdit /> Edit</button>
                      <button type="button" onClick={() => deleteClimateAdvisory(advisory)} aria-label={`Remove ${advisory.title}`}><FaTrash /> Remove</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'mail' && <CommunicationCenter isAdmin />}

        {activeTab === 'analytics' && (
          <section className="admin-panel">
            <h2>Operations Analytics</h2>
            <div className="analytics-grid">
              <div className="analytics-card"><span>Paid order value</span><strong>₹{analytics.revenue.toLocaleString()}</strong></div>
              <div className="analytics-card"><span>Pending queries</span><strong>{analytics.pendingQueries}</strong></div>
              <div className="analytics-card"><span>Unanswered forms</span><strong>{analytics.unansweredForms}</strong></div>
              <div className="analytics-card"><span>Available stays</span><strong>{analytics.availableHotels}</strong></div>
              <div className="analytics-card"><span>Available taxis</span><strong>{analytics.availableTaxis}</strong></div>
            </div>
            <div className="analytics-list">
              <h3>Popular products</h3>
              {analytics.topProducts.length === 0 ? <p>No product orders yet.</p> : analytics.topProducts.map(([name, quantity]) => <div key={name}><span>{name}</span><strong>{quantity} sold</strong></div>)}
            </div>
          </section>
        )}

        {activeTab === 'products' && (
          <section className="admin-panel">
            <h2>Product Pricing & Availability</h2>
            <form className="admin-form product-create-form" onSubmit={handleAddProduct}>
              <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Product name" />
              <input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} placeholder="Category" />
              <input type="number" min="0" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="Selling price" />
              <input type="number" min="0" value={newProduct.mrp} onChange={(e) => setNewProduct({ ...newProduct, mrp: e.target.value })} placeholder="MRP" />
              <input value={newProduct.tribe} onChange={(e) => setNewProduct({ ...newProduct, tribe: e.target.value })} placeholder="Artisan / tribe" />
              <input value={newProduct.image} onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })} placeholder="Image URL (optional)" />
              <label className="admin-image-upload">
                Upload product image
                <input type="file" accept="image/*" onChange={handleNewProductImageUpload} />
              </label>
              {newProduct.image && <img className="admin-new-image-preview" src={newProduct.image} alt={`${newProduct.name || 'New product'} preview`} />}
              {imageErrors.newProduct && <p className="admin-image-error" role="alert">{imageErrors.newProduct}</p>}
              <textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Product description" />
              <label className="form-checkbox">
                <input type="checkbox" checked={newProduct.inStock} onChange={(e) => setNewProduct({ ...newProduct, inStock: e.target.checked })} />
                Available to users
              </label>
              <button type="submit" className="admin-submit-btn">Add Product</button>
            </form>
            <div className="admin-list-grid">
              {data.products.map((product) => (
                <div key={product.id} className="admin-card">
                  <div className="admin-card-header">
                    <strong>{product.name}</strong>
                    <label className="toggle-wrap">
                      <input
                        type="checkbox"
                        checked={product.inStock}
                        onChange={(e) => updateProduct(product.id, 'inStock', e.target.checked)}
                      />
                      <span>In stock</span>
                    </label>
                  </div>

                  <div className="admin-field-row">
                    <label>
                      Price
                      <input type="number" value={product.price} onChange={(e) => updateProduct(product.id, 'price', e.target.value)} />
                    </label>
                    <label>
                      MRP
                      <input type="number" value={product.mrp} onChange={(e) => updateProduct(product.id, 'mrp', e.target.value)} />
                    </label>
                  </div>

                  <label>
                    Category
                    <input type="text" value={product.category} onChange={(e) => updateProduct(product.id, 'category', e.target.value)} />
                  </label>

                  <div className="admin-image-editor">
                    <img
                      className="admin-image-preview"
                      src={product.imageOverride || defaultProductImages[product.name] || product.image}
                      alt={`${product.name} preview`}
                    />
                    <label>
                      Image URL
                      <input
                        type="url"
                        value={product.imageOverride && !product.imageOverride.startsWith('data:') ? product.imageOverride : ''}
                        onChange={(e) => updateProduct(product.id, 'imageOverride', e.target.value)}
                        placeholder="Paste an image URL"
                      />
                    </label>
                    <label className="admin-image-upload">
                      Upload new image
                      <input type="file" accept="image/*" onChange={(event) => handleImageUpload('product', product.id, event)} />
                    </label>
                    <button type="button" className="admin-image-reset" onClick={() => updateProduct(product.id, 'imageOverride', '')}>
                      Use default image
                    </button>
                    {imageErrors[`product-${product.id}`] && <p className="admin-image-error" role="alert">{imageErrors[`product-${product.id}`]}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'hotels' && (
          <section className="admin-panel">
            <h2>Hotel Listings & Availability</h2>
            {hotelError && <p className="climate-admin-feedback error" role="alert">{hotelError}</p>}
            {hotelSuccess && <p className="climate-admin-feedback success" role="status">{hotelSuccess}</p>}
            <form className="admin-form hotel-create-form" onSubmit={handleAddHotel}>
              <input value={newHotel.name} onChange={(event) => setNewHotel({ ...newHotel, name: event.target.value })} placeholder="Hotel name" required />
              <input value={newHotel.city} onChange={(event) => setNewHotel({ ...newHotel, city: event.target.value })} placeholder="City" required />
              <input value={newHotel.taluk} onChange={(event) => setNewHotel({ ...newHotel, taluk: event.target.value })} placeholder="Taluk" />
              <input value={newHotel.contact} onChange={(event) => setNewHotel({ ...newHotel, contact: event.target.value })} placeholder="Contact phone (optional)" inputMode="tel" />
              <input value={newHotel.address} onChange={(event) => setNewHotel({ ...newHotel, address: event.target.value })} placeholder="Address (optional)" />
              <div className="admin-field-row">
                <label>
                  Rooms available
                  <input type="number" min="0" max="500" value={newHotel.roomsAvailable} onChange={(event) => setNewHotel({ ...newHotel, roomsAvailable: event.target.value })} required />
                </label>
                <label>
                  Price/night (₹)
                  <input type="number" min="0" max="500000" value={newHotel.pricePerNight} onChange={(event) => setNewHotel({ ...newHotel, pricePerNight: event.target.value })} required />
                </label>
              </div>
              <textarea value={newHotel.description} onChange={(event) => setNewHotel({ ...newHotel, description: event.target.value })} placeholder="Hotel description (optional)" />
              <label>
                Hotel image URL (optional)
                <input type="url" value={newHotel.imageOverride && !newHotel.imageOverride.startsWith('data:') ? newHotel.imageOverride : ''} onChange={(event) => setNewHotel({ ...newHotel, imageOverride: event.target.value })} placeholder="https://…" />
              </label>
              <label className="admin-image-upload">
                Upload hotel photo
                <input type="file" accept="image/*" onChange={handleNewHotelImageUpload} />
              </label>
              {newHotel.imageOverride && <img className="admin-image-preview" src={newHotel.imageOverride} alt="New hotel preview" />}
              {imageErrors.newHotel && <p className="admin-image-error" role="alert">{imageErrors.newHotel}</p>}
              <button type="submit" className="admin-submit-btn" disabled={hotelSaving}>{hotelSaving ? 'Adding hotel…' : 'Add Hotel'}</button>
            </form>

            <h3>Current hotels</h3>
            <div className="admin-list-grid">
              {data.hotels.map((hotel) => (
                <div key={hotel.id} className="admin-card">
                  <div className="admin-card-header">
                    <strong>{hotel.name}</strong>
                    <label className="toggle-wrap">
                      <input
                        type="checkbox"
                        checked={hotel.available}
                        onChange={(e) => updateHotel(hotel.id, 'available', e.target.checked)}
                      />
                      <span>{hotel.available ? 'Available' : 'Closed'}</span>
                    </label>
                  </div>

                  <div className="admin-field-row">
                    <label>
                      Rooms available
                      <input type="number" value={hotel.roomsAvailable} onChange={(e) => updateHotel(hotel.id, 'roomsAvailable', e.target.value)} />
                    </label>
                    <label>
                      Price/night
                      <input type="number" value={hotel.pricePerNight} onChange={(e) => updateHotel(hotel.id, 'pricePerNight', e.target.value)} />
                    </label>
                  </div>

                  <label>
                    City
                    <input type="text" value={hotel.city} onChange={(e) => updateHotel(hotel.id, 'city', e.target.value)} />
                  </label>
                  <label>
                    Contact phone
                    <input type="tel" value={hotel.contact || ''} onChange={(e) => updateHotel(hotel.id, 'contact', e.target.value)} />
                  </label>
                  <label>
                    Address
                    <input type="text" value={hotel.address || ''} onChange={(e) => updateHotel(hotel.id, 'address', e.target.value)} />
                  </label>
                  <label>
                    Description
                    <textarea rows="2" value={hotel.description || ''} onChange={(e) => updateHotel(hotel.id, 'description', e.target.value)} />
                  </label>

                  <div className="admin-image-editor">
                    <img
                      className="admin-image-preview"
                      src={hotel.imageOverride || defaultHotelImages[hotel.name] || hotel.image || `${process.env.PUBLIC_URL}/shopping/hill-crest-residency.webp`}
                      alt={`${hotel.name} preview`}
                    />
                    <label>
                      Image URL
                      <input
                        type="url"
                        value={hotel.imageOverride && !hotel.imageOverride.startsWith('data:') ? hotel.imageOverride : ''}
                        onChange={(e) => updateHotel(hotel.id, 'imageOverride', e.target.value)}
                        placeholder="Paste an image URL"
                      />
                    </label>
                    <label className="admin-image-upload">
                      Upload new image
                      <input type="file" accept="image/*" onChange={(event) => handleImageUpload('hotel', hotel.id, event)} />
                    </label>
                    <button type="button" className="admin-image-reset" onClick={() => updateHotel(hotel.id, 'imageOverride', '')}>
                      Use default image
                    </button>
                    {imageErrors[`hotel-${hotel.id}`] && <p className="admin-image-error" role="alert">{imageErrors[`hotel-${hotel.id}`]}</p>}
                  </div>

                  <button type="button" className="delete-record-btn" onClick={() => deleteHotel(hotel.id)}>
                    Delete Hotel
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'taxis' && (
          <section className="admin-panel">
            <h2>Taxi Availability & Pricing</h2>
            <form className="admin-form taxi-create-form" onSubmit={handleAddTaxi}>
              <input
                value={newTaxi.name}
                onChange={(event) => setNewTaxi({ ...newTaxi, name: event.target.value })}
                placeholder="Taxi name (e.g. Sedan)"
                aria-label="Taxi name"
                required
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={newTaxi.pricePerTrip}
                onChange={(event) => setNewTaxi({ ...newTaxi, pricePerTrip: event.target.value })}
                placeholder="Price per trip"
                aria-label="Price per trip"
                required
              />
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={newTaxi.available}
                  onChange={(event) => setNewTaxi({ ...newTaxi, available: event.target.checked })}
                />
                Available to users
              </label>
              <button type="submit" className="admin-submit-btn">Add Taxi</button>
            </form>
            <div className="admin-list-grid">
              {data.taxis.map((taxi) => (
                <div key={taxi.id} className="admin-card">
                  <div className="admin-card-header">
                    <strong>{taxi.name}</strong>
                    <label className="toggle-wrap">
                      <input
                        type="checkbox"
                        checked={taxi.available}
                        onChange={(e) => updateTaxi(taxi.id, 'available', e.target.checked)}
                      />
                      <span>{taxi.available ? 'Available' : 'Booked Out'}</span>
                    </label>
                  </div>

                  <label>
                    Price per trip
                    <input type="number" value={taxi.pricePerTrip} onChange={(e) => updateTaxi(taxi.id, 'pricePerTrip', e.target.value)} />
                  </label>

                  <button type="button" className="delete-record-btn" onClick={() => deleteTaxi(taxi.id)}>
                    Delete Taxi
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'queries' && (
          <section className="admin-panel">
            <h2>User Orders & Queries</h2>
            {messageError && <p className="message-feedback error" role="alert">{messageError}</p>}
            {messageSuccess && <p className="message-feedback success" role="status">{messageSuccess}</p>}
            <div className="inquiry-list">
              {data.inquiries.map((inquiry) => (
                <div key={inquiry.id} className="inquiry-card">
                  <div className="inquiry-head">
                    <div>
                      <strong>{inquiry.subject}</strong>
                      <p>{inquiry.userEmail}</p>
                    </div>
                    <span className={`status status-${inquiry.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {inquiry.status}
                    </span>
                  </div>

                  <p className="inquiry-message">{inquiry.message}</p>

                  {inquiry.reply && (
                    <div className="admin-reply-box">
                      <strong>Admin reply:</strong>
                      <p>{inquiry.reply}</p>
                    </div>
                  )}

                  <div className="reply-box">
                    <textarea
                      rows="3"
                      value={replyDrafts[inquiry.id] || ''}
                      onChange={(event) =>
                        setReplyDrafts((previous) => ({
                          ...previous,
                          [inquiry.id]: event.target.value
                        }))
                      }
                      placeholder="Write a reply to the user..."
                    />
                  </div>

                  <div className="inquiry-actions">
                    <button className="status-btn" onClick={() => updateInquiryStatus(inquiry.id, 'Pending')}>Pending</button>
                    <button className="status-btn" onClick={() => updateInquiryStatus(inquiry.id, 'In Review')}>In Review</button>
                    <button className="status-btn success" onClick={() => updateInquiryStatus(inquiry.id, 'Resolved')}>
                      <FaCheckCircle /> Resolved
                    </button>
                    <button className="status-btn reply" disabled={replySendingId !== null} onClick={() => handleReply(inquiry.id)}>
                      {replySendingId === inquiry.id ? 'Sending…' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'tourism' && (
          <section className="admin-panel">
            <h2>Tourism Spots & Rush Updates</h2>
            <p className="admin-help-text">Select the taluk directly from the Nilgiris map before adding or updating tourism information.</p>
            <div className="admin-map-wrapper">
              <img src={`${process.env.PUBLIC_URL}/nilgiris-taluks-map.jpg`} alt="Map of the six Nilgiris taluks" className="admin-map-image" />
              {adminTalukMapRegions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  className={`admin-map-region ${region.className} ${selectedAdminTaluk === region.name ? 'selected' : ''}`}
                  onClick={() => setSelectedAdminTaluk(region.name)}
                  title={`Manage ${region.name} taluk`}
                  aria-label={`Manage ${region.name} taluk`}
                >
                  <span>{region.name}</span>
                </button>
              ))}
            </div>
            <div className="admin-map-legend">
              {adminTalukMapRegions.map((region) => (
                <button key={region.id} type="button" onClick={() => setSelectedAdminTaluk(region.name)}>
                  <span />{region.name}
                </button>
              ))}
            </div>
            <form className="admin-form" onSubmit={handleAddPlace}>
              <input value={newPlace.name} onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })} placeholder="Place name" />
              <input value={newPlace.district} onChange={(e) => setNewPlace({ ...newPlace, district: e.target.value })} placeholder="District" />
              <input value={selectedAdminTaluk} readOnly placeholder="Taluk selected on map" />
              <input value={newPlace.type} onChange={(e) => setNewPlace({ ...newPlace, type: e.target.value })} placeholder="Type" />
              <select value={newPlace.rush} onChange={(e) => setNewPlace({ ...newPlace, rush: e.target.value })}>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
              <textarea value={newPlace.nearby} onChange={(e) => setNewPlace({ ...newPlace, nearby: e.target.value })} placeholder="Nearby places, separated by commas" />
              <textarea value={newPlace.description} onChange={(e) => setNewPlace({ ...newPlace, description: e.target.value })} placeholder="Short description" />
              <input value={newPlace.bestSeason || ''} onChange={(e) => setNewPlace({ ...newPlace, bestSeason: e.target.value })} placeholder="Best season (verified details only)" />
              <input value={newPlace.bestTime || ''} onChange={(e) => setNewPlace({ ...newPlace, bestTime: e.target.value })} placeholder="Best time to visit (optional)" />
              <input value={newPlace.ticketPrice || ''} onChange={(e) => setNewPlace({ ...newPlace, ticketPrice: e.target.value })} placeholder="Ticket price (optional; leave blank if unknown)" />
              <button type="submit" className="admin-submit-btn">Add Tourism Spot</button>
            </form>

            <div className="admin-list-grid">
              {(data.tourismSpots || []).map((spot) => (
                <div key={spot.id} className="admin-card stretch-card">
                  <div className="admin-card-header"><strong>{spot.name}</strong></div>
                  <label>
                    Name
                    <input type="text" value={spot.name} onChange={(e) => updateTourismSpot(spot.id, 'name', e.target.value)} />
                  </label>
                  <div className="admin-field-row">
                    <label>
                      District
                      <input type="text" value={spot.district} onChange={(e) => updateTourismSpot(spot.id, 'district', e.target.value)} />
                    </label>
                    <label>
                      Taluk
                      <input type="text" value={spot.taluk} onChange={(e) => updateTourismSpot(spot.id, 'taluk', e.target.value)} />
                    </label>
                  </div>
                  <div className="admin-field-row">
                    <label>
                      Type
                      <input type="text" value={spot.type} onChange={(e) => updateTourismSpot(spot.id, 'type', e.target.value)} />
                    </label>
                    <label>
                      Rush
                      <select value={spot.rush} onChange={(e) => updateTourismSpot(spot.id, 'rush', e.target.value)}>
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Nearby
                    <input type="text" value={(spot.nearby || []).join(', ')} onChange={(e) => updateTourismSpot(spot.id, 'nearby', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))} />
                  </label>
                  <label>
                    Description
                    <textarea rows="3" value={spot.description} onChange={(e) => updateTourismSpot(spot.id, 'description', e.target.value)} />
                  </label>
                  <label>
                    Best season
                    <input type="text" value={spot.bestSeason || ''} onChange={(e) => updateTourismSpot(spot.id, 'bestSeason', e.target.value)} placeholder="Not listed" />
                  </label>
                  <label>
                    Best time to visit
                    <input type="text" value={spot.bestTime || ''} onChange={(e) => updateTourismSpot(spot.id, 'bestTime', e.target.value)} placeholder="Not listed" />
                  </label>
                  <label>
                    Ticket price
                    <input type="text" value={spot.ticketPrice || ''} onChange={(e) => updateTourismSpot(spot.id, 'ticketPrice', e.target.value)} placeholder="Leave blank if unknown" />
                  </label>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'businesses' && (
          <section className="admin-panel">
            <h2>Hotels, Factories & Stores</h2>
            <form className="admin-form" onSubmit={handleAddBusiness}>
              <input value={newBusiness.name} onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })} placeholder="Business name" />
              <select value={newBusiness.type} onChange={(e) => setNewBusiness({ ...newBusiness, type: e.target.value })}>
                <option value="hotel">Hotel</option>
                <option value="factory">Factory</option>
                <option value="store">Store</option>
              </select>
              <input value={newBusiness.district} onChange={(e) => setNewBusiness({ ...newBusiness, district: e.target.value })} placeholder="District" />
              <input value={newBusiness.taluk} onChange={(e) => setNewBusiness({ ...newBusiness, taluk: e.target.value })} placeholder="Taluk" />
              <input value={newBusiness.category} onChange={(e) => setNewBusiness({ ...newBusiness, category: e.target.value })} placeholder="Category" />
              <select value={newBusiness.status} onChange={(e) => setNewBusiness({ ...newBusiness, status: e.target.value })}>
                <option value="Open">Open</option>
                <option value="Available">Available</option>
                <option value="Closed">Closed</option>
              </select>
              <input value={newBusiness.contact} onChange={(e) => setNewBusiness({ ...newBusiness, contact: e.target.value })} placeholder="Contact number" />
              <button type="submit" className="admin-submit-btn">Add Business</button>
            </form>

            <div className="admin-list-grid">
              {(data.businesses || []).map((business) => (
                <div key={business.id} className="admin-card">
                  <div className="admin-card-header"><strong>{business.name}</strong></div>
                  <label>
                    Type
                    <select value={business.type} onChange={(e) => updateBusiness(business.id, 'type', e.target.value)}>
                      <option value="hotel">Hotel</option>
                      <option value="factory">Factory</option>
                      <option value="store">Store</option>
                    </select>
                  </label>
                  <div className="admin-field-row">
                    <label>
                      District
                      <input type="text" value={business.district} onChange={(e) => updateBusiness(business.id, 'district', e.target.value)} />
                    </label>
                    <label>
                      Taluk
                      <input type="text" value={business.taluk} onChange={(e) => updateBusiness(business.id, 'taluk', e.target.value)} />
                    </label>
                  </div>
                  <label>
                    Category
                    <input type="text" value={business.category} onChange={(e) => updateBusiness(business.id, 'category', e.target.value)} />
                  </label>
                  <div className="admin-field-row">
                    <label>
                      Status
                      <select value={business.status} onChange={(e) => updateBusiness(business.id, 'status', e.target.value)}>
                        <option value="Open">Open</option>
                        <option value="Available">Available</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </label>
                    <label>
                      Contact
                      <input type="text" value={business.contact} onChange={(e) => updateBusiness(business.id, 'contact', e.target.value)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'orders' && (
          <section className="admin-panel">
            <h2>Order & Payment Records</h2>
            <div className="admin-list-grid">
              {(data.orders || []).map((order) => (
                <div key={order.id} className="admin-card order-card">
                  <div className="admin-card-header">
                    <strong>{order.billNumber || `Order ${order.id}`}</strong>
                    <span className={`status ${order.status === 'Payment Verification Pending' ? 'status-pending' : 'status-confirmed'}`}>{order.status}</span>
                  </div>
                  <p><strong>User:</strong> {order.userEmail}</p>
                  <p><strong>Payment:</strong> {order.paymentMethod}</p>
                  {order.paymentReference && <p><strong>UPI Reference:</strong> {order.paymentReference}</p>}
                  <p><strong>Address:</strong> {order.address}</p>
                  <ul>
                    {(order.items || []).map((item, index) => (
                      <li key={`${order.id}-${index}`}>{item.name} × {item.quantity} = ₹{(item.price * item.quantity).toLocaleString()}</li>
                    ))}
                  </ul>
                  <p className="total-line"><strong>Total:</strong> ₹{Number(order.total || 0).toLocaleString()}</p>
                  {order.status === 'Payment Verification Pending' && (
                    <button
                      type="button"
                      className="admin-submit-btn"
                      disabled={paymentActionId === order.id}
                      onClick={() => handleConfirmOrderPayment(order.id)}
                    >
                      {paymentActionId === order.id ? 'Processing…' : 'Verify payment & email bill'}
                    </button>
                  )}
                  {order.status === 'Confirmed' && order.billEmailSentAt && (
                    <p className="admin-help-text">Bill emailed {new Date(order.billEmailSentAt).toLocaleString()}</p>
                  )}
                  {order.status === 'Confirmed' && order.paymentVerifiedAt && order.billNumber && !order.billEmailSentAt && (
                    <button
                      type="button"
                      className="admin-submit-btn"
                      disabled={paymentActionId === order.id}
                      onClick={() => handleConfirmOrderPayment(order.id)}
                    >
                      {paymentActionId === order.id ? 'Processing…' : 'Retry bill email'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'forms' && (
          <section className="admin-panel">
            <h2>Send Questionnaire to a User</h2>
            <p className="admin-help-text">Create your own questions, one question per line. The selected user will receive them in Notifications.</p>
            {messageError && <p className="message-feedback error" role="alert">{messageError}</p>}
            {messageSuccess && <p className="message-feedback success" role="status">{messageSuccess}</p>}
            <form className="admin-form form-create-form" onSubmit={handleSendForm}>
              <input type="email" required value={newForm.targetEmail} onChange={(e) => setNewForm({ ...newForm, targetEmail: e.target.value })} placeholder="Specific user email" />
              <input required maxLength="120" value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="Form title" />
              <textarea value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} placeholder="Message for the user" />
              <textarea required rows="6" value={newForm.questions} onChange={(e) => setNewForm({ ...newForm, questions: e.target.value })} placeholder={'Question 1\nQuestion 2\nQuestion 3'} />
              <button type="submit" className="admin-submit-btn" disabled={formSending}>{formSending ? 'Sending…' : 'Send Form'}</button>
            </form>

            <div className="inquiry-list">
              {(data.forms || []).map((form) => (
                <div key={form.id} className="inquiry-card">
                  <div className="inquiry-head">
                    <div>
                      <strong>{form.title}</strong>
                      <p>To: {form.targetEmail}</p>
                    </div>
                    <span className={`status status-${form.status.toLowerCase()}`}>{form.status}</span>
                  </div>
                  <p className="inquiry-message">{form.description}</p>
                  <ol className="form-question-list">
                    {form.questions.map((question) => <li key={question.id}>{question.text}</li>)}
                  </ol>
                  {form.response && <div className="admin-reply-box"><strong>User response:</strong><p>{form.response}</p></div>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
