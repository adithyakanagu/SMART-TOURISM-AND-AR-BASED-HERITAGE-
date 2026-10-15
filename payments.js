const crypto = require('crypto');

function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

function verifyRazorpayCheckoutSignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(String(signature || ''));
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function verifyRazorpayWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(String(signature || ''));
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  if (!razorpayConfigured()) {
    const error = new Error('UPI payment is not configured on the server.');
    error.statusCode = 503;
    throw error;
  }

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes,
      payment_capture: 1
    }),
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('The payment service could not create this order.');
    error.statusCode = 502;
    throw error;
  }
  return payload;
}

async function fetchRazorpayPayment(paymentId) {
  if (!razorpayConfigured()) {
    const error = new Error('UPI payment is not configured on the server.');
    error.statusCode = 503;
    throw error;
  }
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${auth}` },
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('The payment service could not confirm this payment.');
    error.statusCode = 502;
    throw error;
  }
  return payload;
}

module.exports = {
  razorpayConfigured,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
  createRazorpayOrder,
  fetchRazorpayPayment
};
