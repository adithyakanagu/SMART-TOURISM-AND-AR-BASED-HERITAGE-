const ADMIN_EMAIL_VALUE = 'adithya01022007@gmail.com';

const defaultProducts = [
  {
    id: 1,
    name: 'Toda Embroidery Shawl',
    category: 'Textiles',
    price: 2499,
    mrp: 2999,
    rating: 4.8,
    reviews: 124,
    image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=500',
    description: 'Handcrafted traditional Toda embroidery shawl with red and black patterns',
    tribe: 'Toda',
    inStock: true
  },
  {
    id: 2,
    name: 'Nilgiri Wild Forest Honey',
    category: 'Food & Beverages',
    price: 599,
    mrp: 699,
    rating: 4.9,
    reviews: 256,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500',
    description: 'Pure, raw forest honey collected by Kurumba honey hunters',
    tribe: 'Kurumba',
    inStock: true
  },
  {
    id: 3,
    name: 'Kota Handmade Pottery Set',
    category: 'Handicrafts',
    price: 1899,
    mrp: 2200,
    rating: 4.7,
    reviews: 89,
    image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500',
    description: 'Traditional Kota pottery set, handcrafted by skilled artisans',
    tribe: 'Kota',
    inStock: true
  },
  {
    id: 4,
    name: 'Tribal Wall Painting',
    category: 'Art & Paintings',
    price: 3499,
    mrp: 4000,
    rating: 4.6,
    reviews: 67,
    image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=500',
    description: 'Original Nilgiri tribal art painting on canvas',
    tribe: 'Toda',
    inStock: true
  },
  {
    id: 5,
    name: 'Bamboo Basket - Traditional',
    category: 'Handicrafts',
    price: 799,
    mrp: 950,
    rating: 4.5,
    reviews: 143,
    image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=500',
    description: 'Eco-friendly handwoven bamboo basket by tribal artisans',
    tribe: 'Kurumba',
    inStock: true
  },
  {
    id: 6,
    name: 'Nilgiri Tea Gift Box',
    category: 'Food & Beverages',
    price: 899,
    mrp: 1100,
    rating: 4.8,
    reviews: 312,
    image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=500',
    description: 'Premium organic Nilgiri tea collection - 4 varieties',
    tribe: 'Badaga',
    inStock: true
  },
  {
    id: 7,
    name: 'Irula Herbal Medicine Kit',
    category: 'Wellness',
    price: 1299,
    mrp: 1500,
    rating: 4.6,
    reviews: 78,
    image: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=500',
    description: 'Traditional herbal remedies prepared using forest herbs',
    tribe: 'Irula',
    inStock: true
  },
  {
    id: 8,
    name: 'Handwoven Tribal Bag',
    category: 'Textiles',
    price: 1499,
    mrp: 1800,
    rating: 4.7,
    reviews: 95,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
    description: 'Colorful handwoven bag with traditional tribal motifs',
    tribe: 'Paniya',
    inStock: true
  },
  {
    id: 9,
    name: 'Tea Powder Premium',
    category: 'Food & Beverages',
    price: 420,
    mrp: 520,
    rating: 4.8,
    reviews: 186,
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500',
    description: 'Freshly processed premium tea powder from Nilgiri plantations',
    tribe: 'Badaga',
    inStock: true
  },
  {
    id: 10,
    name: 'Ooty Chocolate',
    category: 'Food & Beverages',
    price: 310,
    mrp: 380,
    rating: 4.9,
    reviews: 244,
    image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=500',
    description: 'Handcrafted Ooty chocolate with cocoa notes and local flavor',
    tribe: 'Badaga',
    inStock: true
  },
  {
    id: 11,
    name: 'Eucalyptus Oil',
    category: 'Wellness',
    price: 540,
    mrp: 650,
    rating: 4.7,
    reviews: 135,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500',
    description: 'Pure eucalyptus oil extracted from Nilgiri plantations',
    tribe: 'Kurumba',
    inStock: true
  }
];

const defaultHotels = [
  { id: 1, name: 'Hill Crest Residency', city: 'Ooty', roomsAvailable: 12, pricePerNight: 4200, available: true },
  { id: 2, name: 'Tea Valley Stay', city: 'Coonoor', roomsAvailable: 8, pricePerNight: 3600, available: true },
  { id: 3, name: 'Misty Ridge Lodge', city: 'Kotagiri', roomsAvailable: 5, pricePerNight: 3100, available: true },
  { id: 4, name: 'Forest View Homestay', city: 'Gudalur', roomsAvailable: 6, pricePerNight: 2900, available: true }
];

const defaultTaxis = [
  { id: 1, name: 'Standard Sedan', available: true, pricePerTrip: 1800 },
  { id: 2, name: 'SUV Explorer', available: true, pricePerTrip: 2600 },
  { id: 3, name: 'Mini Van', available: true, pricePerTrip: 3200 },
  { id: 4, name: 'Luxury Ride', available: false, pricePerTrip: 4200 }
];

const defaultInquiries = [
  {
    id: 1,
    userEmail: 'ravi@example.com',
    subject: 'Hotel Booking Query',
    type: 'hotel',
    message: 'Need a family room for 3 nights in Ooty and want early check-in.',
    status: 'Pending',
    reply: '',
    replyAt: ''
  },
  {
    id: 2,
    userEmail: 'meera@example.com',
    subject: 'Taxi Booking Request',
    type: 'taxi',
    message: 'Please arrange a pickup from Coimbatore airport for 2 adults.',
    status: 'Pending',
    reply: '',
    replyAt: ''
  },
  {
    id: 3,
    userEmail: 'arun@example.com',
    subject: 'Tea Powder Order',
    type: 'product',
    message: 'Need 3 packs of premium tea powder and an extra chocolate box.',
    status: 'In Review',
    reply: 'We can arrange premium tea powder delivery within 48 hours. Please confirm the quantity and address.',
    replyAt: '2026-09-11T10:00:00.000Z'
  },
  {
    id: 4,
    userEmail: 'sneha@example.com',
    subject: 'Heritage Story Inquiry',
    type: 'heritage',
    message: 'Looking for more details on the local tribal heritage and historical stories.',
    status: 'Resolved',
    reply: 'We have shared the heritage guide and local story map for your visit.',
    replyAt: '2026-09-10T14:00:00.000Z'
  }
];

const defaultTourismSpots = [
  {
    id: 1,
    name: 'Ooty Lake',
    district: 'Nilgiris',
    taluk: 'Ooty',
    type: 'Lake',
    rush: 'Moderate',
    nearby: ['Rose Garden', 'Tea Museum', 'Charing Cross'],
    description: 'Popular boating spot surrounded by scenic hills.'
  },
  {
    id: 2,
    name: 'Doddabetta Peak',
    district: 'Nilgiris',
    taluk: 'Ooty',
    type: 'Viewpoint',
    rush: 'High',
    nearby: ['Botanical Garden', 'Tea Factory', 'Cafe 9'],
    description: 'Highest peak in the Nilgiris with panoramic mountain views.'
  },
  {
    id: 3,
    name: 'Dolphin Nose',
    district: 'Nilgiris',
    taluk: 'Coonoor',
    type: 'Viewpoint',
    rush: 'Moderate',
    nearby: ['Sim Park', 'Coonoor Market', 'Cafes'],
    description: 'Famous hilltop view famous for its dolphin-shaped ridge.'
  },
  {
    id: 4,
    name: 'Catherine Falls',
    district: 'Nilgiris',
    taluk: 'Kotagiri',
    type: 'Waterfall',
    rush: 'Low',
    nearby: ['Longwood Shola', 'Tea Estate', 'Forest Trails'],
    description: 'A refreshing waterfall with a scenic forest setting.'
  }
];

const additionalTourismSpots = [
  // Ooty
  ['Government Botanical Garden', 'Ooty', 'Nature', 'High', 'Botanical garden with rare plants, flowers and landscaped walking paths.', 'Plant identification AR and ecological importance'],
  ['Government Rose Garden', 'Ooty', 'Nature', 'High', 'Terraced garden with a large collection of roses and mountain views.', 'AR plant guide and seasonal flower story'],
  ['Pine Forest', 'Ooty', 'Nature', 'Moderate', 'Scenic pine-covered landscape suitable for photography and nature walks.', 'Native versus introduced tree AR guide'],
  ['Wenlock Downs', 'Ooty', 'Nature', 'Moderate', 'Open grassland landscape ideal for sightseeing and responsible nature tourism.', 'Nilgiri grassland ecosystem AR'],
  ['9th Mile Shooting Point', 'Ooty', 'Viewpoint', 'High', 'Scenic grassland and mountain viewpoint.', 'Landscape identification AR'],
  ['Needle Rock View Point', 'Ooty', 'Viewpoint', 'Moderate', 'Viewpoint offering wide views of valleys and mountains.', 'Valley and altitude overlay'],
  ['Pine Forest', 'Ooty', 'Nature', 'Moderate', 'Scenic pine-covered landscape popular for photography.', 'Forest species AR guide'],
  ['St. Stephen\'s Church', 'Ooty', 'Heritage', 'Low', 'Historic church known for colonial architecture.', 'Past-to-present heritage timeline'],
  ['Stone House', 'Ooty', 'Heritage', 'Low', 'Early European-built structure and important colonial heritage site.', 'Colonial history AR reconstruction'],
  ['Toda Huts', 'Ooty', 'Tribal Heritage', 'Low', 'Traditional Toda community architecture and cultural landscape.', 'Responsible cultural heritage story'],
  ['Tribal Research Centre', 'Ooty', 'Tribal Heritage', 'Low', 'Institution connected with the study and preservation of Nilgiris tribal communities.', 'Tribal heritage knowledge AR'],
  ['Ooty Tea Factory & Tea Museum', 'Ooty', 'Tea Tourism', 'Moderate', 'Tea cultivation and processing experience.', 'Leaf to finished tea AR journey'],
  ['Thread Garden', 'Ooty', 'Family', 'Moderate', 'Unique artificial flower and plant display created using thread.', 'Craft process AR story'],
  ['Emerald Valley', 'Ooty', 'Hidden Gem', 'Low', 'Quiet mountain and agricultural landscape around Emerald.', 'Responsible rural landscape AR'],
  ['Ketti Valley Villages', 'Ooty', 'Community Tourism', 'Low', 'Local agriculture, tea plantations and rural Nilgiri landscape.', 'Community and farming AR story'],

  // Coonoor
  ['Sim\'s Park', 'Coonoor', 'Botanical Garden', 'High', 'Botanical garden with diverse plants, shaded paths and seasonal flower displays.', 'What plant is this? AR identification'],
  ['Lamb\'s Rock', 'Coonoor', 'Viewpoint', 'High', 'View towards the Coimbatore plains with forest and mountain surroundings.', 'Plains, mountains and forest AR overlay'],
  ['Dolphin\'s Nose', 'Coonoor', 'Viewpoint', 'High', 'Rocky viewpoint with valleys, tea estates and views towards Catherine Falls.', 'Dolphin-shaped rock formation story'],
  ['Lady Canning\'s Seat', 'Coonoor', 'Viewpoint', 'Low', 'Quieter viewpoint with mountain and valley scenery.', 'Peaceful spot recommendation'],
  ['Hidden Valley', 'Coonoor', 'Hidden Gem', 'Low', 'Secluded natural area with dense vegetation and trekking possibilities.', 'Crowd, difficulty and guide advisory'],
  ['Droog Fort', 'Coonoor', 'Heritage', 'Moderate', 'Historic mountain ruins associated with Tipu Sultan\'s period.', 'AR historical fort reconstruction'],
  ['Law\'s Falls', 'Coonoor', 'Waterfall', 'Moderate', 'Scenic waterfall surrounded by forest on the Coonoor-Mettupalayam side.', 'Slippery-rock and rainfall safety AR'],
  ['Ketti Valley View', 'Coonoor', 'Viewpoint', 'Moderate', 'Panoramic valley landscape with tea plantations, farms and villages.', 'Tea, farming and valley geography AR'],
  ['Tiger Hill', 'Coonoor', 'Nature', 'Low', 'Quiet mountain area with walking and trekking opportunities.', 'Sunrise and crowd recommendation'],
  ['Wellington Cantonment', 'Coonoor', 'Heritage', 'Low', 'Historic cantonment with military and colonial heritage.', 'Colonial-to-modern timeline AR'],
  ['Wellington Lake', 'Coonoor', 'Lake', 'Low', 'Quiet water body with mountain surroundings and scenic views.', 'Water-resource awareness AR'],
  ['Nilgiri Mountain Railway', 'Coonoor', 'Heritage', 'High', 'UNESCO World Heritage railway with tunnels, bridges, tea gardens and mountain scenery.', 'Locomotive history and route AR'],
  ['Coonoor Railway Station', 'Coonoor', 'Heritage', 'High', 'Historic station associated with the Nilgiri Mountain Railway.', 'Railway architecture and timeline AR'],
  ['Highfield Tea Factory', 'Coonoor', 'Tea Tourism', 'Moderate', 'Tea processing experience from leaves through sorting and packing.', 'Leaf, processing and finished tea AR'],
  ['Coonoor Tea Estates', 'Coonoor', 'Tea Tourism', 'Moderate', 'Tea gardens and plantation landscapes forming a scenic tea trail.', 'Tea worker and production story'],
  ['Coonoor Golf Course', 'Coonoor', 'Heritage Recreation', 'Low', 'Mountain golf course and colonial-era recreational landscape.', 'Colonial recreation heritage AR'],
  ['St. George\'s Church', 'Coonoor', 'Heritage', 'Low', 'Historic church with colonial architecture and local heritage value.', 'Past-to-present architecture AR'],
  ['All Saints\' Church', 'Coonoor', 'Heritage', 'Low', 'Historic religious and architectural heritage location.', 'Architecture and cultural timeline AR'],
  ['Ketti', 'Coonoor', 'Community Tourism', 'Low', 'Valley, agriculture, tea estates and local settlements.', 'Life in the Nilgiri valley AR'],
  ['Burliar', 'Coonoor', 'Forest', 'Moderate', 'Scenic mountain route showing changing elevation and vegetation.', 'Plains-to-mountain ecosystem AR'],
  ['Ralliah Dam Area', 'Coonoor', 'Nature Zone', 'Low', 'Nature and water-resource location with possible access restrictions.', 'Water resource story with access advisory'],
  ['Mettupalayam-Coonoor Ghat Road', 'Coonoor', 'Scenic Route', 'High', 'Mountain road with hairpin bends, forest and changing vegetation.', 'AR elevation journey'],

  // Kundah
  ['Avalanche Valley', 'Kundah', 'Nature', 'Moderate', 'Natural valley with forests, streams and mountain landscapes.', 'Responsible ecosystem AR'],
  ['Parsons Valley', 'Kundah', 'Nature', 'Low', 'High-altitude valley surrounded by shola forests and grasslands.', 'Shola-grassland ecosystem AR'],
  ['Parsons Dam', 'Kundah', 'Water Resource', 'Low', 'Mountain water-resource landscape surrounded by natural vegetation.', 'Water resources AR story'],
  ['Mukurthi National Park', 'Kundah', 'Wildlife', 'Moderate', 'Protected high-altitude ecosystem famous for shola forests and Nilgiri Tahr.', 'Nilgiri Tahr and biodiversity AR'],
  ['Porthimund', 'Kundah', 'Hidden Gem', 'Low', 'Remote mountain settlement surrounded by tea plantations and forests.', 'Permission-based community tourism'],
  ['Glenmorgan View Point', 'Kundah', 'Viewpoint', 'Moderate', 'Panoramic mountain viewpoint near tea estates and forests.', 'Mountain landscape AR overlay'],
  ['Kundah Dam', 'Kundah', 'Water Resource', 'Low', 'Dam and mountain landscape associated with the Kundah hydroelectric region.', 'Hydroelectric infrastructure AR'],
  ['Western Catchment', 'Kundah', 'Nature Zone', 'Low', 'High-altitude grassland landscape with ecological importance.', 'Controlled eco-tourism advisory'],
  ['Pykara Waterfalls', 'Kundah', 'Waterfall', 'High', 'Scenic waterfall surrounded by forest and mountain terrain.', 'Water cycle and safety AR'],
  ['Pykara Lake', 'Kundah', 'Lake', 'High', 'Mountain lake offering boating and scenic tourism.', 'Lake ecology AR'],
  ['Wenlock Downs Region', 'Kundah', 'Nature', 'Moderate', 'Open grassland landscape suitable for photography and nature tourism.', 'Grassland ecology AR'],

  // Pandalur
  ['Pandalur', 'Pandalur', 'Nature', 'Moderate', 'Mountain town surrounded by tea plantations, forests and rural landscapes.', 'Town and plantation heritage AR'],
  ['Cherambadi', 'Pandalur', 'Tea Tourism', 'Low', 'Historic tea-growing region with plantations and forest surroundings.', 'Plantation heritage AR'],
  ['Nelliyalam', 'Pandalur', 'Hidden Gem', 'Low', 'Scenic mountain region known for tea estates, forests and biodiversity.', 'Responsible forest tourism AR'],
  ['Devala', 'Pandalur', 'Tea Tourism', 'Low', 'Quiet tea-estate region with mountain and plantation landscapes.', 'Tea landscape story'],
  ['Ayyankolli', 'Pandalur', 'Community Tourism', 'Low', 'Rural region surrounded by tea plantations and forest landscapes.', 'Village tourism AR'],
  ['Pandalur Tea Estates', 'Pandalur', 'Tea Tourism', 'Moderate', 'Extensive tea-growing landscape representing Nilgiri agricultural heritage.', 'Tea cultivation AR journey'],
  ['Nelliyalam Forest Landscape', 'Pandalur', 'Forest', 'Low', 'Forest environment with rich biodiversity.', 'Biodiversity identification AR'],
  ['Moyar Region', 'Pandalur', 'Wildlife', 'Low', 'Wildlife and forest landscape connected to the wider Mudumalai-Moyar ecosystem.', 'Forest department access advisory'],
  ['Tea Plantation Villages', 'Pandalur', 'Community Tourism', 'Low', 'Rural communities and plantation landscapes suitable for permission-based tourism.', 'Community and tea worker story'],

  // Gudalur
  ['Gudalur', 'Gudalur', 'Nature', 'Moderate', 'Town surrounded by tea plantations, forests and multicultural communities.', 'Community landscape AR'],
  ['Mudumalai Tiger Reserve', 'Gudalur', 'Wildlife', 'High', 'Protected forest ecosystem known for elephants, tigers, deer and biodiversity.', 'Wildlife AR with strict access advisory'],
  ['Theppakadu', 'Gudalur', 'Wildlife', 'High', 'Gateway and tourism area associated with Mudumalai Tiger Reserve.', 'Reserve orientation AR'],
  ['Theppakadu Elephant Camp', 'Gudalur', 'Wildlife', 'High', 'Elephant conservation attraction associated with Mudumalai.', 'Elephant conservation AR'],
  ['Moyar Gorge', 'Gudalur', 'Wildlife', 'Low', 'Dramatic gorge and wildlife landscape in the wider Mudumalai region.', 'Protected landscape AR'],
  ['Moyar River', 'Gudalur', 'Nature', 'Low', 'Important river ecosystem flowing through the wildlife landscape.', 'River ecology AR'],
  ['Masinagudi', 'Gudalur', 'Wildlife', 'High', 'Forest and wildlife tourism region close to Mudumalai.', 'Wildlife safety and responsible tourism'],
  ['Singara', 'Gudalur', 'Forest', 'Low', 'Forested mountain region known for its natural landscape and biodiversity.', 'Forest biodiversity AR'],
  ['Gudalur Tea Estates', 'Gudalur', 'Tea Tourism', 'Moderate', 'Large tea-growing landscapes around Gudalur.', 'Tea production AR'],
  ['Nellakotta', 'Gudalur', 'Community Tourism', 'Low', 'Rural mountain area with forests, tea plantations and agriculture.', 'Rural landscape AR'],
  ['O\' Valley', 'Gudalur', 'Hidden Gem', 'Low', 'Quiet tea-estate and mountain landscape.', 'Hidden gem discovery AR'],
  ['Cherangode', 'Gudalur', 'Tea Tourism', 'Low', 'Rural plantation landscape with tea estates and surrounding hills.', 'Tea trail AR'],
  ['Toda Cultural Heritage', 'Gudalur', 'Tribal Heritage', 'Low', 'Toda traditions, architecture, embroidery and lifestyle, visited respectfully with permission.', 'Responsible cultural heritage AR'],
  ['Paniya Cultural Heritage', 'Gudalur', 'Tribal Heritage', 'Low', 'Paniya traditional lifestyle and cultural heritage in the Nilgiris region.', 'Community-led heritage AR'],
  ['Irula Cultural Heritage', 'Gudalur', 'Tribal Heritage', 'Low', 'Irula traditional knowledge, lifestyle and cultural practices.', 'Permission-based knowledge story'],
  ['Kurumba Cultural Heritage', 'Gudalur', 'Tribal Heritage', 'Low', 'Kurumba culture, art and indigenous knowledge.', 'Responsible community heritage AR'],

  // Kotagiri
  ['Kotagiri', 'Kotagiri', 'Nature', 'Moderate', 'Scenic hill town surrounded by tea plantations, forests and mountains.', 'Hill-town geography AR'],
  ['Catherine Falls', 'Kotagiri', 'Waterfall', 'High', 'Major waterfall with a scenic mountain setting.', 'Waterfall geography and safety AR'],
  ['Kodanadu View Point', 'Kotagiri', 'Viewpoint', 'High', 'Famous viewpoint offering panoramic valley and plains views.', 'Valley identification AR'],
  ['Kodanadu Tea Estate Region', 'Kotagiri', 'Tea Tourism', 'Moderate', 'Tea plantations and mountain scenery around Kodanadu.', 'Tea landscape AR'],
  ['Longwood Shola', 'Kotagiri', 'Forest', 'Low', 'Important shola forest ecosystem with rich biodiversity.', 'Biodiversity storytelling AR'],
  ['Elk Falls', 'Kotagiri', 'Waterfall', 'Low', 'Seasonal waterfall and natural landscape near Kotagiri.', 'Rainfall and safety advisory'],
  ['John Sullivan Memorial', 'Kotagiri', 'Heritage', 'Low', 'Heritage site associated with early colonial history of the Nilgiris.', 'Historical timeline AR'],
  ['Rangaswamy Peak', 'Kotagiri', 'Mountain', 'Low', 'Prominent mountain peak with cultural and geographical importance.', 'Mountain formation AR'],
  ['Rangaswamy Pillar', 'Kotagiri', 'Nature', 'Low', 'Distinctive natural rock formation associated with local traditions.', 'Geology and local story AR'],
  ['Longwood Shola Reserve Forest', 'Kotagiri', 'Forest', 'Low', 'Protected shola forest ecosystem important for biodiversity.', 'Forest access advisory and species AR'],
  ['Kotagiri Tea Estates', 'Kotagiri', 'Tea Tourism', 'Moderate', 'Extensive tea plantations and scenic estate landscapes.', 'Tea trail AR'],
  ['Kodanadu Village', 'Kotagiri', 'Community Tourism', 'Low', 'Rural community landscape surrounded by plantations and mountains.', 'Responsible village tourism AR'],
  ['Ketti Valley-Kotagiri Landscape', 'Kotagiri', 'Nature', 'Moderate', 'Mountain valley, agriculture and tea-growing environment.', 'Agriculture and valley geography AR'],
  ['Toda Cultural Heritage', 'Kotagiri', 'Tribal Heritage', 'Low', 'Toda architecture, embroidery, culture and lifestyle with prior permission.', 'Responsible cultural heritage AR'],
  ['Badaga Cultural Heritage', 'Kotagiri', 'Cultural Heritage', 'Low', 'Badaga language, traditional houses, festivals, food and agricultural history.', 'Community-led culture AR'],
  ['Badaga Villages', 'Kotagiri', 'Community Tourism', 'Low', 'Traditional settlements and agricultural landscapes around Kotagiri.', 'Permission-based village experience']
].map(([name, taluk, type, rush, description, arExperience]) => ({
  id: `catalog-${taluk.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  district: 'Nilgiris',
  taluk,
  type,
  rush,
  nearby: [],
  description,
  arExperience,
  accessNote: type.includes('Wildlife') || type.includes('Tribal') || type.includes('Forest') ? 'Permission or Forest Department access may be required. Verify current access before visiting.' : ''
}));

const allDefaultTourismSpots = [...defaultTourismSpots, ...additionalTourismSpots];

const defaultBusinesses = [
  {
    id: 1,
    type: 'store',
    name: 'Tea Heritage Store',
    district: 'Nilgiris',
    taluk: 'Ooty',
    category: 'Tea & Gifts',
    status: 'Open',
    contact: '9876543210'
  },
  {
    id: 2,
    type: 'factory',
    name: 'Silver Cloud Tea Factory',
    district: 'Nilgiris',
    taluk: 'Coonoor',
    category: 'Tea Processing',
    status: 'Open',
    contact: '9865432109'
  },
  {
    id: 3,
    type: 'hotel',
    name: 'Misty Valley Resort',
    district: 'Nilgiris',
    taluk: 'Kotagiri',
    category: 'Stay',
    status: 'Available',
    contact: '9898001122'
  }
];

const defaultOrders = [
  {
    id: 1,
    userEmail: 'demo@example.com',
    items: [{ name: 'Nilgiri Tea Gift Box', quantity: 1, price: 899 }],
    address: '12, Hill View Road, Ooty',
    paymentMethod: 'UPI',
    total: 899,
    billNumber: 'BILL-1001',
    status: 'Confirmed',
    createdAt: '2026-09-11T08:30:00.000Z'
  }
];

const defaultForms = [];

const getDefaultState = () => ({
  products: defaultProducts,
  hotels: defaultHotels,
  taxis: defaultTaxis,
  inquiries: defaultInquiries,
  tourismSpots: allDefaultTourismSpots,
  businesses: defaultBusinesses,
  orders: defaultOrders,
  forms: defaultForms
});

export const ADMIN_EMAIL = ADMIN_EMAIL_VALUE;
const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' && window.location.protocol.startsWith('http') ? '' : 'http://localhost:5000');
let adminSyncTimer = null;
let adminSyncQueue = Promise.resolve();

export function notifyAppDataUpdated() {
  window.dispatchEvent(new Event('arSmartTourismDataUpdated'));
}

function requestAuthenticatedApi(route, body) {
  const token = localStorage.getItem('arTourismToken');
  if (!token) return Promise.resolve(null);

  return fetch(`${API_BASE_URL}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  }).then(async (response) => {
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'The backend could not save this change.');
    }
    return response.json();
  }).catch((error) => {
    console.error('Backend save failed:', error.message);
    return null;
  });
}

function scheduleAdminSync(data) {
  const token = localStorage.getItem('arTourismToken');
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('arTourismUser') || 'null');
  } catch {
    user = null;
  }
  if (!token || user?.role !== 'admin') return;

  const snapshot = JSON.stringify(data);
  window.clearTimeout(adminSyncTimer);
  adminSyncTimer = window.setTimeout(() => {
    adminSyncQueue = adminSyncQueue.catch(() => null).then(async () => {
      const latestToken = localStorage.getItem('arTourismToken');
      if (!latestToken) return;
      const response = await fetch(`${API_BASE_URL}/api/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${latestToken}`
        },
        body: snapshot
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || 'The backend could not save app data.');
      }
    }).catch((error) => {
      console.error('Admin data sync failed:', error.message);
    });
  }, 350);
}

export function loadAppData() {
  const stored = localStorage.getItem('arSmartTourismData');
  if (!stored) {
    localStorage.setItem('arSmartTourismData', JSON.stringify(getDefaultState()));
    return getDefaultState();
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      products: parsed.products || defaultProducts,
      hotels: parsed.hotels || defaultHotels,
      taxis: parsed.taxis || defaultTaxis,
      inquiries: parsed.inquiries || defaultInquiries,
      tourismSpots: [
        ...(parsed.tourismSpots || []),
        ...allDefaultTourismSpots.filter((defaultSpot) => !(parsed.tourismSpots || []).some((spot) => spot.name === defaultSpot.name && spot.taluk === defaultSpot.taluk))
      ],
      businesses: parsed.businesses || defaultBusinesses,
      orders: parsed.orders || defaultOrders,
      forms: parsed.forms || defaultForms
    };
  } catch (error) {
    localStorage.setItem('arSmartTourismData', JSON.stringify(getDefaultState()));
    return getDefaultState();
  }
}

export function saveAppData(data) {
  localStorage.setItem('arSmartTourismData', JSON.stringify(data));
  scheduleAdminSync(data);
  notifyAppDataUpdated();
  return data;
}

export function addInquiryEntry({ userEmail, subject, type = 'general', message }) {
  const data = loadAppData();
  const entry = {
    id: Date.now(),
    userEmail: userEmail || 'guest@example.com',
    subject: subject || 'General Inquiry',
    type,
    message: message || '',
    status: 'Pending',
    reply: '',
    replyAt: ''
  };

  const nextData = {
    ...data,
    inquiries: [entry, ...data.inquiries]
  };

  saveAppData(nextData);
  requestAuthenticatedApi('/api/inquiries', { subject: entry.subject, type: entry.type, message: entry.message });
  return entry;
}

export function loadCart() {
  try {
    const stored = window.sessionStorage.getItem('nilgiriCart');
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  window.sessionStorage.setItem('nilgiriCart', JSON.stringify(cart || []));
  return cart;
}

export function clearCart() {
  window.sessionStorage.removeItem('nilgiriCart');
  window.sessionStorage.removeItem('nilgiriCheckoutKey');
}

export async function refreshAppDataFromServer(token, user) {
  const authToken = token || localStorage.getItem('arTourismToken');
  if (!authToken) throw new Error('Please sign in to refresh.');
  const response = await fetch(`${API_BASE_URL}/api/data`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Could not refresh data. Check your connection and try again.');
  }
  localStorage.setItem('arSmartTourismData', JSON.stringify(result));
  notifyAppDataUpdated();
  return result;
}

// Fetch only the published businesses from the dedicated endpoint
export async function refreshBusinessesFromServer() {
  const authToken = localStorage.getItem('arTourismToken');
  if (!authToken) throw new Error('Please sign in to refresh.');
  const response = await fetch(`${API_BASE_URL}/api/businesses`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Could not refresh businesses. Check your connection and try again.');
  }
  // Merge the fresh businesses list into stored app data
  const stored = loadAppData();
  const merged = { ...stored, businesses: result.businesses || [] };
  localStorage.setItem('arSmartTourismData', JSON.stringify(merged));
  notifyAppDataUpdated();
  return result.businesses || [];
}

async function requestAdminCollection(method, route, body) {
  const token = localStorage.getItem('arTourismToken');
  if (!token) throw new Error('Please sign in as an administrator.');
  const response = await fetch(`${API_BASE_URL}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'The change could not be saved.');
  }
  if (result.data) {
    localStorage.setItem('arSmartTourismData', JSON.stringify(result.data));
    notifyAppDataUpdated();
  }
  return result;
}

export function createHotelRecord(hotel) {
  return requestAdminCollection('POST', '/api/admin/hotels', hotel);
}

export function updateHotelRecord(hotel) {
  return requestAdminCollection('PUT', `/api/admin/hotels/${encodeURIComponent(hotel.id)}`, hotel);
}

export function deleteHotelRecord(hotelId) {
  return requestAdminCollection('DELETE', `/api/admin/hotels/${encodeURIComponent(hotelId)}`);
}

export function createBusinessRecord(business) {
  return requestAdminCollection('POST', '/api/admin/businesses', business);
}

export function updateBusinessRecord(business) {
  return requestAdminCollection('PUT', `/api/admin/businesses/${encodeURIComponent(business.id)}`, business);
}

export function deleteBusinessRecord(businessId) {
  return requestAdminCollection('DELETE', `/api/admin/businesses/${encodeURIComponent(businessId)}`);
}

export async function startCheckout({ items, customer, idempotencyKey }) {
  const token = localStorage.getItem('arTourismToken');
  if (!token) throw new Error('Please sign in before placing an order.');
  const response = await fetch(`${API_BASE_URL}/api/orders/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ items, customer, idempotencyKey })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Checkout failed.');
  }
  if (result.data) {
    localStorage.setItem('arSmartTourismData', JSON.stringify(result.data));
    notifyAppDataUpdated();
  }
  return result;
}

export async function startRazorpayPayment(orderId) {
  const token = localStorage.getItem('arTourismToken');
  if (!token) throw new Error('Please sign in before paying.');
  const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Could not start UPI payment.');
  }
  return result;
}

export async function verifyRazorpayPayment({ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const token = localStorage.getItem('arTourismToken');
  if (!token) throw new Error('Please sign in before verifying payment.');
  const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ razorpayOrderId, razorpayPaymentId, razorpaySignature })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Payment could not be verified.');
  }
  if (result.data) {
    localStorage.setItem('arSmartTourismData', JSON.stringify(result.data));
    notifyAppDataUpdated();
  }
  return result;
}

export async function confirmOrderPayment(orderId) {
  const token = localStorage.getItem('arTourismToken');
  if (!token) {
    throw new Error('Please sign in as an administrator to verify this payment.');
  }

  const response = await fetch(`${API_BASE_URL}/api/admin/orders/${encodeURIComponent(orderId)}/confirm-payment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'The payment could not be verified.');
  }

  localStorage.setItem('arSmartTourismData', JSON.stringify(result.data));
  notifyAppDataUpdated();
  return result;
}

export function addProduct(product) {
  const data = loadAppData();
  const nextProduct = {
    id: `product-${Date.now()}`,
    name: product.name.trim(),
    category: product.category || 'General',
    price: Number(product.price || 0),
    mrp: Number(product.mrp || product.price || 0),
    rating: 0,
    reviews: 0,
    image: product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
    imageOverride: product.image || '',
    description: product.description || 'Nilgiris local product',
    tribe: product.tribe || 'Nilgiris Artisan',
    inStock: product.inStock !== false
  };

  saveAppData({ ...data, products: [nextProduct, ...data.products] });
  return nextProduct;
}

export function addTaxi(taxi) {
  const data = loadAppData();
  const nextTaxi = {
    id: `taxi-${Date.now()}`,
    name: taxi.name.trim(),
    available: taxi.available !== false,
    pricePerTrip: Number(taxi.pricePerTrip || 0)
  };

  saveAppData({ ...data, taxis: [nextTaxi, ...data.taxis] });
  return nextTaxi;
}

export function addUserForm({ targetEmail, title, description, questions, createdBy }) {
  const data = loadAppData();
  const form = {
    id: `form-${Date.now()}`,
    targetEmail: targetEmail.trim().toLowerCase(),
    title: title.trim(),
    description: description || '',
    questions: questions.map((question) => ({ id: `question-${Date.now()}-${question.id}`, text: question.text, answer: '' })),
    status: 'Unread',
    response: '',
    createdBy: createdBy || ADMIN_EMAIL,
    createdAt: new Date().toISOString(),
    answeredAt: ''
  };

  saveAppData({ ...data, forms: [form, ...(data.forms || [])] });
  return form;
}

export function answerUserForm(formId, answers, userEmail) {
  const data = loadAppData();
  const response = answers.map((answer) => `${answer.question}: ${answer.answer || '(No answer)'}`).join('\n');
  const nextForms = (data.forms || []).map((form) =>
    form.id === formId
      ? { ...form, status: 'Answered', response, answeredAt: new Date().toISOString() }
      : form
  );
  const form = nextForms.find((item) => item.id === formId);
  const inquiry = form ? {
    id: Date.now() + 1,
    userEmail: userEmail || form.targetEmail,
    subject: `Form response: ${form.title}`,
    type: 'form',
    message: response,
    status: 'Pending',
    reply: '',
    replyAt: ''
  } : null;

  saveAppData({
    ...data,
    forms: nextForms,
    inquiries: inquiry ? [inquiry, ...data.inquiries] : data.inquiries
  });
  return form;
}

export function addTourismPlace(place) {
  const data = loadAppData();
  const nearby = Array.isArray(place.nearby)
    ? place.nearby
    : (place.nearby || '').split(',').map((item) => item.trim()).filter(Boolean);
  const nextData = {
    ...data,
    tourismSpots: [
      {
        id: Date.now(),
        name: place.name,
        district: place.district,
        taluk: place.taluk,
        type: place.type,
        rush: place.rush,
        nearby,
        description: place.description
      },
      ...data.tourismSpots
    ]
  };

  saveAppData(nextData);
  return nextData.tourismSpots[0];
}

export function addBusinessEntry(business) {
  const data = loadAppData();
  const nextData = {
    ...data,
    businesses: [
      {
        id: Date.now(),
        type: business.type,
        name: business.name,
        district: business.district,
        taluk: business.taluk,
        category: business.category,
        status: business.status,
        contact: business.contact
      },
      ...data.businesses
    ]
  };

  saveAppData(nextData);
  return nextData.businesses[0];
}

export function replyToInquiry(inquiryId, replyText, status = 'Replied') {
  const data = loadAppData();
  const trimmedReply = (replyText || '').trim();

  const nextData = {
    ...data,
    inquiries: data.inquiries.map((inquiry) =>
      inquiry.id === inquiryId
        ? {
            ...inquiry,
            status,
            reply: trimmedReply,
            replyAt: trimmedReply ? new Date().toISOString() : inquiry.replyAt
          }
        : inquiry
    )
  };

  saveAppData(nextData);
  return nextData.inquiries.find((inquiry) => inquiry.id === inquiryId) || null;
}

export function getAdminEmail() {
  return ADMIN_EMAIL;
}


export async function createPendingOrder(params) {
  var items = params.items;
  var address = params.address;
  var paymentReference = params.paymentReference;
  var token = localStorage.getItem('arTourismToken');
  if (!token) throw new Error('Please sign in before placing an order.');
  var idempotencyKey = 'pending-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  var response = await fetch(API_BASE_URL + '/api/orders/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      items: items,
      customer: { address: address, paymentReference: paymentReference },
      idempotencyKey: idempotencyKey
    })
  });
  var result = await response.json().catch(function () { return {}; });
  if (!response.ok) {
    throw new Error(result.message || 'Order submission failed. Please try again.');
  }
  if (result.data) {
    localStorage.setItem('arSmartTourismData', JSON.stringify(result.data));
    notifyAppDataUpdated();
  }
  return result.order || result;
}
