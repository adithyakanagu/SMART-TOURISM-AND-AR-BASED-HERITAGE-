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
    climateAdvisories: []
  });
  firstDatabase.markInitialized();
  firstDatabase.close();

  const restartedDatabase = createDatabase(databasePath, legacyPath);
  try {
    assert.deepEqual(restartedDatabase.getOtpState('visitor@example.com'), otpState);
    assert.equal(restartedDatabase.read().products.length, 1);
  } finally {
    restartedDatabase.close();
  }
});
