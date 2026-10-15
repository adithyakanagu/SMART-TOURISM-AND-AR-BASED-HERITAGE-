import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  FaArrowLeft, 
  FaShoppingCart, 
  FaStar, 
  FaHeart,
  FaSearch,
  FaFilter,
  FaReceipt,
  FaCreditCard
} from 'react-icons/fa';
import { createPendingOrder, loadAppData } from '../data/store';
import './TribalProducts.css';

const categories = ['All', 'Textiles', 'Handicrafts', 'Food & Beverages', 'Art & Paintings', 'Wellness'];

function TribalProducts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [products, setProducts] = useState(() => loadAppData().products);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [address, setAddress] = useState({
    fullName: '',
    phone: '',
    house: '',
    street: '',
    city: 'Ooty',
    state: 'Tamil Nadu',
    pincode: ''
  });
  const [paymentReference, setPaymentReference] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');

  useEffect(() => {
    const syncProducts = () => setProducts(loadAppData().products);
    syncProducts();
    window.addEventListener('storage', syncProducts);
    window.addEventListener('arSmartTourismDataUpdated', syncProducts);
    return () => {
      window.removeEventListener('storage', syncProducts);
      window.removeEventListener('arSmartTourismDataUpdated', syncProducts);
    };
  }, []);

  useEffect(() => {
    const requestedProduct = products.find((product) => product.id === location.state?.productId);
    if (!requestedProduct) return;
    setCart((current) => current.some((item) => item.product.id === requestedProduct.id)
      ? current
      : [...current, { product: requestedProduct, quantity: 1 }]);
  }, [products, location.state?.productId]);

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.tribe.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, change) => {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + change) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const toggleFavorite = (productId) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const discount = (price, mrp) => Math.round(((mrp - price) / mrp) * 100);

  const addressText = `${address.fullName}, ${address.phone}, ${address.house}, ${address.street}, ${address.city}, ${address.state} - ${address.pincode}`;

  const handleCheckout = () => {
    if (!cart.length) {
      alert('Please add at least one product to the cart.');
      return;
    }

    if (!address.fullName.trim() || !address.phone.trim() || !address.house.trim() || !address.street.trim() || !address.city.trim() || !address.pincode.trim()) {
      alert('Please complete your name, phone, house, street, city, state, and PIN code.');
      return;
    }

    if (!/^\d{10}$/.test(address.phone.trim()) || !/^\d{6}$/.test(address.pincode.trim())) {
      alert('Enter a valid 10-digit phone number and 6-digit PIN code.');
      return;
    }

    setCheckoutStep('payment');
  };

  const openUpiPayment = () => {
    const upiUrl = `upi://pay?pa=7708466812%40upi&pn=The%20Nilgiris%20Tourism&am=${cartTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Nilgiris order for ${address.fullName}`)}`;
    window.location.href = upiUrl;
  };

  const submitForVerification = async () => {
    if (!paymentReference.trim()) {
      alert('Complete the UPI payment, then enter its transaction reference.');
      return;
    }

    setOrderSubmitting(true);
    setOrderMessage('');
    try {
      const order = await createPendingOrder({
        items: cart.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        address: addressText,
        paymentReference: paymentReference.trim()
      });
      setOrderMessage(`Order ${order.id} is awaiting payment verification. Your bill will be emailed to ${user?.email} after the payment is verified.`);
      setCart([]);
      setCheckoutStep('cart');
      setAddress({ fullName: '', phone: '', house: '', street: '', city: 'Ooty', state: 'Tamil Nadu', pincode: '' });
      setPaymentReference('');
    } catch (error) {
      setOrderMessage(error.message || 'The order could not be submitted. Please try again.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  return (
    <div className="tribal-products-container">
      <motion.header
        className="products-header"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
      >
        <button className="back-btn" onClick={() => navigate('/')}>
          <FaArrowLeft /> Back
        </button>
        <h1>🛍️ Tribal Products Store</h1>
        <div className="cart-button">
          <FaShoppingCart size={24} />
          {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
        </div>
      </motion.header>

      <main className="products-main">
        <motion.div
          className="store-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2>🌿 Authentic Tribal Products</h2>
          <p>Support indigenous artisans • Handcrafted with love • Direct from Nilgiris</p>
        </motion.div>

        <div className="products-controls">
          <div className="search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Search products or tribes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="category-filter">
            <FaFilter />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="products-grid">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              className="product-card"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -10 }}
            >
              <div className="product-image-wrapper">
                <img src={product.image} alt={product.name} className="product-image" />
                <div className="discount-badge">{discount(product.price, product.mrp)}% OFF</div>
                <button
                  className={`favorite-btn ${favorites.includes(product.id) ? 'active' : ''}`}
                  onClick={() => toggleFavorite(product.id)}
                >
                  <FaHeart />
                </button>
              </div>

              <div className="product-content">
                <span className="product-tribe">Made by {product.tribe} Tribe</span>
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>

                <div className="product-rating">
                  <span className="rating-badge"><FaStar /> {product.rating}</span>
                  <span className="reviews">({product.reviews} reviews)</span>
                </div>

                <div className="product-price">
                  <span className="current-price">₹{product.price.toLocaleString()}</span>
                  <span className="mrp">MRP ₹{product.mrp.toLocaleString()}</span>
                </div>

                <div className="stock-status">✓ In Stock</div>

                <button
                  className="add-cart-btn"
                  onClick={() => addToCart(product)}
                >
                  <FaShoppingCart /> Add to Cart
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="no-products">
            <p>No products found. Try a different search or category.</p>
          </div>
        )}

        {cart.length > 0 && checkoutStep === 'cart' && (
          <div className="checkout-panel">
            <h3>1. Delivery Details</h3>
            <div className="cart-list">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="cart-item">
                  <div>
                    <strong>{product.name}</strong>
                    <p>₹{product.price} each</p>
                  </div>
                  <div className="quantity-box">
                    <button onClick={() => updateQuantity(product.id, -1)}>-</button>
                    <span>{quantity}</span>
                    <button onClick={() => updateQuantity(product.id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-form">
              <label>
                Full Name
                <input value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} placeholder="Recipient full name" />
              </label>

              <label>
                Mobile Number
                <input inputMode="numeric" maxLength="10" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, '') })} placeholder="10-digit mobile number" />
              </label>

              <label>
                House / Door Number
                <input value={address.house} onChange={(e) => setAddress({ ...address, house: e.target.value })} placeholder="House number and building" />
              </label>

              <label>
                Street and Landmark
                <textarea rows="2" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} placeholder="Street, area, landmark" />
              </label>

              <div className="address-row">
                <label>
                  City / Taluk
                  <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </label>
                <label>
                  State
                  <input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                </label>
                <label>
                  PIN Code
                  <input inputMode="numeric" maxLength="6" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })} placeholder="6 digits" />
                </label>
              </div>

              <p className="payment-method-note">Payment by UPI to <strong>7708466812@upi</strong></p>
            </div>

            <div className="checkout-total">
              <span>Total</span>
              <strong>₹{cartTotal.toLocaleString()}</strong>
            </div>

            <button className="pay-button" onClick={handleCheckout}>
              <FaCreditCard /> Continue to Payment
            </button>
          </div>
        )}

        {cart.length > 0 && checkoutStep === 'payment' && (
          <div className="checkout-panel payment-panel">
            <h3>2. Payment</h3>
            <div className="payment-summary">
              <span>Amount to pay</span>
              <strong>₹{cartTotal.toLocaleString()}</strong>
            </div>
            <p className="payment-address"><strong>Deliver to:</strong> {addressText}</p>

            <div className="upi-box">
              <div className="upi-brand">UPI</div>
              <h4>Pay securely with UPI</h4>
              <p>Pay using any UPI app. An administrator will verify your payment before the bill is issued.</p>
              <p className="upi-id">UPI ID: <strong>7708466812@upi</strong></p>
              <button className="pay-button" onClick={openUpiPayment}><FaCreditCard /> Pay with UPI</button>
              <label>
                UPI Transaction Reference
                <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Enter UPI transaction reference" required />
              </label>
            </div>

            <div className="payment-actions">
              <button className="back-payment-button" onClick={() => setCheckoutStep('cart')}>Back to address</button>
              <button className="pay-button" onClick={submitForVerification} disabled={orderSubmitting}>
                <FaReceipt /> {orderSubmitting ? 'Submitting…' : 'Submit Payment for Verification'}
              </button>
            </div>
          </div>
        )}

        {orderMessage && <p className="order-status-message" role="status">{orderMessage}</p>}
      </main>
    </div>
  );
}

export default TribalProducts;
