const crypto = require('crypto');

function sanitizeText(value, maxLength) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeMultiline(value, maxLength) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function optionalUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.startsWith('data:image/')) return text.slice(0, 2_000_000);
  try {
    const parsed = new URL(text);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString().slice(0, 500);
  } catch {
    return '';
  }
}

function normalizeHotel(input = {}, existing = {}) {
  const name = sanitizeText(input.name ?? existing.name, 120);
  const city = sanitizeText(input.city ?? existing.city, 80) || 'Ooty';
  const description = sanitizeMultiline(input.description ?? existing.description, 800);
  const roomsAvailable = Number(input.roomsAvailable ?? existing.roomsAvailable ?? 0);
  const pricePerNight = Number(input.pricePerNight ?? existing.pricePerNight ?? 0);
  const available = input.available !== undefined ? Boolean(input.available) : existing.available !== false;
  const image = optionalUrl(input.image ?? existing.image);
  const imageOverride = optionalUrl(input.imageOverride ?? existing.imageOverride);

  if (!name) {
    const error = new Error('Enter a hotel name.');
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isFinite(roomsAvailable) || roomsAvailable < 0 || roomsAvailable > 500) {
    const error = new Error('Enter a valid number of rooms.');
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isFinite(pricePerNight) || pricePerNight < 0 || pricePerNight > 500000) {
    const error = new Error('Enter a valid nightly price.');
    error.statusCode = 400;
    throw error;
  }

  return {
    id: existing.id || `hotel-${crypto.randomUUID()}`,
    name,
    city,
    description,
    roomsAvailable: Math.round(roomsAvailable),
    pricePerNight: Math.round(pricePerNight),
    available,
    image,
    imageOverride
  };
}

function normalizeBusiness(input = {}, existing = {}) {
  const name = sanitizeText(input.name ?? existing.name, 120);
  const type = sanitizeText(input.type ?? existing.type, 40) || 'store';
  const category = sanitizeText(input.category ?? existing.category, 80) || 'General';
  const district = sanitizeText(input.district ?? existing.district, 80) || 'Nilgiris';
  const taluk = sanitizeText(input.taluk ?? existing.taluk, 80) || 'Ooty';
  const status = sanitizeText(input.status ?? existing.status, 40) || 'Open';
  const contact = sanitizeText(input.contact ?? existing.contact, 40);
  const address = sanitizeText(input.address ?? existing.address, 200);
  const description = sanitizeMultiline(input.description ?? existing.description, 800);
  const image = optionalUrl(input.image ?? existing.image);
  const mapLink = optionalUrl(input.mapLink ?? existing.mapLink);
  const operatingHours = sanitizeText(input.operatingHours ?? existing.operatingHours, 120);

  // published: admin can explicitly set true/false; defaults to true for backwards compat
  const publishedInput = input.published ?? existing.published;
  const published = publishedInput === undefined ? true : Boolean(publishedInput);

  const allowedTypes = new Set(['store', 'factory', 'hotel', 'restaurant', 'other']);

  if (!name) {
    const error = new Error('Enter a business name.');
    error.statusCode = 400;
    throw error;
  }
  if (contact && !/^[0-9+\-()\s]{6,20}$/.test(contact)) {
    const error = new Error('Enter a valid contact number.');
    error.statusCode = 400;
    throw error;
  }

  return {
    id: existing.id || `business-${crypto.randomUUID()}`,
    type: allowedTypes.has(type) ? type : 'store',
    name,
    district,
    taluk,
    category,
    status,
    contact,
    address,
    description,
    image,
    mapLink,
    operatingHours,
    published
  };
}

function normalizeCheckoutCustomer(input = {}) {
  const fullName = sanitizeText(input.fullName, 80);
  const phone = sanitizeText(input.phone, 15).replace(/\s+/g, '');
  const house = sanitizeText(input.house, 80);
  const street = sanitizeText(input.street, 120);
  const city = sanitizeText(input.city, 80);
  const state = sanitizeText(input.state, 80) || 'Tamil Nadu';
  const pincode = sanitizeText(input.pincode, 6);
  const notes = sanitizeMultiline(input.notes, 300);

  if (!fullName) {
    const error = new Error('Enter the customer full name.');
    error.statusCode = 400;
    throw error;
  }
  if (!/^[6-9]\d{9}$/.test(phone)) {
    const error = new Error('Enter a valid 10-digit Indian mobile number.');
    error.statusCode = 400;
    throw error;
  }
  if (!house || !street || !city) {
    const error = new Error('Enter the complete delivery address.');
    error.statusCode = 400;
    throw error;
  }
  if (!/^\d{6}$/.test(pincode)) {
    const error = new Error('Enter a valid 6-digit PIN code.');
    error.statusCode = 400;
    throw error;
  }

  return {
    fullName,
    phone,
    house,
    street,
    city,
    state,
    pincode,
    notes,
    addressText: `${fullName}, ${phone}, ${house}, ${street}, ${city}, ${state} - ${pincode}`
  };
}

module.exports = {
  sanitizeText,
  normalizeHotel,
  normalizeBusiness,
  normalizeCheckoutCustomer
};
