const crypto = require('crypto');

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 45 * 1000;
const OTP_SEND_WINDOW_MS = 15 * 60 * 1000;
const OTP_SEND_MAX = 5;

function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

function hashOtp(code, salt) {
  return crypto.createHmac('sha256', salt).update(String(code)).digest('hex');
}

function createOtpRecord(code, now = Date.now()) {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    hash: hashOtp(code, salt),
    salt,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    sentAt: now
  };
}

function canResendOtp(record, now = Date.now()) {
  if (!record) return { ok: true };
  const waitMs = OTP_RESEND_COOLDOWN_MS - (now - Number(record.sentAt || 0));
  if (waitMs > 0) {
    return { ok: false, message: 'Please wait before requesting another code.', retryAfterMs: waitMs };
  }
  return { ok: true };
}

function registerSendAttempt(sendLog = [], now = Date.now()) {
  const recent = sendLog.filter((timestamp) => now - timestamp < OTP_SEND_WINDOW_MS);
  if (recent.length >= OTP_SEND_MAX) {
    return { ok: false, sendLog: recent, message: 'Too many codes were requested for this email. Please wait and try again.' };
  }
  return { ok: true, sendLog: [...recent, now] };
}

function hashesMatch(expectedHex, actualHex) {
  const expected = Buffer.from(String(expectedHex || ''), 'hex');
  const actual = Buffer.from(String(actualHex || ''), 'hex');
  if (expected.length === 0 || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function verifyOtpRecord(record, code, now = Date.now()) {
  if (!record) {
    return { ok: false, consumed: false, message: 'OTP not found or expired. Please request a new one.' };
  }
  if (now > record.expiresAt) {
    return { ok: false, consumed: true, message: 'OTP expired. Please request a new one.' };
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, consumed: true, message: 'Too many incorrect attempts. Please request a new code.' };
  }

  const nextAttempts = record.attempts + 1;
  const submitted = String(code || '').trim();
  if (!/^\d{6}$/.test(submitted) || !hashesMatch(record.hash, hashOtp(submitted, record.salt))) {
    const locked = nextAttempts >= OTP_MAX_ATTEMPTS;
    return {
      ok: false,
      consumed: locked,
      record: { ...record, attempts: nextAttempts },
      message: locked
        ? 'Too many incorrect attempts. Please request a new code.'
        : 'Invalid OTP. Please try again.'
    };
  }

  return { ok: true, consumed: true };
}

module.exports = {
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  generateOtp,
  createOtpRecord,
  canResendOtp,
  registerSendAttempt,
  verifyOtpRecord
};
