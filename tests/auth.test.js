const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nilgiris-auth-api-test-'));
process.env.DATABASE_PATH = path.join(directory, 'app-data.sqlite');
process.env.JWT_SECRET = 'test-jwt-secret-that-is-not-used-outside-tests';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.RESEND_API_KEY = '';
process.env.RESEND_FROM_EMAIL = '';
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';
process.env.GOOGLE_MOBILE_REDIRECT_URI = '';
process.env.REACT_APP_GOOGLE_CLIENT_ID = '';

const { app, closeDatabase } = require('../server');
const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test('requires email OTP for regular users and reserves administrator access for password sign-in', async (context) => {
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    closeDatabase();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const post = (route, body) => fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const sendAdminOtp = await post('/api/auth/send-otp', { email: 'adithya01022007@gmail.com' });
  assert.equal(sendAdminOtp.status, 403);

  const verifyAdminOtp = await post('/api/auth/verify-otp', { email: 'adithya01022007@gmail.com', otp: '123456' });
  assert.equal(verifyAdminOtp.status, 403);

  const guestLogin = await post('/api/auth/guest', { email: 'visitor@example.com' });
  assert.equal(guestLogin.status, 403);

  const passwordLogin = await post('/api/auth/login', { email: 'visitor@example.com', password: 'legacy-password' });
  assert.equal(passwordLogin.status, 403);

  const passwordRegistration = await post('/api/auth/register', { email: 'visitor@example.com', password: 'legacy-password' });
  assert.equal(passwordRegistration.status, 410);

  const unavailableEmailOtp = await post('/api/auth/send-otp', { email: 'visitor@example.com' });
  assert.equal(unavailableEmailOtp.status, 503);

  const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
  assert.equal(health.emailConfigured, false);
});
