const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeHotel, normalizeBusiness, normalizeCheckoutCustomer } = require('../catalog');
const { verifyRazorpayCheckoutSignature } = require('../payments');
const crypto = require('crypto');

test('normalizes and validates a hotel', () => {
  const hotel = normalizeHotel({ name: 'Hill Crest', city: 'Ooty', roomsAvailable: '8', pricePerNight: '2500', description: 'Garden stay' });
  assert.equal(hotel.name, 'Hill Crest');
  assert.equal(hotel.roomsAvailable, 8);
  assert.equal(hotel.pricePerNight, 2500);
  assert.throws(() => normalizeHotel({ name: '' }), /hotel name/i);
});

test('normalizes and validates a business', () => {
  const business = normalizeBusiness({ name: 'Tea Store', type: 'store', contact: '9876543210', address: 'Ooty market' });
  assert.equal(business.name, 'Tea Store');
  assert.equal(business.contact, '9876543210');
  assert.throws(() => normalizeBusiness({ name: 'Bad', contact: 'abc' }), /contact/i);
});

test('validates checkout customer details', () => {
  const customer = normalizeCheckoutCustomer({
    fullName: 'Adithya Kanagu',
    phone: '9876543210',
    house: '12',
    street: 'Hill Road',
    city: 'Ooty',
    state: 'Tamil Nadu',
    pincode: '643001'
  });
  assert.match(customer.addressText, /Ooty/);
  assert.throws(() => normalizeCheckoutCustomer({ fullName: 'A', phone: '123', house: '', street: '', city: '', pincode: '12' }));
});

test('verifies Razorpay checkout signatures', () => {
  process.env.RAZORPAY_KEY_SECRET = 'test_secret';
  const orderId = 'order_123';
  const paymentId = 'pay_123';
  const signature = crypto.createHmac('sha256', 'test_secret').update(`${orderId}|${paymentId}`).digest('hex');
  assert.equal(verifyRazorpayCheckoutSignature({ orderId, paymentId, signature }), true);
  assert.equal(verifyRazorpayCheckoutSignature({ orderId, paymentId, signature: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' }), false);
});
