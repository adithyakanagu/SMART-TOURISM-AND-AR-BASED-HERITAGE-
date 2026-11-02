const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const collections = [
  'products',
  'hotels',
  'taxis',
  'inquiries',
  'orders',
  'tourismSpots',
  'businesses',
  'forms',
  'messages',
  'climateAdvisories'
];

const emptyState = Object.fromEntries(collections.map((name) => [name, []]));

function hasRecords(state) {
  return collections.some((name) => Array.isArray(state[name]) && state[name].length > 0);
}

function createDatabase(databasePath, legacyPath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec('CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  database.exec('CREATE TABLE IF NOT EXISTS auth_otp_state (email TEXT PRIMARY KEY, payload TEXT NOT NULL)');
  database.exec('CREATE TABLE IF NOT EXISTS push_devices (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, token TEXT NOT NULL, updated_at TEXT NOT NULL)');
  database.exec('CREATE INDEX IF NOT EXISTS push_devices_email_idx ON push_devices(email)');
  const readOtpState = database.prepare('SELECT payload FROM auth_otp_state WHERE email = ?');
  const writeOtpState = database.prepare('INSERT OR REPLACE INTO auth_otp_state (email, payload) VALUES (?, ?)');
  const writePushDevice = database.prepare('INSERT OR REPLACE INTO push_devices (token_hash, email, token, updated_at) VALUES (?, ?, ?, ?)');
  const readPushDevices = database.prepare('SELECT email, token FROM push_devices');
  const readUserPushDevices = database.prepare('SELECT email, token FROM push_devices WHERE email = ?');
  const deletePushDevice = database.prepare('DELETE FROM push_devices WHERE token_hash = ? AND email = ?');
  const deletePushDeviceByToken = database.prepare('DELETE FROM push_devices WHERE token_hash = ?');

  for (const collection of collections) {
    database.exec(`CREATE TABLE IF NOT EXISTS ${collection} (id TEXT PRIMARY KEY, payload TEXT NOT NULL)`);
  }

  const metadata = database.prepare('SELECT value FROM app_metadata WHERE key = ?');
  const setMetadata = database.prepare('INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)');
  const reads = Object.fromEntries(collections.map((name) => [
    name,
    database.prepare(`SELECT payload FROM ${name} ORDER BY rowid`)
  ]));
  const deletes = Object.fromEntries(collections.map((name) => [
    name,
    database.prepare(`DELETE FROM ${name}`)
  ]));
  const inserts = Object.fromEntries(collections.map((name) => [
    name,
    database.prepare(`INSERT OR REPLACE INTO ${name} (id, payload) VALUES (?, ?)`)
  ]));

  const read = () => Object.fromEntries(collections.map((name) => [
    name,
    reads[name].all().map(({ payload }) => JSON.parse(payload))
  ]));

  const replaceTransaction = database.transaction((state) => {
    for (const name of collections) {
      deletes[name].run();
      const records = Array.isArray(state[name]) ? state[name] : [];
      for (const record of records) {
        if (!record || typeof record !== 'object' || record.id === undefined || record.id === null) continue;
        inserts[name].run(String(record.id), JSON.stringify(record));
      }
    }
  });

  if (!metadata.get('initialized')) {
    let initialState = emptyState;
    let importedRecords = false;
    if (fs.existsSync(legacyPath)) {
      initialState = { ...emptyState, ...JSON.parse(fs.readFileSync(legacyPath, 'utf8')) };
      importedRecords = hasRecords(initialState);
    }
    replaceTransaction(initialState);
    setMetadata.run('initialized', importedRecords ? '1' : '0');
    if (importedRecords) setMetadata.run('legacy_imported', new Date().toISOString());
  }

  return {
    read,
    replace(state) {
      replaceTransaction(state || emptyState);
      return read();
    },
    getOtpState(email) {
      const row = readOtpState.get(email);
      return row ? JSON.parse(row.payload) : null;
    },
    saveOtpState(email, record, sendLog) {
      writeOtpState.run(email, JSON.stringify({ record, sendLog }));
    },
    registerPushDevice(email, token) {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      writePushDevice.run(tokenHash, normalizedEmail, token, new Date().toISOString());
    },
    getPushDevices(email) {
      const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
      return normalizedEmail ? readUserPushDevices.all(normalizedEmail) : readPushDevices.all();
    },
    removePushDevice(email, token) {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      return deletePushDevice.run(tokenHash, normalizedEmail).changes > 0;
    },
    removePushDeviceByToken(token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      return deletePushDeviceByToken.run(tokenHash).changes > 0;
    },
    isInitialized() {
      return metadata.get('initialized')?.value === '1';
    },
    markInitialized() {
      setMetadata.run('initialized', '1');
    },
    close() {
      database.close();
    }
  };
}

module.exports = { createDatabase };