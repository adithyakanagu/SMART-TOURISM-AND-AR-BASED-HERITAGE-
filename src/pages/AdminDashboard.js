import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addBusinessEntry, addProduct, addTaxi, addTourismPlace, addUserForm, confirmOrderPayment, loadAppData, replyToInquiry, saveAppData } from '../data/store';
import { defaultHotelImages, defaultProductImages } from '../data/shoppingImages';
import { FaArrowLeft, FaBox, FaHotel, FaCar, FaEnvelope, FaCheckCircle, FaMapMarkerAlt, FaBuilding, FaReceipt, FaClipboardList, FaChartBar } from 'react-icons/fa';
import './AdminDashboard.css';

const tabs = [
  { key: 'products', label: 'Products', icon: FaBox },
  { key: 'hotels', label: 'Hotels', icon: FaHotel },
  { key: 'taxis', label: 'Taxi', icon: FaCar },
  { key: 'tourism', label: 'Tourism', icon: FaMapMarkerAlt },
  { key: 'businesses', label: 'Businesses', icon: FaBuilding },
  { key: 'orders', label: 'Orders', icon: FaReceipt },
  { key: 'forms', label: 'User Forms', icon: FaClipboardList },
  { key: 'analytics', label: 'Analytics', icon: FaChartBar },
  { key: 'queries', label: 'Queries', icon: FaEnvelope }
];

const emptyPlace = { name: '', district: 'Nilgiris', taluk: 'Ooty', type: 'Viewpoint', rush: 'Moderate', nearby: '', description: '' };
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
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [data, setData] = useState(loadAppData());
  const [replyDrafts, setReplyDrafts] = useState({});
  const [newPlace, setNewPlace] = useState(emptyPlace);
  const [newBusiness, setNewBusiness] = useState(emptyBusiness);
  const [selectedAdminTaluk, setSelectedAdminTaluk] = useState('Ooty');
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [newTaxi, setNewTaxi] = useState(emptyTaxi);
  const [newForm, setNewForm] = useState(emptyForm);
  const [imageErrors, setImageErrors] = useState({});
  const [paymentActionId, setPaymentActionId] = useState(null);

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

  const summary = useMemo(() => ({
    products: data.products.length,
    hotels: data.hotels.length,
    taxis: data.taxis.length,
    inquiries: data.inquiries.length,
    tourismSpots: data.tourismSpots?.length || 0,
    businesses: data.businesses?.length || 0,
    orders: data.orders?.length || 0
  }), [data]);

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

  const handleSendForm = (event) => {
    event.preventDefault();
    const questions = newForm.questions.split('\n').map((text, index) => ({ id: index + 1, text: text.trim() })).filter((question) => question.text);
    if (!newForm.targetEmail.trim() || !newForm.title.trim() || !questions.length) return;
    addUserForm({ ...newForm, questions, createdBy: user?.email });
    setData(loadAppData());
    setNewForm(emptyForm);
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

  const updateInquiryStatus = (id, status) => {
    persist({
      ...data,
      inquiries: data.inquiries.map((inquiry) => inquiry.id === id ? { ...inquiry, status } : inquiry)
    });
  };

  const handleReply = (inquiryId) => {
    const reply = (replyDrafts[inquiryId] || '').trim();
    if (!reply) {
      return;
    }

    replyToInquiry(inquiryId, reply, 'Replied');
    setReplyDrafts((previous) => ({ ...previous, [inquiryId]: '' }));
    setData(loadAppData());
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
            </button>
          ))}
        </nav>

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
            <h2>Hotel Availability & Rooms</h2>
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

                  <div className="admin-image-editor">
                    <img
                      className="admin-image-preview"
                      src={hotel.imageOverride || defaultHotelImages[hotel.name] || hotel.image || '/shopping/hill-crest-residency.webp'}
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
                    <button className="status-btn reply" onClick={() => handleReply(inquiry.id)}>Send Reply</button>
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
              <img src="/nilgiris-taluks-map.jpg" alt="Map of the six Nilgiris taluks" className="admin-map-image" />
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
            <form className="admin-form form-create-form" onSubmit={handleSendForm}>
              <input type="email" value={newForm.targetEmail} onChange={(e) => setNewForm({ ...newForm, targetEmail: e.target.value })} placeholder="Specific user email" />
              <input value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="Form title" />
              <textarea value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} placeholder="Message for the user" />
              <textarea rows="6" value={newForm.questions} onChange={(e) => setNewForm({ ...newForm, questions: e.target.value })} placeholder={'Question 1\nQuestion 2\nQuestion 3'} />
              <button type="submit" className="admin-submit-btn">Send Form</button>
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
