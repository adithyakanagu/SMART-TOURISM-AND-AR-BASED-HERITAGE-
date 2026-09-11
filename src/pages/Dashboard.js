import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addInquiryEntry, answerUserForm, loadAppData } from '../data/store';
import { motion } from 'framer-motion';
import {
  FaMapMarkedAlt,
  FaLandmark,
  FaShoppingCart,
  FaExternalLinkAlt,
  FaSignOutAlt,
  FaUser,
  FaCar,
  FaHotel,
  FaEnvelope,
  FaCheckCircle,
  FaBell,
  FaCalendarAlt,
  FaBuilding,
  FaRobot,
  FaPaperPlane
} from 'react-icons/fa';
import './Dashboard.css';

const modules = [
  {
    id: 1,
    title: 'Smart Tourism',
    description: 'Explore Nilgiris with AR navigation',
    icon: FaMapMarkedAlt,
    color: '#2E7D32',
    gradient: 'linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)',
    path: '/smart-tourism',
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600'
  },
  {
    id: 2,
    title: 'Tribal Heritage & Culture',
    description: 'Discover 6 tribal communities',
    icon: FaLandmark,
    color: '#FF6B35',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #FFB74D 100%)',
    path: '/tribal-heritage',
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600'
  },
  {
    id: 3,
    title: 'Tribal Products',
    description: 'Shop authentic handmade items',
    icon: FaShoppingCart,
    color: '#1976D2',
    gradient: 'linear-gradient(135deg, #1976D2 0%, #64B5F6 100%)',
    path: '/tribal-products',
    image: 'https://images.unsplash.com/photo-1472851294608-415105022050?w=600'
  },
  {
    id: 4,
    title: 'Badaga Language',
    description: 'Learn Badaga language resources',
    icon: FaExternalLinkAlt,
    color: '#7B1FA2',
    gradient: 'linear-gradient(135deg, #7B1FA2 0%, #BA68C8 100%)',
    path: '/badaga-link',
    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600'
  }
];

const quickStats = [
  { label: 'Heritage communities', value: '6', tone: 'green' },
  { label: 'Smart routes', value: '24/7', tone: 'gold' },
  { label: 'Live guides', value: 'AI + AR', tone: 'purple' }
];

const emptyForm = { type: 'general', subject: '', message: '' };
const emptyBooking = { type: '', itemName: '', date: '', time: '', guests: '1', pickup: '', destination: '', fullName: '', phone: '', notes: '' };

function Dashboard() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(loadAppData());
  const [queryForm, setQueryForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState('');
  const [activeInboxTab, setActiveInboxTab] = useState('requests');
  const [formAnswers, setFormAnswers] = useState({});
  const [booking, setBooking] = useState(emptyBooking);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: '', phone: '', email: '' });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hello! I can help with Nilgiris places, taluks, products, bookings, and payments.' }
  ]);

  useEffect(() => {
    const syncAppData = () => setData(loadAppData());
    window.addEventListener('storage', syncAppData);
    return () => window.removeEventListener('storage', syncAppData);
  }, []);

  useEffect(() => {
    setProfileDraft({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '' });
  }, [user]);

  const featuredProducts = useMemo(() => data.products.slice(0, 3), [data.products]);
  const featuredHotels = useMemo(() => data.hotels.filter((hotel) => hotel.available).slice(0, 3), [data.hotels]);
  const featuredTaxis = useMemo(() => data.taxis.filter((taxi) => taxi.available).slice(0, 3), [data.taxis]);
  const featuredBusinesses = useMemo(() => (data.businesses || []).filter((business) => business.status !== 'Closed').slice(0, 6), [data.businesses]);
  const myRequests = useMemo(
    () =>
      (data.inquiries || [])
        .filter((inquiry) => inquiry.userEmail && inquiry.userEmail.toLowerCase() === (user?.email || '').toLowerCase())
        .sort((a, b) => Number(b.id) - Number(a.id)),
    [data.inquiries, user?.email]
  );
  const myForms = useMemo(
    () => (data.forms || []).filter((form) => form.targetEmail === (user?.email || '').toLowerCase()),
    [data.forms, user?.email]
  );
  const notificationItems = useMemo(() => [
    ...myForms.filter((form) => form.status === 'Unread').map((form) => ({ id: form.id, title: form.title, message: 'New questionnaire from admin', tone: 'new' })),
    ...myRequests.filter((request) => request.reply).slice(0, 5).map((request) => ({ id: `reply-${request.id}`, title: request.subject, message: 'Admin replied to your request', tone: 'reply' })),
    ...myRequests.filter((request) => request.status === 'Pending').slice(0, 5).map((request) => ({ id: `pending-${request.id}`, title: request.subject, message: 'Request is being reviewed', tone: 'pending' }))
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index), [myForms, myRequests]);
  const myOrders = useMemo(
    () => (data.orders || []).filter((order) => order.userEmail?.toLowerCase() === user?.email?.toLowerCase()),
    [data.orders, user?.email]
  );

  const handleModuleClick = (path) => {
    navigate(path);
  };

  const handleProfileSave = (event) => {
    event.preventDefault();
    if (!profileDraft.email.trim() || !profileDraft.email.includes('@')) return;
    updateProfile(profileDraft);
    setProfileOpen(false);
  };

  const getAssistantReply = (question) => {
    const message = question.toLowerCase();
    if (message.includes('taluk') || message.includes('map') || message.includes('place')) {
      return 'Open Smart Tourism to use the Nilgiris map. Select a taluk to see its places, then use the AI Trip Planner for a suggested itinerary.';
    }
    if (message.includes('toda') || message.includes('heritage') || message.includes('tribe')) {
      return 'Open Tribal Heritage to explore Toda culture, sacred dairy and buffalo traditions, Poothkuli embroidery, Toda huts, and AR heritage ideas.';
    }
    if (message.includes('tea') || message.includes('product') || message.includes('order')) {
      return 'Open Tribal Products, add items to your cart, enter delivery details, choose PhonePe UPI, and generate your bill after payment.';
    }
    if (message.includes('hotel') || message.includes('taxi') || message.includes('booking')) {
      return 'Use the Hotel Bookings or Taxi Booking section on this dashboard. Select Book, enter date, time, passenger details, and send the request to Admin.';
    }
    if (message.includes('payment') || message.includes('upi') || message.includes('phonepe')) {
      return 'For products, checkout opens the PhonePe UPI step. Complete payment, enter the transaction reference, and select Confirm & Generate Bill.';
    }
    if (message.includes('notification') || message.includes('form')) {
      return 'Click the bell icon to see admin replies, pending requests, and questionnaires sent to you.';
    }
    return 'I can help with Smart Tourism, taluk places, Toda heritage, tea products, hotel or taxi bookings, PhonePe payment, and notifications. What would you like to explore?';
  };

  const sendChatMessage = (event) => {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question) return;
    setChatMessages((messages) => [
      ...messages,
      { id: Date.now(), sender: 'user', text: question },
      { id: Date.now() + 1, sender: 'bot', text: getAssistantReply(question) }
    ]);
    setChatInput('');
  };

  const handleQuickRequest = (type, item) => {
    if (type === 'product') {
      navigate('/tribal-products', { state: { productId: item.id } });
      return;
    }

    setBooking({
      ...emptyBooking,
      type,
      itemName: item.name,
      destination: type === 'hotel' ? item.city : '',
      guests: type === 'hotel' ? '2' : '1'
    });
    setFeedback('');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleBookingSubmit = (event) => {
    event.preventDefault();
    if (!booking.date || !booking.time || !booking.fullName.trim() || !booking.phone.trim() || (booking.type === 'taxi' && (!booking.pickup.trim() || !booking.destination.trim()))) {
      setFeedback('Please complete the booking date, time, name, phone, and travel locations.');
      return;
    }

    const details = booking.type === 'hotel'
      ? `Hotel: ${booking.itemName}. Check-in: ${booking.date} at ${booking.time}. Guests: ${booking.guests}. Guest name: ${booking.fullName}. Phone: ${booking.phone}. Notes: ${booking.notes || 'None'}.`
      : `Taxi: ${booking.itemName}. Travel: ${booking.date} at ${booking.time}. Passengers: ${booking.guests}. Pickup: ${booking.pickup}. Destination: ${booking.destination}. Name: ${booking.fullName}. Phone: ${booking.phone}. Notes: ${booking.notes || 'None'}.`;

    addInquiryEntry({
      userEmail: user?.email || 'guest@example.com',
      subject: `${booking.type === 'hotel' ? 'Hotel booking' : 'Taxi booking'}: ${booking.itemName}`,
      type: booking.type,
      message: details
    });
    setData(loadAppData());
    setBooking(emptyBooking);
    setFeedback('Your booking request was sent to the admin successfully.');
  };

  const handleQuerySubmit = (event) => {
    event.preventDefault();

    if (!queryForm.subject.trim() || !queryForm.message.trim()) {
      setFeedback('Please enter a subject and description before submitting.');
      return;
    }

    addInquiryEntry({
      userEmail: user?.email || 'guest@example.com',
      subject: queryForm.subject.trim(),
      type: queryForm.type,
      message: queryForm.message.trim()
    });

    setData(loadAppData());
    setQueryForm(emptyForm);
    setFeedback('Your request has been sent to the admin successfully.');
  };

  const handleFormAnswer = (formId, questionId, answer) => {
    setFormAnswers((previous) => ({
      ...previous,
      [formId]: { ...(previous[formId] || {}), [questionId]: answer }
    }));
  };

  const submitFormResponse = (form) => {
    const answers = form.questions.map((question) => ({
      question: question.text,
      answer: formAnswers[form.id]?.[question.id] || ''
    }));
    answerUserForm(form.id, answers, user?.email);
    setData(loadAppData());
    setFeedback('Your questionnaire response was sent to the admin.');
  };

  return (
    <div className="dashboard-container">
      <motion.header
        className="dashboard-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          <div className="header-left">
            <div className="brand-lockup">
              <img src="/nilgiris-logo.png" alt="Nilgiri Smart Tourism logo" className="brand-logo" />
              <div>
                <h1 className="app-title">Nilgiri Smart Tourism and AR Based Heritage</h1>
                <p className="welcome-text">Explore · Experience · Preserve</p>
              </div>
            </div>
          </div>
          <div className="header-right">
            <button type="button" className="profile-button" onClick={() => setProfileOpen((open) => !open)} aria-label="Open profile" title="Edit profile">
              <FaUser className="user-icon" />
              <span>{user?.name || 'Profile'}</span>
            </button>
            <button type="button" className="notification-button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Open notifications" title="Notifications">
              <FaBell />
              {notificationItems.length > 0 && <span className="notification-bell-count">{notificationItems.length}</span>}
            </button>
            <button type="button" className="chat-button" onClick={() => setChatOpen((open) => !open)} aria-label="Open Nilgiris assistant" title="Nilgiris AI Assistant">
              <FaRobot />
            </button>
            <button className="logout-button" onClick={logout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
        {notificationsOpen && (
          <div className="notification-panel">
            <div className="notification-panel-header">
              <strong>Notifications</strong>
              <button type="button" onClick={() => { setNotificationsOpen(false); setActiveInboxTab('forms'); }}>
                View all
              </button>
            </div>
            {notificationItems.length === 0 ? (
              <p className="notification-empty">You have no new notifications.</p>
            ) : (
              notificationItems.map((item) => (
                <button key={item.id} type="button" className="notification-item" onClick={() => { setNotificationsOpen(false); setActiveInboxTab(item.tone === 'new' ? 'forms' : 'requests'); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}>
                  <span className={`notification-dot ${item.tone}`} />
                  <span><strong>{item.title}</strong><small>{item.message}</small></span>
                </button>
              ))
            )}
          </div>
        )}
        {chatOpen && (
          <div className="chat-panel">
            <div className="chat-panel-header">
              <div><FaRobot /><strong>Nilgiris Assistant</strong></div>
              <button type="button" onClick={() => setChatOpen(false)} aria-label="Close assistant">&times;</button>
            </div>
            <div className="chat-messages">
              {chatMessages.map((message) => <div key={message.id} className={`chat-message ${message.sender}`}>{message.text}</div>)}
            </div>
            <form className="chat-form" onSubmit={sendChatMessage}>
              <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about Nilgiris..." aria-label="Ask the assistant" />
              <button type="submit" aria-label="Send message"><FaPaperPlane /></button>
            </form>
          </div>
        )}
        {profileOpen && (
          <form className="profile-panel" onSubmit={handleProfileSave}>
            <div className="profile-panel-header">
              <div><strong>Edit profile</strong><span>Update your account details</span></div>
              <button type="button" onClick={() => setProfileOpen(false)} aria-label="Close profile">&times;</button>
            </div>
            <label>
              Name
              <input value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} placeholder="Your name" />
            </label>
            <label>
              Phone number
              <input inputMode="numeric" value={profileDraft.phone} onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.target.value.replace(/\D/g, '') })} placeholder="10-digit phone number" />
            </label>
            <label>
              Email
              <input type="email" value={profileDraft.email} onChange={(event) => setProfileDraft({ ...profileDraft, email: event.target.value })} placeholder="Your email" />
            </label>
            <button type="submit" className="profile-save-button">Save Profile</button>
          </form>
        )}
      </motion.header>

      <main className="dashboard-main">
        <motion.section
          className="hero-panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-copy">
            <span className="live-chip">Live Nilgiris experience</span>
            <h2>Explore the hills with cultural depth and smart travel guidance.</h2>
            <p>
              Discover heritage, local craft, tourism routes, and community stories designed for a richer visit to the Nilgiris.
            </p>
          </div>

          <div className="stats-bar">
            {quickStats.map((stat) => (
              <div key={stat.label} className={`stat-pill ${stat.tone}`}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </motion.section>

        <section className="user-service-panel">
          <div className="service-section">
            <div className="section-header">
              <span className="section-icon"><FaShoppingCart /></span>
              <h3>Tea & Tribal Products</h3>
            </div>
            <div className="service-grid">
              {featuredProducts.map((product) => (
                <div key={product.id} className="mini-card">
                  <div className="mini-card-top">
                    <span className="mini-tag">{product.category}</span>
                    <span className={`stock ${product.inStock ? 'in' : 'out'}`}>{product.inStock ? 'Available' : 'Out of stock'}</span>
                  </div>
                  <h4>{product.name}</h4>
                  <p>{product.description}</p>
                  <div className="mini-meta">
                    <strong>₹{product.price}</strong>
                    <span>MRP ₹{product.mrp}</span>
                  </div>
                  <button className="service-button" onClick={() => handleQuickRequest('product', product)}>
                    Shop & Checkout
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="service-section">
            <div className="section-header">
              <span className="section-icon"><FaHotel /></span>
              <h3>Hotel Bookings</h3>
            </div>
            <div className="service-grid">
              {featuredHotels.map((hotel) => (
                <div key={hotel.id} className="mini-card">
                  <div className="mini-card-top">
                    <span className="mini-tag">{hotel.city}</span>
                    <span className="stock in">Open</span>
                  </div>
                  <h4>{hotel.name}</h4>
                  <p>{hotel.roomsAvailable} rooms left</p>
                  <div className="mini-meta">
                    <strong>₹{hotel.pricePerNight}/night</strong>
                    <span>Stay</span>
                  </div>
                  <button className="service-button" onClick={() => handleQuickRequest('hotel', hotel)}>
                    Book Stay
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="service-section">
            <div className="section-header">
              <span className="section-icon"><FaCar /></span>
              <h3>Taxi Booking</h3>
            </div>
            <div className="service-grid">
              {featuredTaxis.map((taxi) => (
                <div key={taxi.id} className="mini-card">
                  <div className="mini-card-top">
                    <span className="mini-tag">Taxi</span>
                    <span className="stock in">Available</span>
                  </div>
                  <h4>{taxi.name}</h4>
                  <p>Comfortable trip for Nilgiris travel</p>
                  <div className="mini-meta">
                    <strong>₹{taxi.pricePerTrip}</strong>
                    <span>Per trip</span>
                  </div>
                  <button className="service-button" onClick={() => handleQuickRequest('taxi', taxi)}>
                    Book Taxi
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="service-section">
            <div className="section-header">
              <span className="section-icon"><FaBuilding /></span>
              <h3>Local Hotels, Factories & Stores</h3>
            </div>
            <div className="service-grid">
              {featuredBusinesses.length === 0 ? (
                <p className="empty-request-state">No local businesses are currently listed.</p>
              ) : featuredBusinesses.map((business) => (
                <div key={business.id} className="mini-card">
                  <div className="mini-card-top">
                    <span className="mini-tag">{business.type}</span>
                    <span className="stock in">{business.status}</span>
                  </div>
                  <h4>{business.name}</h4>
                  <p>{business.category} · {business.taluk}, {business.district}</p>
                  <div className="mini-meta">
                    <strong>{business.contact || 'Contact admin'}</strong>
                    <span>Local listing</span>
                  </div>
                  <button className="service-button" onClick={() => {
                    setQueryForm({
                      type: business.type === 'hotel' ? 'hotel' : 'general',
                      subject: `Inquiry: ${business.name}`,
                      message: `I would like more information about ${business.name} in ${business.taluk}. Contact: ${business.contact || 'Please share contact details'}.`
                    });
                    setFeedback('');
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  }}>
                    Contact / Enquire
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {booking.type && (
          <section className="query-form-panel booking-panel">
            <div className="section-header">
              <span className="section-icon"><FaCalendarAlt /></span>
              <h3>{booking.type === 'hotel' ? 'Hotel Booking Details' : 'Taxi Booking Details'}</h3>
            </div>
            <p className="booking-selected">Selected: <strong>{booking.itemName}</strong></p>
            <form className="query-form" onSubmit={handleBookingSubmit}>
              <div className="form-row booking-grid">
                <label>
                  Date
                  <input type="date" value={booking.date} onChange={(event) => setBooking({ ...booking, date: event.target.value })} />
                </label>
                <label>
                  Time
                  <input type="time" value={booking.time} onChange={(event) => setBooking({ ...booking, time: event.target.value })} />
                </label>
                <label>
                  {booking.type === 'hotel' ? 'Guests' : 'Passengers'}
                  <input type="number" min="1" value={booking.guests} onChange={(event) => setBooking({ ...booking, guests: event.target.value })} />
                </label>
              </div>

              {booking.type === 'taxi' && <div className="form-row booking-grid">
                <label>
                  Pickup location
                  <input value={booking.pickup} onChange={(event) => setBooking({ ...booking, pickup: event.target.value })} placeholder="Airport, hotel, street" />
                </label>
                <label>
                  Destination
                  <input value={booking.destination} onChange={(event) => setBooking({ ...booking, destination: event.target.value })} placeholder="Where should the taxi go?" />
                </label>
              </div>}

              <div className="form-row booking-grid">
                <label>
                  Full name
                  <input value={booking.fullName} onChange={(event) => setBooking({ ...booking, fullName: event.target.value })} placeholder="Passenger or guest name" />
                </label>
                <label>
                  Phone number
                  <input inputMode="numeric" value={booking.phone} onChange={(event) => setBooking({ ...booking, phone: event.target.value })} placeholder="10-digit phone number" />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Additional notes
                  <textarea rows="3" value={booking.notes} onChange={(event) => setBooking({ ...booking, notes: event.target.value })} placeholder="Early check-in, luggage, accessibility, child seat, or other requirements" />
                </label>
              </div>

              <button type="submit" className="submit-query-btn"><FaCheckCircle /> Send Booking Request</button>
            </form>
          </section>
        )}

        <motion.div
          className="modules-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {modules.map((module, index) => (
            <motion.div
              key={module.id}
              className="module-card"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              whileHover={{ scale: 1.04, y: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleModuleClick(module.path)}
              style={{ cursor: 'pointer' }}
            >
              <div
                className="module-image"
                style={{ backgroundImage: `url(${module.image})` }}
              >
                <div className="image-overlay"></div>
              </div>
              <div className="module-content">
                <div
                  className="module-icon-wrapper"
                  style={{ background: module.gradient }}
                >
                  <module.icon size={40} color="white" />
                </div>
                <h3 className="module-title">{module.title}</h3>
                <p className="module-description">{module.description}</p>
                <div className="module-arrow">
                  <span>Explore</span> →
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <section className="query-form-panel">
          <div className="section-header">
            <span className="section-icon"><FaEnvelope /></span>
            <h3>Notifications & Updates</h3>
          </div>

          <div className="inbox-tabs">
            <button type="button" className={activeInboxTab === 'requests' ? 'inbox-tab active' : 'inbox-tab'} onClick={() => setActiveInboxTab('requests')}>
              <FaEnvelope /> Requests
            </button>
            <button type="button" className={activeInboxTab === 'forms' ? 'inbox-tab active' : 'inbox-tab'} onClick={() => setActiveInboxTab('forms')}>
              <FaBell /> Notifications {myForms.filter((form) => form.status === 'Unread').length > 0 && <span className="notification-count">{myForms.filter((form) => form.status === 'Unread').length}</span>}
            </button>
          </div>

          {activeInboxTab === 'requests' && <div className="request-list">
            {myRequests.length === 0 ? <p className="empty-request-state">No requests yet. Submit a new query below.</p> : myRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <div><strong>{request.subject}</strong><span className="request-type">{request.type}</span></div>
                  <span className={`status status-${request.status.toLowerCase().replace(/\s+/g, '-')}`}>{request.status}</span>
                </div>
                <p className="request-message">{request.message}</p>
                {request.reply ? <div className="admin-reply-box"><strong>Admin reply:</strong><p>{request.reply}</p></div> : <div className="pending-note">Waiting for admin response.</div>}
              </div>
            ))}
          </div>}

          {activeInboxTab === 'forms' && <div className="request-list">
            {myForms.length === 0 ? <p className="empty-request-state">No forms or notifications have been sent to you.</p> : myForms.map((form) => (
              <div key={form.id} className="request-card notification-card">
                <div className="request-header">
                  <div><strong>{form.title}</strong><span className="request-type">Admin questionnaire</span></div>
                  <span className={`status status-${form.status.toLowerCase()}`}>{form.status}</span>
                </div>
                <p className="request-message">{form.description}</p>
                {form.status === 'Answered' ? <div className="pending-note">Your response was sent to the admin.</div> : <>
                  <div className="questionnaire-list">
                    {form.questions.map((question) => <label key={question.id}>{question.text}<textarea rows="2" value={formAnswers[form.id]?.[question.id] || ''} onChange={(event) => handleFormAnswer(form.id, question.id, event.target.value)} placeholder="Write your answer" /></label>)}
                  </div>
                  <button type="button" className="submit-query-btn" onClick={() => submitFormResponse(form)}><FaCheckCircle /> Send Answers</button>
                </>}
              </div>
            ))}
          </div>}
        </section>

        <section className="query-form-panel history-panel">
          <div className="section-header">
            <span className="section-icon"><FaShoppingCart /></span>
            <h3>My Orders & Bills</h3>
          </div>
          {myOrders.length === 0 ? <p className="empty-request-state">Your completed orders and bills will appear here.</p> : <div className="order-history-list">
            {myOrders.map((order) => <div key={order.id} className="order-history-card"><div><strong>{order.billNumber}</strong><span>{order.items?.length || 0} item(s) · {order.paymentMethod}</span></div><strong>₹{Number(order.total || 0).toLocaleString()}</strong></div>)}
          </div>}
        </section>

        <section className="query-form-panel">
          <div className="section-header">
            <span className="section-icon"><FaEnvelope /></span>
            <h3>Raise a Query / Issue</h3>
          </div>

          <form className="query-form" onSubmit={handleQuerySubmit}>
            <div className="form-row">
              <label>
                Type
                <select
                  value={queryForm.type}
                  onChange={(event) => setQueryForm((prev) => ({ ...prev, type: event.target.value }))}
                >
                  <option value="general">General</option>
                  <option value="product">Product</option>
                  <option value="hotel">Hotel</option>
                  <option value="taxi">Taxi</option>
                  <option value="issue">Issue</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Subject
                <input
                  type="text"
                  value={queryForm.subject}
                  onChange={(event) => setQueryForm((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder="Enter your issue or booking request"
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Message
                <textarea
                  rows="5"
                  value={queryForm.message}
                  onChange={(event) => setQueryForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="Describe your requirement or issue"
                />
              </label>
            </div>

            {feedback && <div className="query-feedback">{feedback}</div>}

            <button type="submit" className="submit-query-btn">
              <FaCheckCircle /> Send to Admin
            </button>
          </form>
        </section>
      </main>

      <footer className="dashboard-footer">
        <p>Nilgiri Smart Tourism and AR Based Heritage | Nilgiris District, Tamil Nadu</p>
        <p>Developed by Adithya Kanagu | Bannari Amman Institute Of Technology</p>
        <p>Support: adithya01022007@gmail.com | Copyright © 2026 Adithya Kanagu</p>
      </footer>
    </div>
  );
}

export default Dashboard;
