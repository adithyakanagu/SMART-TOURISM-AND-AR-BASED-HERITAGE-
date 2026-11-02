const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createDatabase } = require('../database');

test('persists one-time codes and resend limits across database restarts and data updates', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nilgiris-auth-test-'));
  const databasePath = path.join(directory, 'app-data.sqlite');
  const legacyPath = path.join(directory, 'missing-legacy-data.json');
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const firstDatabase = createDatabase(databasePath, legacyPath);
  const otpState = {
    record: { hash: 'hashed-code', salt: 'salt', expiresAt: Date.now() + 300000, attempts: 0 },
    sendLog: [Date.now()]
  };
  firstDatabase.saveOtpState('visitor@example.com', otpState.record, otpState.sendLog);
  firstDatabase.replace({
    products: [{ id: 'item-1', name: 'Tea' }],
    hotels: [],
    taxis: [],
    inquiries: [],
    orders: [],
    tourismSpots: [],
    businesses: [],
    forms: [],
    messages: [{ id: 'message-1', channel: 'conversation', fromEmail: 'visitor@example.com', toEmail: 'admin@example.com', body: 'Hello' }],
    climateAdvisories: []
  });
  firstDatabase.markInitialized();
  firstDatabase.close();

  const restartedDatabase = createDatabase(databasePath, legacyPath);
  try {
    assert.deepEqual(restartedDatabase.getOtpState('visitor@example.com'), otpState);
    assert.equal(restartedDatabase.read().products.length, 1);
    assert.equal(restartedDatabase.read().messages[0].body, 'Hello');
  } finally {
    restartedDatabase.close();
  }
});

test('stores push devices per account and removes only the matching account token', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nilgiris-push-test-'));
  const databasePath = path.join(directory, 'app-data.sqlite');
  const legacyPath = path.join(directory, 'missing-legacy-data.json');
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  let database = createDatabase(databasePath, legacyPath);
  try {
    database.registerPushDevice('Visitor@Example.com', 'visitor-fcm-token-123456789012345');
    database.registerPushDevice('admin@example.com', 'admin-fcm-token-123456789012345');
    assert.deepEqual(database.getPushDevices('visitor@example.com'), [{
      email: 'visitor@example.com',
      token: 'visitor-fcm-token-123456789012345'
    }]);
    assert.equal(database.removePushDevice('other@example.com', 'visitor-fcm-token-123456789012345'), false);
    assert.equal(database.removePushDevice('visitor@example.com', 'visitor-fcm-token-123456789012345'), true);
  } finally {
    database.close();
  }

  database = createDatabase(databasePath, legacyPath);
  try {
    assert.deepEqual(database.getPushDevices('visitor@example.com'), []);
    assert.deepEqual(database.getPushDevices(), [{
      email: 'admin@example.com',
      token: 'admin-fcm-token-123456789012345'
    }]);
  } finally {
    database.close();
  }
});
