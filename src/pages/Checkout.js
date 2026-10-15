import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { clearCart, loadCart, startCheckout, startRazorpayPayment, verifyRazorpayPayment } from '../data/store';
import './Checkout.css';

const emptyCustomer = {
  fullName: '',
  phone: '',
  house: '',
  street: '',
  city: 'Ooty',
  state: 'Tamil Nadu',
  pincode: '',
  notes: ''
};

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the payment window.'));
    document.body.appendChild(script);
  });
}

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [cart, setCart] = useState(() => loadCart());
  const [customer, setCustomer] = useState({
    ...emptyCustomer,
    fullName: user?.name || '',
    phone: user?.phone || ''
  });
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const requested = location.state?.product;
    if (requested) {
      const next = loadCart();
      if (!next.some((item) => String(item.product.id) === String(requested.id))) {
        next.push({ product: requested, quantity: 1 });
        window.sessionStorage.setItem('nilgiriCart', JSON.stringify(next));
      }
      setCart(loadCart());
    }
  }, [location.state]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.product.price) * Number(item.quantity), 0),
    [cart]
  );

  const updateField = (field, value) => {
    setCustomer((current) => ({ ...current, [field]: value }));
    setReviewing(false);
  };

  const validateCustomer = () => {
    if (!cart.length) return 'Your cart is empty.';
    if (!customer.fullName.trim() || !customer.house.trim() || !customer.street.trim() || !customer.city.trim()) {
      return 'Please complete your name and delivery address.';
    }
    if (!/^[6-9]\d{9}$/.test(customer.phone.trim())) return 'Enter a valid 10-digit Indian mobile number.';
    if (!/^\d{6}$/.test(customer.pincode.trim())) return 'Enter a valid 6-digit PIN code.';
    return '';
  };

  const handleReview = (event) => {
    event.preventDefault();
    const error = validateCustomer();
    if (error) {
      setMessage(error);
      return;
    }
    setMessage('');
    setReviewing(true);
  };

  const openRazorpay = (paymentSession, createdOrder) => {
    const checkout = new window.Razorpay({
      key: paymentSession.keyId,
      amount: paymentSession.amount,
      currency: paymentSession.currency,
      name: 'The Nilgiris Tourism',
      description: `Order ${createdOrder.id}`,
      order_id: paymentSession.razorpayOrderId,
      prefill: {
        name: customer.fullName,
        email: user?.email,
        contact: customer.phone
      },
      notes: { appOrderId: createdOrder.id },
      theme: { color: '#176d47' },
      config: { display: { blocks: { utib: { instruments: [{ method: 'upi' }] } }, sequence: ['block.utib'], preferences: { show_default_blocks: true } } },
      handler: async (response) => {
        try {
          const verified = await verifyRazorpayPayment({
            orderId: createdOrder.id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          });
          setOrder(verified.order);
          clearCart();
          setCart([]);
          setMessage(verified.message || 'Payment verified. Your order is confirmed.');
        } catch (error) {
          setMessage(error.message || 'Payment could not be verified yet. If money was deducted, wait a moment and refresh.');
        } finally {
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: () => {
          setSubmitting(false);
          setMessage('Payment was cancelled. Your order is unpaid until UPI payment succeeds.');
        }
      }
    });
    checkout.open();
  };

  const handlePay = async () => {
    const error = validateCustomer();
    if (error) {
      setMessage(error);
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const created = await startCheckout({
        items: cart.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        customer,
        idempotencyKey: window.sessionStorage.getItem('nilgiriCheckoutKey') || crypto.randomUUID()
      });
      window.sessionStorage.setItem('nilgiriCheckoutKey', created.idempotencyKey || created.order.id);
      setOrder(created.order);

      if (!created.paymentEnabled) {
        setMessage(created.message || 'The order was saved, but UPI payment is not configured yet.');
        setSubmitting(false);
        return;
      }

      const paymentSession = await startRazorpayPayment(created.order.id);
      await loadRazorpayScript();
      openRazorpay(paymentSession, created.order);
    } catch (requestError) {
      setSubmitting(false);
      setMessage(requestError.message || 'Checkout failed. Please try again.');
    }
  };

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <button type="button" className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h1>Shop & Checkout</h1>
        <span />
      </header>

      <main className="checkout-main">
        {cart.length === 0 && !order ? (
          <p className="checkout-empty">Your cart is empty. Add a product before checkout.</p>
        ) : (
          <>
            <section className="checkout-card">
              <h2>Order summary</h2>
              {(order?.items || cart).map((item) => {
                const name = item.name || item.product?.name;
                const quantity = item.quantity;
                const price = item.price || item.product?.price;
                return (
                  <div key={name} className="checkout-line">
                    <span>{name} × {quantity}</span>
                    <strong>₹{(Number(price) * Number(quantity)).toLocaleString('en-IN')}</strong>
                  </div>
                );
              })}
              <div className="checkout-total">
                <span>Total</span>
                <strong>₹{Number(order?.total || total).toLocaleString('en-IN')}</strong>
              </div>
            </section>

            <form className="checkout-card" onSubmit={handleReview}>
              <h2>Delivery details</h2>
              <label>Full name<input value={customer.fullName} onChange={(event) => updateField('fullName', event.target.value)} required /></label>
              <label>Phone number<input inputMode="numeric" value={customer.phone} onChange={(event) => updateField('phone', event.target.value.replace(/\D/g, '').slice(0, 10))} required /></label>
              <label>House / building<input value={customer.house} onChange={(event) => updateField('house', event.target.value)} required /></label>
              <label>Street / area<input value={customer.street} onChange={(event) => updateField('street', event.target.value)} required /></label>
              <label>City<input value={customer.city} onChange={(event) => updateField('city', event.target.value)} required /></label>
              <label>State<input value={customer.state} onChange={(event) => updateField('state', event.target.value)} required /></label>
              <label>PIN code<input inputMode="numeric" value={customer.pincode} onChange={(event) => updateField('pincode', event.target.value.replace(/\D/g, '').slice(0, 6))} required /></label>
              <label>Delivery notes<textarea value={customer.notes} onChange={(event) => updateField('notes', event.target.value)} rows="3" /></label>
              <button type="submit" className="checkout-button">Review order</button>
            </form>

            {reviewing && (
              <section className="checkout-card checkout-review">
                <h2><FaShieldAlt /> Review before payment</h2>
                <p>Deliver to {customer.fullName}, {customer.house}, {customer.street}, {customer.city}, {customer.state} - {customer.pincode}.</p>
                <p>Contact: {customer.phone}</p>
                <p>Pay with UPI through the secure payment window. Opening a UPI app by itself does not prove payment.</p>
                <button type="button" className="checkout-button" onClick={handlePay} disabled={submitting}>
                  {submitting ? 'Preparing payment…' : 'Pay with UPI'}
                </button>
              </section>
            )}
          </>
        )}

        {message && <p className="checkout-message" role="status">{message}</p>}
        {order && <p className="checkout-status">Order status: {order.status}</p>}
      </main>
    </div>
  );
}

export default Checkout;
