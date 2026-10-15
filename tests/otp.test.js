const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateOtp,
  createOtpRecord,
  canResendOtp,
  registerSendAttempt,
  verifyOtpRecord,
  OTP_RESEND_COOLDOWN_MS
} = require('../otp');

test('generates a 6-digit OTP without a predictable sequence', () => {
  const codes = new Set(Array.from({ length: 20 }, () => generateOtp()));
  assert.equal([...codes].every((code) => /^\d{6}$/.test(code)), true);
  assert.ok(codes.size > 1);
});

test('stores a hashed OTP and rejects reuse after success', () => {
  const record = createOtpRecord('123456', 1_000);
  assert.equal(record.hash.includes('123456'), false);
  const success = verifyOtpRecord(record, '123456', 1_100);
  assert.equal(success.ok, true);
  assert.equal(success.consumed, true);
});

test('rejects incorrect codes and locks after too many attempts', () => {
  let record = createOtpRecord('654321', 1_000);
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const result = verifyOtpRecord(record, '000000', 1_100);
    assert.equal(result.ok, false);
    record = result.record;
  }
  const locked = verifyOtpRecord(record, '000000', 1_100);
  assert.equal(locked.ok, false);
  assert.equal(locked.consumed, true);
  assert.match(locked.message, /too many incorrect/i);
});

test('expires OTPs and enforces resend limits', () => {
  const record = createOtpRecord('111222', 1_000);
  const expired = verifyOtpRecord(record, '111222', 1_000 + (6 * 60 * 1000));
  assert.equal(expired.ok, false);
  assert.equal(expired.consumed, true);

  const cooldown = canResendOtp(record, 1_000 + 1_000);
  assert.equal(cooldown.ok, false);
  assert.ok(cooldown.retryAfterMs > 0);
  assert.equal(canResendOtp(record, 1_000 + OTP_RESEND_COOLDOWN_MS + 1).ok, true);

  const sendLog = [1, 2, 3, 4, 5];
  const blocked = registerSendAttempt(sendLog, 1_000);
  assert.equal(blocked.ok, false);
});
