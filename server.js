require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { createDatabase } = require('./database');
const { generateOtp, createOtpRecord, canResendOtp, registerSendAttempt, verifyOtpRecord } = require('./otp');
const { normalizeHotel, normalizeBusiness, normalizeCheckoutCustomer } = require('./catalog');
const {
  razorpayConfigured,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
  createRazorpayOrder,
  fetchRazorpayPayment
} = require('./payments');

const app = express();
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 'loopback');
const PORT = process.env.API_PORT || process.env.PORT || 5000;
const GOOGLE_MOBILE_STATE_TTL_MS = 5 * 60 * 1000;
const GOOGLE_MOBILE_TICKET_TTL_MS = 60 * 1000;
const GOOGLE_MOBILE_APP_REDIRECT_URI = 'com.nilgiri.smarttourism://auth';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET?.trim()) {
  throw new Error('JWT_SECRET must be configured in production.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'nilgiri-tourism-secure-secret-2026';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_MOBILE_REDIRECT_URI = process.env.GOOGLE_MOBILE_REDIRECT_URI || '';
const googleAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const googleMobileAuthClient = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_MOBILE_REDIRECT_URI
  ? new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_MOBILE_REDIRECT_URI)
  : null;
const ADMIN_EMAIL = 'adithya01022007@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const legacyDataPath = path.join(__dirname, 'data', 'app-data.json');
const databasePath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'app-data.sqlite');
const database = createDatabase(databasePath, legacyDataPath);
const otpStore = new Map();
const otpSendLog = new Map();
const checkoutLocks = new Map();
const googleMobileAuthStates = new Map();
const googleMobileAuthTickets = new Map();
const clients = new Set();

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const RESEND_CONFIGURED = Boolean(
  RESEND_API_KEY?.trim() &&
  RESEND_FROM_EMAIL?.trim()
);
const SMTP_CONFIGURED = Boolean(
  SMTP_USER &&
  SMTP_PASS &&
  String(SMTP_USER).trim().length > 0 &&
  String(SMTP_PASS).trim().length > 0 &&
  !['yourgmail@gmail.com', 'change-me@gmail.com'].includes(String(SMTP_USER).trim().toLowerCase())
);

if (!SMTP_CONFIGURED && (SMTP_USER || SMTP_PASS)) {
  console.log('SMTP credentials detected but still placeholder values remain. Replace them with a real Gmail address and app password to enable real OTP emails.');
}

const defaultState = {
  products: [],
  hotels: [],
  taxis: [],
  inquiries: [],
  orders: [],
  tourismSpots: [],
  businesses: [],
  forms: []
};

function ensureDatabase() {
  return database.read();
}

function saveDatabase(data) {
  return database.replace(data);
}

function mergeBootstrapData(existing, incoming) {
  return Object.fromEntries(Object.keys(defaultState).map((collection) => {
    const existingRecords = Array.isArray(existing[collection]) ? existing[collection] : [];
    const incomingRecords = Array.isArray(incoming[collection]) ? incoming[collection] : [];
    const existingIds = new Set(existingRecords.map((record) => String(record.id)));
    return [collection, [
      ...existingRecords,
      ...incomingRecords.filter((record) => !existingIds.has(String(record.id)))
    ]];
  }));
}

function hasCatalogData(data) {
  return ['products', 'hotels', 'taxis', 'tourismSpots', 'businesses'].some((name) => (data[name] || []).length > 0);
}

function getUserRole(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return normalized === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
}

function buildUser(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return {
    email: normalized,
    role: getUserRole(normalized),
    verified: true,
    loginTime: new Date().toISOString()
  };
}

function createToken(user) {
  return jwt.sign({ email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
}

function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access required.' });
  }
  next();
}

function passwordsMatch(expected, actual) {
  const left = Buffer.from(String(expected || ''));
  const right = Buffer.from(String(actual || ''));
  if (!expected || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}


// ── Password hashing using built-in crypto (no bcrypt needed) ───────────────
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function createSalt() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyPassword(password, hash, salt) {
  const check = hashPassword(password, salt);
  const a = Buffer.from(check, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── User DB helpers ──────────────────────────────────────────────────────────
function getUserByEmail(email) {
  try {
    return database.raw.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  } catch (e) {
    return null;
  }
}

function createUser(email, password) {
  const salt = createSalt();
  const hash = hashPassword(password, salt);
  database.raw.prepare(
    'INSERT OR IGNORE INTO users (email, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(email.toLowerCase().trim(), hash, salt, 'user', new Date().toISOString());
}
// ── End password helpers ─────────────────────────────────────────────────────

function findCollectionRecord(records, id) {
  return (records || []).find((record) => String(record.id) === String(id));
}

function publicOrder(order) {
  if (!order) return null;
  const { razorpaySignature, ...safeOrder } = order;
  return safeOrder;
}

async function markOrderPaid(order, payment = {}) {
  if (order.status === 'Paid' || order.status === 'Confirmed') {
    return order;
  }
  const data = ensureDatabase();
  const paidOrder = {
    ...order,
    status: 'Paid',
    paymentMethod: 'UPI',
    paymentProvider: 'razorpay',
    paymentId: payment.paymentId || order.paymentId,
    razorpayOrderId: payment.razorpayOrderId || order.razorpayOrderId,
    billNumber: order.billNumber || `BILL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    paymentVerifiedAt: new Date().toISOString()
  };
  saveDatabase({
    ...data,
    orders: data.orders.map((item) => String(item.id) === String(order.id) ? paidOrder : item)
  });
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  return paidOrder;
}

function broadcast(event, payload) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    client.write(data);
  }
}


const transporter = SMTP_CONFIGURED
  ? nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  })
  : null;


const EMAIL_CONFIGURED = RESEND_CONFIGURED || SMTP_CONFIGURED;

async function sendAppEmail({ from, to, subject, text, html }) {
  if (RESEND_CONFIGURED) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        subject,
        text,
        ...(html ? { html } : {})
      }),
      signal: AbortSignal.timeout(15000)
    });
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Resend returned HTTP ${response.status}: ${responseText.slice(0, 500)}`);
    }
    return;
  }

  if (!transporter) {
    throw new Error('No email provider is configured.');
  }
  await transporter.sendMail({ from, to, subject, text, html });
}

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP requests. Please wait a few minutes before trying again.' }
});
const guestLoginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please wait a few minutes before trying again.' }
});
const googleMobileAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many Google sign-in attempts. Please wait a few minutes before trying again.' }
});
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Chat is receiving too many requests. Please wait a minute and try again.' }
});

async function searchPublicSources(question) {
  const query = question.slice(0, 500);
  const duckDuckGoUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1`;
  const wikipediaSearchUrl = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=3`;
  const requestJson = async (url, headers = {}) => {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    return response.ok ? response.json() : null;
  };
  const [duckDuckGo, wikipedia] = await Promise.all([
    requestJson(duckDuckGoUrl).catch(() => null),
    requestJson(wikipediaSearchUrl, { 'User-Agent': 'NilgiriSmartTourism/1.0' }).catch(() => null)
  ]);

  const facts = [];
  const sources = [];
  const addSource = (title, url) => {
    if (url && /^https?:\/\//i.test(url) && !sources.some((source) => source.url === url)) {
      sources.push({ title: title || new URL(url).hostname, url });
    }
  };

  if (duckDuckGo?.Answer) {
    facts.push(duckDuckGo.Answer);
    addSource(duckDuckGo.Heading || 'DuckDuckGo result', duckDuckGo.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`);
  }
  if (duckDuckGo?.AbstractText) {
    facts.push(`${duckDuckGo.Heading ? `${duckDuckGo.Heading}: ` : ''}${duckDuckGo.AbstractText.slice(0, 900)}`);
    addSource(duckDuckGo.Heading || 'DuckDuckGo result', duckDuckGo.AbstractURL);
  }
  if (duckDuckGo?.Definition) {
    facts.push(`Definition: ${duckDuckGo.Definition.slice(0, 500)}`);
    addSource('Definition', duckDuckGo.DefinitionURL);
  }

  const pages = (wikipedia?.pages || []).slice(0, 3);
  const summaries = await Promise.all(pages.map(async (page) => {
    try {
      return await requestJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.title)}`, { 'User-Agent': 'NilgiriSmartTourism/1.0' });
    } catch (error) {
      return null;
    }
  }));

  summaries.filter((summary) => summary?.extract).slice(0, 2).forEach((summary) => {
    facts.push(`${summary.title}: ${summary.extract.slice(0, 800)}`);
    addSource(summary.title, summary.content_urls?.desktop?.page || summary.desktop?.page);
  });

  const relatedTopics = (duckDuckGo?.RelatedTopics || [])
    .flatMap((topic) => Array.isArray(topic.Topics) ? topic.Topics : [topic])
    .filter((topic) => topic.Text && topic.FirstURL)
    .slice(0, 2);
  relatedTopics.forEach((topic) => {
    if (!facts.length) facts.push(topic.Text.slice(0, 500));
    addSource(topic.Text.split(' - ')[0], topic.FirstURL);
  });

  addSource('Search the web', `https://duckduckgo.com/?q=${encodeURIComponent(query)}`);

  return {
    text: facts.length
      ? `Here is what I found in public sources:\n\n${facts.slice(0, 3).join('\n\n')}`
      : 'I could not find a reliable answer in the connected sources. Try rephrasing your question or open the web search link below.',
    sources: sources.slice(0, 5)
  };
}

app.use(cors({ origin: true, credentials: true }));
app.post('/api/payments/razorpay/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ message: 'Invalid payment webhook signature.' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ message: 'Invalid webhook payload.' });
  }

  const paymentEntity = event?.payload?.payment?.entity;
  const razorpayOrderId = paymentEntity?.order_id;
  const paymentId = paymentEntity?.id;
  const status = paymentEntity?.status;
  if (!razorpayOrderId || !paymentId) {
    return res.json({ received: true });
  }

  const data = ensureDatabase();
  const order = (data.orders || []).find((item) => item.razorpayOrderId === razorpayOrderId);
  if (!order) {
    return res.json({ received: true });
  }
  if (status === 'captured' || status === 'authorized') {
    markOrderPaid(order, { paymentId, razorpayOrderId }).catch(() => null);
  } else if (['failed', 'cancelled', 'expired'].includes(status) && order.status !== 'Paid' && order.status !== 'Confirmed') {
    saveDatabase({
      ...data,
      orders: data.orders.map((item) => String(item.id) === String(order.id) ? { ...item, status: 'Payment Failed' } : item)
    });
  }
  return res.json({ received: true });
});
app.use(express.json({ limit: '20mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Nilgiri Smart Tourism API',
    timestamp: new Date().toISOString(),
    emailConfigured: EMAIL_CONFIGURED,
    paymentsConfigured: razorpayConfigured()
  });
});


// ── Register with email + password ──────────────────────────────────────────
app.post('/api/auth/register', guestLoginLimiter, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }
  if (email === ADMIN_EMAIL.toLowerCase()) {
    return res.status(400).json({ message: 'This email cannot be used for self-registration.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const existing = getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists. Please log in.' });
  }

  createUser(email, password);
  const user = buildUser(email);
  return res.status(201).json({ user, token: createToken(user), message: 'Account created successfully.' });
});

// ── Login with email + password ──────────────────────────────────────────────
app.post('/api/auth/login', guestLoginLimiter, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  // Admin login
  if (email === ADMIN_EMAIL.toLowerCase()) {
    if (!ADMIN_PASSWORD || !passwordsMatch(ADMIN_PASSWORD, password)) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const user = buildUser(email);
    return res.json({ user, token: createToken(user) });
  }

  // Regular user login
  const record = getUserByEmail(email);
  if (!record || !verifyPassword(password, record.password_hash, record.salt)) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const user = buildUser(email);
  return res.json({ user, token: createToken(user) });
});

app.post('/api/auth/admin-login', guestLoginLimiter, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (email !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ message: 'Access denied. Not an admin account.' });
  }

  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12 || !passwordsMatch(ADMIN_PASSWORD, password)) {
    return res.status(401).json({ message: 'Invalid admin password.' });
  }

  const user = buildUser(email);
  return res.json({ user, token: createToken(user) });
});

app.post('/api/auth/guest', guestLoginLimiter, (req, res) => {
  if (EMAIL_CONFIGURED) {
    return res.status(403).json({ message: 'Email OTP verification is required. Request a sign-in code instead.' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  const user = {
    email,
    role: 'user',
    verified: false,
    loginTime: new Date().toISOString()
  };
  return res.json({ user, token: createToken(user) });
});

app.post('/api/chat', authenticateToken, chatLimiter, async (req, res) => {
  const question = String(req.body?.message || '').trim();
  if (!question || question.length > 2000) {
    return res.status(400).json({ message: 'Enter a question of up to 2,000 characters.' });
  }

  const history = (Array.isArray(req.body?.history) ? req.body.history : [])
    .slice(-10)
    .filter((item) => ['user', 'model'].includes(item?.role) && typeof item?.text === 'string')
    .map((item) => ({
      role: item.role,
      parts: [{ text: item.text.slice(0, 2000) }]
    }));

  try {
    if (!GEMINI_API_KEY) {
      return res.json(await searchPublicSources(question));
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'You are the Nilgiris Smart Tourism assistant, but you can answer questions on any topic. Be helpful, clear, and accurate. Use Google Search grounding for current, changing, or unfamiliar facts. Distinguish facts from uncertainty, and never invent sources, links, or current information. Keep answers concise unless asked for detail.' }]
        },
        contents: [...history, { role: 'user', parts: [{ text: question }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1000 }
      }),
      signal: AbortSignal.timeout(30000)
    });
    const result = await response.json();

    if (!response.ok) {
      console.error('Gemini chat request failed:', response.status, result.error?.message || 'Unknown provider error');
      return res.status(502).json({ message: 'The assistant could not get an answer right now. Please try again shortly.' });
    }

    const candidate = result.candidates?.[0];
    const text = (candidate?.content?.parts || []).map((part) => part.text || '').join('').trim();
    if (!text) {
      return res.status(502).json({ message: 'The assistant did not return an answer. Try rephrasing your question.' });
    }

    const sources = (candidate.groundingMetadata?.groundingChunks || [])
      .map((chunk) => chunk.web)
      .filter((source) => source?.uri && /^https?:\/\//i.test(source.uri))
      .map((source) => ({ title: source.title || new URL(source.uri).hostname, url: source.uri }))
      .filter((source, index, items) => items.findIndex((item) => item.url === source.url) === index)
      .slice(0, 5);

    return res.json({ text, sources });
  } catch (error) {
    console.error('Gemini chat request error:', error.name === 'TimeoutError' ? 'Request timed out' : error.message);
    return res.status(502).json({ message: 'The assistant is temporarily unavailable. Please try again shortly.' });
  }
});

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  clients.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    clients.delete(res);
  });
});

app.post('/api/auth/send-otp', otpLimiter, async (req, res) => {
  const { email } = req.body || {};

  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  if (!EMAIL_CONFIGURED) {
    return res.status(503).json({ message: 'Email OTP is unavailable because no email provider is configured.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const retryCheck = canResendOtp(otpStore.get(normalizedEmail));
  if (!retryCheck.ok) {
    return res.status(429).json({ message: retryCheck.message });
  }
  const sendCheck = registerSendAttempt(otpSendLog.get(normalizedEmail) || []);
  if (!sendCheck.ok) {
    return res.status(429).json({ message: sendCheck.message });
  }

  const otp = generateOtp();
  const record = createOtpRecord(otp);

  try {
    const fromAddress = SMTP_USER ? `"Nilgiris AR Smart Tourism" <${SMTP_USER}>` : (RESEND_FROM_EMAIL ? `"Nilgiris AR Smart Tourism" <${RESEND_FROM_EMAIL}>` : '"Nilgiris AR Smart Tourism" <noreply@nilgiri.tourism>');
    await sendAppEmail({
      from: fromAddress,
      to: normalizedEmail,
      subject: 'Your Nilgiris Smart Tourism sign-in code',
      text: `Your Nilgiris Smart Tourism sign-in code is ${otp}.\n\nEnter this code in the app to sign in. It expires in 5 minutes. If you did not request this code, you can ignore this email.`,
      html: `
        <div style="margin:0;padding:32px 16px;background:#f3f6f1;font-family:Arial,sans-serif;color:#19392e">
          <div style="max-width:480px;margin:0 auto;padding:32px 28px;border:1px solid #e1e9e1;border-radius:20px;background:#fff">
            <p style="margin:0 0 10px;color:#397453;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Nilgiris AR Smart Tourism</p>
            <h1 style="margin:0 0 12px;font-size:24px">Your sign-in code</h1>
            <p style="margin:0;color:#61736a;font-size:15px;line-height:1.6">Enter this one-time code in the app to continue.</p>
            <p style="margin:24px 0;padding:18px;border-radius:14px;background:#f1f7f1;color:#1d6848;font-size:34px;font-weight:700;letter-spacing:8px;text-align:center">${otp}</p>
            <p style="margin:0;color:#61736a;font-size:14px;line-height:1.6">This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
          </div>
        </div>
      `
    });

    otpSendLog.set(normalizedEmail, sendCheck.sendLog);
    otpStore.set(normalizedEmail, record);
    return res.json({ message: 'OTP sent successfully.', email: normalizedEmail });
  } catch (error) {
    console.error('Email send failed:', error.name === 'TimeoutError' ? 'Request timed out' : error.message);
    return res.status(502).json({ message: 'Failed to send OTP email. Please try again later.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  if (!googleAuthClient) {
    return res.status(503).json({ message: 'Google sign-in is not configured on the server.' });
  }

  const credential = String(req.body?.credential || '').trim();
  if (!credential || credential.length > 10000) {
    return res.status(400).json({ message: 'A valid Google credential is required.' });
  }

  try {
    const ticket = await googleAuthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified !== true) {
      return res.status(401).json({ message: 'Google must verify your email before you can sign in.' });
    }

    const user = buildUser(payload.email);
    return res.json({ user, token: createToken(user) });
  } catch {
    return res.status(401).json({ message: 'Google sign-in could not be verified. Please try again.' });
  }
});

app.post('/api/auth/google/mobile/start', googleMobileAuthLimiter, (req, res) => {
  if (!googleMobileAuthClient) {
    return res.status(503).json({ message: 'Google browser sign-in is not configured on the server.' });
  }

  let redirectUrl;
  try {
    redirectUrl = new URL(GOOGLE_MOBILE_REDIRECT_URI);
    if (redirectUrl.protocol !== 'https:' || redirectUrl.username || redirectUrl.password || redirectUrl.hash) {
      throw new Error('Invalid redirect URI.');
    }
  } catch {
    return res.status(503).json({ message: 'Google browser sign-in requires a valid HTTPS callback URL.' });
  }

  const now = Date.now();
  for (const [state, attempt] of googleMobileAuthStates) {
    if (attempt.expiresAt <= now) googleMobileAuthStates.delete(state);
  }
  for (const [ticket, result] of googleMobileAuthTickets) {
    if (result.expiresAt <= now) googleMobileAuthTickets.delete(ticket);
  }

  const state = crypto.randomBytes(32).toString('base64url');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  googleMobileAuthStates.set(state, { codeVerifier, expiresAt: now + GOOGLE_MOBILE_STATE_TTL_MS });

  const authorizationUrl = googleMobileAuthClient.generateAuthUrl({
    access_type: 'online',
    prompt: 'select_account',
    redirect_uri: redirectUrl.toString(),
    response_type: 'code',
    scope: ['openid', 'email', 'profile'],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  return res.json({ authorizationUrl });
});

app.get('/api/auth/google/mobile/callback', async (req, res) => {
  const state = String(req.query.state || '');
  const attempt = googleMobileAuthStates.get(state);
  googleMobileAuthStates.delete(state);

  if (!state || !attempt || attempt.expiresAt <= Date.now()) {
    return res.status(400).send('Google sign-in expired or could not be verified. Return to the app and try again.');
  }

  if (req.query.error) {
    const redirectUrl = new URL(GOOGLE_MOBILE_APP_REDIRECT_URI);
    redirectUrl.searchParams.set('error', 'cancelled');
    return res.redirect(303, redirectUrl.toString());
  }

  const code = String(req.query.code || '');
  if (!code || code.length > 4096) {
    const redirectUrl = new URL(GOOGLE_MOBILE_APP_REDIRECT_URI);
    redirectUrl.searchParams.set('error', 'sign_in_failed');
    return res.redirect(303, redirectUrl.toString());
  }

  try {
    const { tokens } = await googleMobileAuthClient.getToken({
      code,
      codeVerifier: attempt.codeVerifier,
      redirect_uri: GOOGLE_MOBILE_REDIRECT_URI
    });
    if (!tokens.id_token) throw new Error('Google did not return an ID token.');

    const ticket = await googleMobileAuthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified !== true) {
      throw new Error('Google did not verify the account email.');
    }

    for (const [existingTicket, result] of googleMobileAuthTickets) {
      if (result.expiresAt <= Date.now()) googleMobileAuthTickets.delete(existingTicket);
    }

    const handoffTicket = crypto.randomBytes(32).toString('base64url');
    googleMobileAuthTickets.set(handoffTicket, {
      user: buildUser(payload.email),
      expiresAt: Date.now() + GOOGLE_MOBILE_TICKET_TTL_MS
    });
    const appUrl = new URL(GOOGLE_MOBILE_APP_REDIRECT_URI);
    appUrl.searchParams.set('ticket', handoffTicket);
    return res.redirect(303, appUrl.toString());
  } catch (error) {
    console.error('Google mobile sign-in callback failed:', error.message);
    const redirectUrl = new URL(GOOGLE_MOBILE_APP_REDIRECT_URI);
    redirectUrl.searchParams.set('error', 'sign_in_failed');
    return res.redirect(303, redirectUrl.toString());
  }
});

app.post('/api/auth/google/mobile/exchange', (req, res) => {
  const ticket = String(req.body?.ticket || '');
  if (!ticket || ticket.length > 128) {
    return res.status(400).json({ message: 'A valid Google sign-in handoff is required.' });
  }

  const handoff = googleMobileAuthTickets.get(ticket);
  googleMobileAuthTickets.delete(ticket);
  if (!handoff || handoff.expiresAt <= Date.now()) {
    return res.status(401).json({ message: 'Google sign-in expired. Please try again.' });
  }

  return res.json({ user: handoff.user, token: createToken(handoff.user) });
});

const verifyOtpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { message: 'Too many verification attempts. Please wait a few minutes before trying again.' }
});

app.post('/api/auth/verify-otp', verifyOtpLimiter, (req, res) => {
  const { email, otp } = req.body || {};

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const result = verifyOtpRecord(otpStore.get(normalizedEmail), otp);

  if (result.consumed) {
    otpStore.delete(normalizedEmail);
  } else if (result.record) {
    otpStore.set(normalizedEmail, result.record);
  }

  if (!result.ok) {
    return res.status(400).json({ message: result.message });
  }

  const user = buildUser(normalizedEmail);
  return res.json({
    message: 'OTP verified successfully.',
    token: createToken(user),
    user
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: buildUser(req.user.email), role: req.user.role });
});

app.get('/api/data', authenticateToken, (req, res) => {
  const data = ensureDatabase();
  res.set('X-App-Data-Initialized', database.isInitialized() ? 'true' : 'false');
  if (req.user.role === 'admin') return res.json(data);

  const email = String(req.user.email || '').toLowerCase();
  return res.json({
    ...data,
    inquiries: data.inquiries.filter((item) => String(item.userEmail || '').toLowerCase() === email),
    orders: data.orders.filter((item) => String(item.userEmail || '').toLowerCase() === email),
    forms: data.forms.filter((item) => String(item.targetEmail || '').toLowerCase() === email)
  });
});

app.post('/api/data/bootstrap', authenticateToken, requireAdmin, (req, res) => {
  const currentData = ensureDatabase();
  if (database.isInitialized() || hasCatalogData(currentData)) {
    database.markInitialized();
    return res.status(409).json({ message: 'The database has already been initialized.' });
  }

  const nextData = mergeBootstrapData(currentData, req.body || {});
  const stored = saveDatabase(nextData);
  database.markInitialized();
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  return res.json({ message: 'Initial app data imported successfully.', data: stored });
});

app.post('/api/data', authenticateToken, requireAdmin, (req, res) => {
  const payload = req.body || {};
  if (!Object.keys(defaultState).every((collection) => Array.isArray(payload[collection]))) {
    return res.status(400).json({ message: 'All app data collections must be arrays.' });
  }
  const stored = saveDatabase(payload);
  database.markInitialized();
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  res.json({ message: 'Data saved successfully.', data: stored });
});

app.post('/api/inquiries', authenticateToken, (req, res) => {
  const { userEmail, subject, type = 'general', message } = req.body || {};
  const data = ensureDatabase();

  const inquiry = {
    id: Date.now(),
    userEmail: req.user.email,
    subject: subject || 'General Inquiry',
    type,
    message: message || '',
    status: 'Pending',
    reply: '',
    replyAt: ''
  };

  const nextData = {
    ...data,
    inquiries: [inquiry, ...data.inquiries]
  };

  saveDatabase(nextData);
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  res.status(201).json({ message: 'Inquiry submitted successfully.', inquiry, data: nextData });
});

function buildOrderItems(data, items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    const error = new Error('Add between 1 and 50 products to your order.');
    error.statusCode = 400;
    throw error;
  }
  const products = Array.isArray(data.products) ? data.products : [];
  const orderItems = [];
  for (const requestedItem of items) {
    const product = products.find((candidate) => String(candidate.id) === String(requestedItem?.productId));
    const quantity = Number(requestedItem?.quantity);
    if (!product || product.inStock === false || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      const error = new Error('An item in your order is unavailable or has an invalid quantity. Refresh the store and try again.');
      error.statusCode = 400;
      throw error;
    }
    orderItems.push({
      productId: product.id,
      name: product.name,
      quantity,
      price: Number(product.price)
    });
  }
  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!Number.isFinite(total) || total <= 0) {
    const error = new Error('The order total is invalid.');
    error.statusCode = 400;
    throw error;
  }
  return { orderItems, total };
}

app.post('/api/orders/checkout', authenticateToken, (req, res) => {
  try {
    const data = ensureDatabase();
    const customer = normalizeCheckoutCustomer(req.body?.customer || {});
    const { orderItems, total } = buildOrderItems(data, req.body?.items);
    const idempotencyKey = String(req.body?.idempotencyKey || '').slice(0, 80);
    if (idempotencyKey) {
      const existing = (data.orders || []).find((item) => item.idempotencyKey === idempotencyKey && item.userEmail === req.user.email);
      if (existing) {
        return res.json({
          message: 'This checkout is already in progress.',
          order: publicOrder(existing),
          idempotencyKey,
          paymentEnabled: razorpayConfigured(),
          data
        });
      }
    }

    const orderId = crypto.randomUUID();
    const order = {
      id: orderId,
      userEmail: req.user.email,
      items: orderItems,
      customer,
      address: customer.addressText,
      paymentMethod: 'UPI',
      total,
      billNumber: '',
      status: 'Pending Payment',
      idempotencyKey: idempotencyKey || orderId,
      createdAt: new Date().toISOString()
    };
    const nextData = { ...data, orders: [order, ...data.orders] };
    saveDatabase(nextData);
    broadcast('data-updated', { updatedAt: new Date().toISOString() });
    return res.status(201).json({
      message: razorpayConfigured()
        ? 'Order created. Continue to UPI payment.'
        : 'Order created, but UPI payment is not configured on the server yet.',
      order: publicOrder(order),
      idempotencyKey: order.idempotencyKey,
      paymentEnabled: razorpayConfigured(),
      data: nextData
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message || 'Checkout failed.' });
  }
});

app.post('/api/orders/:id/pay', authenticateToken, async (req, res) => {
  const data = ensureDatabase();
  const order = findCollectionRecord(data.orders, req.params.id);
  if (!order || order.userEmail !== req.user.email) {
    return res.status(404).json({ message: 'Order not found.' });
  }
  if (['Paid', 'Confirmed'].includes(order.status)) {
    return res.status(409).json({ message: 'This order is already paid.' });
  }
  if (checkoutLocks.get(order.id)) {
    return res.status(409).json({ message: 'Payment is already being prepared for this order.' });
  }

  checkoutLocks.set(order.id, true);
  try {
    let razorpayOrderId = order.razorpayOrderId;
    if (!razorpayOrderId) {
      const razorpayOrder = await createRazorpayOrder({
        amountPaise: Math.round(Number(order.total) * 100),
        receipt: String(order.id).slice(0, 40),
        notes: { appOrderId: String(order.id) }
      });
      razorpayOrderId = razorpayOrder.id;
      const nextOrder = { ...order, razorpayOrderId, status: 'Pending Payment' };
      saveDatabase({
        ...data,
        orders: data.orders.map((item) => String(item.id) === String(order.id) ? nextOrder : item)
      });
    }
    return res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId,
      amount: Math.round(Number(order.total) * 100),
      currency: 'INR',
      orderId: order.id
    });
  } catch (error) {
    return res.status(error.statusCode || 502).json({ message: error.message || 'Could not start UPI payment.' });
  } finally {
    checkoutLocks.delete(order.id);
  }
});

app.post('/api/orders/:id/verify-payment', authenticateToken, async (req, res) => {
  const data = ensureDatabase();
  const order = findCollectionRecord(data.orders, req.params.id);
  if (!order || order.userEmail !== req.user.email) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  const razorpayOrderId = String(req.body?.razorpayOrderId || '');
  const razorpayPaymentId = String(req.body?.razorpayPaymentId || '');
  const razorpaySignature = String(req.body?.razorpaySignature || '');
  if (!verifyRazorpayCheckoutSignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature })) {
    return res.status(400).json({ message: 'Payment could not be verified.' });
  }

  try {
    const payment = await fetchRazorpayPayment(razorpayPaymentId);
    if (payment.order_id !== razorpayOrderId || !['captured', 'authorized'].includes(payment.status)) {
      return res.status(409).json({ message: 'Payment is not complete yet.' });
    }
    const paidOrder = await markOrderPaid(order, { paymentId: razorpayPaymentId, razorpayOrderId });
    return res.json({ message: 'Payment verified. Your order is paid.', order: publicOrder(paidOrder), data: ensureDatabase() });
  } catch (error) {
    return res.status(error.statusCode || 502).json({ message: error.message || 'Payment verification failed.' });
  }
});

app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const order = findCollectionRecord(ensureDatabase().orders, req.params.id);
  if (!order || (order.userEmail !== req.user.email && req.user.role !== 'admin')) {
    return res.status(404).json({ message: 'Order not found.' });
  }
  return res.json({ order: publicOrder(order) });
});

app.post('/api/orders', authenticateToken, (req, res) => {
  return res.status(410).json({ message: 'Use the checkout page to create an order, then complete UPI payment.' });
});

app.post('/api/admin/orders/:id/confirm-payment', authenticateToken, requireAdmin, async (req, res) => {
  const data = ensureDatabase();
  const order = (data.orders || []).find((item) => String(item.id) === req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }
  if (order.status !== 'Payment Verification Pending' && !(order.status === 'Confirmed' && order.paymentVerifiedAt && order.billNumber)) {
    return res.status(409).json({ message: 'This order is not awaiting payment verification.' });
  }

  const verifiedOrder = order.status === 'Confirmed'
    ? order
    : {
      ...order,
      billNumber: `BILL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      status: 'Confirmed',
      paymentVerifiedAt: new Date().toISOString()
    };
  const confirmedData = order.status === 'Confirmed'
    ? data
    : {
      ...data,
      orders: data.orders.map((item) => String(item.id) === req.params.id ? verifiedOrder : item)
    };
  if (order.status !== 'Confirmed') {
    saveDatabase(confirmedData);
    broadcast('data-updated', { updatedAt: new Date().toISOString() });
  }

  if (verifiedOrder.billEmailSentAt) {
    return res.json({ message: `Payment is verified and the bill was already emailed to ${verifiedOrder.userEmail}.`, order: verifiedOrder, data: confirmedData, emailSent: true });
  }
  if (!EMAIL_CONFIGURED) {
    return res.json({ message: 'Payment is confirmed and the bill is generated, but no email provider is configured.', order: verifiedOrder, data: confirmedData, emailSent: false });
  }

  const itemLines = verifiedOrder.items.map((item) => `${item.name} x ${item.quantity} = INR ${(item.price * item.quantity).toFixed(2)}`).join('\n');
  const emailText = [
    'The Nilgiris Tourism and AR Based Heritage',
    `Payment receipt: ${verifiedOrder.billNumber}`,
    '',
    `Bill number: ${verifiedOrder.billNumber}`,
    `Payment method: UPI`,
    `UPI reference: ${verifiedOrder.paymentReference}`,
    `Order date: ${new Date(verifiedOrder.paymentVerifiedAt).toLocaleString('en-IN')}`,
    '',
    'Items:',
    itemLines,
    '',
    `Total paid: INR ${Number(verifiedOrder.total).toFixed(2)}`,
    `Delivery address: ${verifiedOrder.address}`,
    '',
    'Thank you for supporting Nilgiris artisans.'
  ].join('\n');

  try {
    await sendAppEmail({
      from: `"The Nilgiris Tourism" <${SMTP_USER}>`,
      to: verifiedOrder.userEmail,
      subject: `Your Nilgiris order bill ${verifiedOrder.billNumber}`,
      text: emailText
    });
  } catch (error) {
    console.error('Order bill email failed:', error.message);
    return res.json({
      message: `Payment is confirmed and bill ${verifiedOrder.billNumber} is generated, but the email could not be sent. Use Retry bill email after resolving the mail issue.`,
      order: verifiedOrder,
      data: confirmedData,
      emailSent: false
    });
  }

  const emailedOrder = { ...verifiedOrder, billEmailSentAt: new Date().toISOString() };
  const finalData = {
    ...confirmedData,
    orders: confirmedData.orders.map((item) => String(item.id) === req.params.id ? emailedOrder : item)
  };
  saveDatabase(finalData);
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  res.json({
    message: `Payment verified. Bill ${emailedOrder.billNumber} was emailed to ${emailedOrder.userEmail}.`,
    order: emailedOrder,
    data: finalData,
    emailSent: true
  });
});

app.post('/api/forms/:id/respond', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { answers, userEmail } = req.body || {};
  const data = ensureDatabase();
  const form = (data.forms || []).find((item) => item.id === id);

  if (!form) {
    return res.status(404).json({ message: 'Form not found.' });
  }
  if (String(form.targetEmail || '').toLowerCase() !== String(req.user.email || '').toLowerCase()) {
    return res.status(403).json({ message: 'This form is not assigned to your account.' });
  }

  const responseText = (answers || []).map((answer) => `${answer.question}: ${answer.answer || '(No answer)'}`).join('\n');
  const nextData = {
    ...data,
    forms: (data.forms || []).map((item) => item.id === id ? { ...item, status: 'Answered', response: responseText, answeredAt: new Date().toISOString() } : item),
    inquiries: [
      {
        id: Date.now() + 2,
        userEmail: req.user.email,
        subject: `Form response: ${form.title}`,
        type: 'form',
        message: responseText,
        status: 'Pending',
        reply: '',
        replyAt: ''
      },
      ...data.inquiries
    ]
  };

  saveDatabase(nextData);
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  res.json({ message: 'Form response saved successfully.', form: nextData.forms.find((item) => item.id === id), data: nextData });
});

app.post('/api/admin/products', authenticateToken, requireAdmin, (req, res) => {
  const product = req.body || {};
  const data = ensureDatabase();
  const nextProduct = {
    id: `product-${Date.now()}`,
    name: String(product.name || '').trim(),
    category: product.category || 'General',
    price: Number(product.price || 0),
    mrp: Number(product.mrp || product.price || 0),
    rating: 0,
    reviews: 0,
    image: product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
    description: product.description || 'Nilgiris local product',
    tribe: product.tribe || 'Nilgiris Artisan',
    inStock: product.inStock !== false
  };

  const nextData = { ...data, products: [nextProduct, ...data.products] };
  saveDatabase(nextData);
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  res.status(201).json({ message: 'Product added successfully.', product: nextProduct, data: nextData });
});

app.post('/api/admin/tourism', authenticateToken, requireAdmin, (req, res) => {
  const place = req.body || {};
  const data = ensureDatabase();
  const nextPlace = {
    id: Date.now(),
    name: String(place.name || '').trim(),
    district: place.district || 'Nilgiris',
    taluk: place.taluk || 'Ooty',
    type: place.type || 'Viewpoint',
    rush: place.rush || 'Moderate',
    nearby: Array.isArray(place.nearby) ? place.nearby : String(place.nearby || '').split(',').map((item) => item.trim()).filter(Boolean),
    description: place.description || ''
  };

  const nextData = { ...data, tourismSpots: [nextPlace, ...data.tourismSpots] };
  saveDatabase(nextData);
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  res.status(201).json({ message: 'Tourism place added successfully.', place: nextPlace, data: nextData });
});

app.post('/api/admin/hotels', authenticateToken, requireAdmin, (req, res) => {
  try {
    const data = ensureDatabase();
    const nextHotel = normalizeHotel(req.body || {});
    const nextData = { ...data, hotels: [nextHotel, ...data.hotels] };
    saveDatabase(nextData);
    broadcast('data-updated', { updatedAt: new Date().toISOString() });
    return res.status(201).json({ message: 'Hotel added successfully.', hotel: nextHotel, data: nextData });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
});

app.put('/api/admin/hotels/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const data = ensureDatabase();
    const existing = findCollectionRecord(data.hotels, req.params.id);
    if (!existing) return res.status(404).json({ message: 'Hotel not found.' });
    const nextHotel = normalizeHotel(req.body || {}, existing);
    const nextData = { ...data, hotels: data.hotels.map((item) => String(item.id) === String(existing.id) ? nextHotel : item) };
    saveDatabase(nextData);
    broadcast('data-updated', { updatedAt: new Date().toISOString() });
    return res.json({ message: 'Hotel updated successfully.', hotel: nextHotel, data: nextData });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
});

app.delete('/api/admin/hotels/:id', authenticateToken, requireAdmin, (req, res) => {
  const data = ensureDatabase();
  const existing = findCollectionRecord(data.hotels, req.params.id);
  if (!existing) return res.status(404).json({ message: 'Hotel not found.' });
  const nextData = { ...data, hotels: data.hotels.filter((item) => String(item.id) !== String(existing.id)) };
  saveDatabase(nextData);
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  return res.json({ message: 'Hotel deleted successfully.', data: nextData });
});

app.post('/api/admin/businesses', authenticateToken, requireAdmin, (req, res) => {
  try {
    const data = ensureDatabase();
    const nextBusiness = normalizeBusiness(req.body || {});
    const nextData = { ...data, businesses: [nextBusiness, ...data.businesses] };
    saveDatabase(nextData);
    broadcast('data-updated', { updatedAt: new Date().toISOString() });
    return res.status(201).json({ message: 'Business added successfully.', business: nextBusiness, data: nextData });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
});

app.put('/api/admin/businesses/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const data = ensureDatabase();
    const existing = findCollectionRecord(data.businesses, req.params.id);
    if (!existing) return res.status(404).json({ message: 'Business not found.' });
    const nextBusiness = normalizeBusiness(req.body || {}, existing);
    const nextData = {
      ...data,
      businesses: data.businesses.map((item) => String(item.id) === String(existing.id) ? nextBusiness : item)
    };
    saveDatabase(nextData);
    broadcast('data-updated', { updatedAt: new Date().toISOString() });
    return res.json({ message: 'Business updated successfully.', business: nextBusiness, data: nextData });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
});

app.delete('/api/admin/businesses/:id', authenticateToken, requireAdmin, (req, res) => {
  const data = ensureDatabase();
  const existing = findCollectionRecord(data.businesses, req.params.id);
  if (!existing) return res.status(404).json({ message: 'Business not found.' });
  const nextData = { ...data, businesses: data.businesses.filter((item) => String(item.id) !== String(existing.id)) };
  saveDatabase(nextData);
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  return res.json({ message: 'Business deleted successfully.', data: nextData });
});

app.post('/api/admin/inquiries/:id/reply', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { replyText, status = 'Replied' } = req.body || {};
  const data = ensureDatabase();
  const trimmedReply = String(replyText || '').trim();

  const nextData = {
    ...data,
    inquiries: data.inquiries.map((inquiry) =>
      inquiry.id === Number(id)
        ? { ...inquiry, status, reply: trimmedReply, replyAt: trimmedReply ? new Date().toISOString() : inquiry.replyAt }
        : inquiry
    )
  };

  saveDatabase(nextData);
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  const updated = nextData.inquiries.find((inquiry) => inquiry.id === Number(id));
  res.json({ message: 'Inquiry updated successfully.', inquiry: updated, data: nextData });
});

app.put('/api/admin/inquiries/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const data = ensureDatabase();

  const nextData = {
    ...data,
    inquiries: data.inquiries.map((inquiry) =>
      inquiry.id === Number(id) ? { ...inquiry, status: status || inquiry.status } : inquiry
    )
  };

  saveDatabase(nextData);
  broadcast('data-updated', { updatedAt: new Date().toISOString() });
  res.json({ message: 'Inquiry status updated.', data: nextData });
});

// Public business listing — only published businesses visible to regular users
app.get('/api/businesses', authenticateToken, (req, res) => {
  const data = ensureDatabase();
  const businesses = (data.businesses || []);
  // Admin sees all businesses including unpublished
  if (req.user.role === 'admin') {
    return res.json({ businesses });
  }
  // Regular users only see published businesses
  const published = businesses.filter((b) => b.published !== false);
  return res.json({ businesses: published });
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

app.use(express.static(path.join(__dirname, 'build')));

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'build', 'index.html'));
  }
  next();
});

app.use((error, req, res, next) => {
  console.error('Unexpected server error:', error.message);
  res.status(500).json({ message: 'Internal server error.' });
});

function startServer() {
  ensureDatabase();
  return app.listen(PORT, () => {
    console.log(`Nilgiri Smart Tourism backend running on http://localhost:${PORT}`);
    if (!SMTP_CONFIGURED) {
      console.log('Gmail SMTP not configured.');
    }
    if (!EMAIL_CONFIGURED) {
      console.log('Email delivery is unavailable. Set RESEND_API_KEY and RESEND_FROM_EMAIL, or configure SMTP_USER and SMTP_PASS.');
    } else if (RESEND_CONFIGURED) {
      console.log('Email delivery configured with Resend.');
    }
    if (!razorpayConfigured()) {
      console.log('Razorpay UPI is not configured. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET.');
    }
  });
}

module.exports = { app, startServer };

if (require.main === module) {
  startServer();
}
