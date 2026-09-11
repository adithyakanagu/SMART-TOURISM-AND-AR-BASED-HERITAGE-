import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaLandmark, FaBook, FaUsers, FaHistory } from 'react-icons/fa';
import './TribalHeritage.css';

// Six Tribes data with heritage and history
const tribes = [
  {
    id: 1,
    name: 'Toda',
    image: '/toda/toda.webp',
    population: '~1,500',
    language: 'Toda (Dravidian)',
    occupation: 'Buffalo herding, dairy work',
    heritage: 'Famous for distinctive barrel-vaulted huts called "mands", intricate embroidery (pukhoor), and buffalo-centric culture. Their art features geometric patterns in red and black on white cloth.',
    history: 'The Todas are considered the original inhabitants of the Nilgiri Hills, dating back thousands of years. They have a unique polyandrous marriage system and are one of the most photographed tribes in India. Their culture revolves around the sacred buffalo, and they maintain complex ritual relationships with other Nilgiri tribes.',
    religion: 'Buffalo worship, animistic beliefs',
    location: 'Nilgiri plateau, mainly Ooty and surrounding areas',
    detailed: {
      introduction: 'The Todas are an indigenous community of the Nilgiri Hills whose cultural life has traditionally been connected with high-altitude grasslands, shola forests, sacred landscapes, buffaloes, dairies, settlements called munds, embroidery, songs and ceremonies.',
      historyDetail: 'Toda history is closely connected with pastoral life in the Nilgiri highlands. Colonial-era changes, including tea plantations, forestry, agriculture, settlements and infrastructure, altered parts of the traditional grassland and grazing landscape. Toda communities continue to preserve important cultural identity while participating in modern education, employment and economic life.',
      belief: 'Traditional Toda belief is connected with sacred buffaloes, dairies, mountains, nature and ancestral traditions. Teikirshy/Teikirshi and On appear in Toda mythology and oral traditions. These should be presented as part of a distinct indigenous belief system, not automatically equated with other religious traditions.',
      sections: [
        { title: 'Sacred Dairy and Buffalo Culture', text: 'Toda dairies have religious significance beyond milk storage. Sacred buffaloes, dairy priests, milk, butter, ritual purity and community traditions are connected through a specialised cultural system.', icon: '🐃' },
        { title: 'Toda Mund and Traditional Huts', text: 'A mund is a traditional Toda settlement that may include huts, dairy spaces and community areas. Traditional huts are small, semi-barrel or vault-shaped structures made with natural materials and a relatively small entrance.', icon: '🏘️' },
        { title: 'Embroidery and Poothkuli', text: 'Toda embroidery, often known as pukhoor, is associated with geometric red, black and white patterns. The Poothkuli is a distinctive embroidered shawl connected with clothing, ceremonies, festivals and cultural identity. Verify artisan and GI product information with authorised community sources.', icon: '🧵' },
        { title: 'Language and Oral Tradition', text: 'Toda belongs to the Dravidian language family. Songs and oral narratives preserve history, genealogy, beliefs, ceremonies and community knowledge. Audio or language content should only be published with community permission and rights clearance.', icon: '🎵' },
        { title: 'Nature and Sacred Landscape', text: 'Shola forests, grasslands, mountains, streams and buffalo grazing areas are part of the connected Toda cultural landscape. The app should avoid publishing sensitive sacred or private coordinates without permission.', icon: '🌿' },
        { title: 'Food, Dairy and Livelihood', text: 'Milk, butter, curd and buttermilk are important dairy traditions. Contemporary Toda livelihoods are diverse, so the app should distinguish historical pastoral life from present-day community experience.', icon: '🥛' }
      ],
      arExperiences: [
        'AR Toda mund: label a traditional hut, dairy, buffalo area and settlement structure.',
        'Sacred buffalo story: explain dairy, ritual, economy and cultural identity.',
        'Poothkuli pattern viewer: explore geometric motifs and textile history.',
        'Toda hut reconstruction: compare a present view with a respectful educational model.',
        'Sacred Nilgiris map: show broad cultural landscapes without exposing sensitive locations.'
      ],
      gallery: [
        { src: '/toda/toda.webp', label: 'Toda heritage visual' },
        { src: '/toda/toda-tribe-tamil-nadu.jpg', label: 'Toda community heritage' },
        { src: '/toda/toda3.jpg', label: 'Toda cultural landscape' },
        { src: '/toda/toda4.jpg', label: 'Toda textile and visual culture' },
        { src: '/toda/todabuff.webp', label: 'Buffalo culture' }
      ],
      responsibleNote: 'Cultural visits, ceremonies, sacred dairies, private settlements, funeral traditions, audio recordings and exact sacred locations require community permission. Present sensitive traditions as educational heritage information, not as unrestricted tourist attractions.'
    }
  },
  {
    id: 2,
    name: 'Kota',
    image: 'https://images.unsplash.com/photo-1544377142212-928c9e80b4ab?w=600',
    population: '~2,000',
    language: 'Kota (Dravidian)',
    occupation: 'Artisans, musicians, blacksmiths',
    heritage: 'Master craftsmen known for metalwork, pottery, and wood carving. They are traditional musicians who perform at Toda and Badaga ceremonies. Their villages are called "kokars".',
    history: 'According to legend, the deity Kambattarayan created the Kotas for artisan work. They have a symbiotic relationship with other tribes, providing tools, pottery, and music in exchange for dairy products from Todas and grains from Badagas. Their annual Kol Vaishnavam festival is famous.',
    religion: 'Hindu with tribal deities, ancestor worship',
    location: 'Kotagiri and surrounding Nilgiri villages'
  },
  {
    id: 3,
    name: 'Kurumba',
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9e6d8c278?w=600',
    population: '~10,000',
    language: 'Kurumba (Dravidian)',
    occupation: 'Honey collection, forest produce, agriculture',
    heritage: 'Known as skilled honey hunters and forest dwellers. They have extensive knowledge of medicinal plants and maintain ancient traditions of sustainable forest living. Their art includes basket weaving and tribal paintings.',
    history: 'The Kurumbas are believed to be among the earliest settlers of the Nilgiris. They traditionally collected honey from cliffs and forests, trading with other tribes. They live in small hamlets on hill slopes and maintain deep spiritual connections to the forest.',
    religion: 'Animistic, nature worship',
    location: 'Hill slopes and forest areas across Nilgiris'
  },
  {
    id: 4,
    name: 'Irula',
    image: 'https://images.unsplash.com/photo-1590422749830-5c5e1e1e9a6e?w=600',
    population: '~5,000',
    language: 'Irula (Dravidian)',
    occupation: 'Snake catching, honey gathering, labor',
    heritage: 'Famous as traditional snake catchers with extraordinary knowledge of reptiles. They practice unique rituals related to snake worship and have extensive knowledge of forest ecology.',
    history: 'The Irulas migrated to the Nilgiris from the plains of Karnataka and Tamil Nadu. They traditionally lived in forest hamlets and were known for catching snakes and gathering forest products. Many now work in plantations while maintaining their cultural identity.',
    religion: 'Hindu with strong animistic elements, snake worship',
    location: 'Lower regions and forest fringes of Nilgiris'
  },
  {
    id: 5,
    name: 'Paniya',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600',
    population: '~8,000',
    language: 'Paniya (Dravidian)',
    occupation: 'Agriculture, plantation labor',
    heritage: 'Traditional agricultural workers with rich oral traditions. They have distinctive jewelry, tattoos, and folk songs. Their culture emphasizes community living and seasonal festivals.',
    history: 'The Paniyas are classified as a Primitive Tribal Group. They traditionally practiced shifting cultivation and lived in autonomous settlements. Many now work on tea and coffee plantations while preserving their language and customs.',
    religion: 'Hindu with tribal deities, ancestor worship',
    location: 'Throughout Nilgiri district, especially plantation areas'
  },
  {
    id: 6,
    name: 'Badaga',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
    population: '~200,000',
    language: 'Badaga (Dravidian)',
    occupation: 'Agriculture, business, education',
    heritage: 'The largest tribal community in Nilgiris, known for their agricultural prowess and emphasis on education. They maintain elaborate funeral ceremonies (karsh) and have a rich oral literature tradition.',
    history: 'The Badagas migrated from the Mysore plains of Karnataka around the 16th century after the fall of the Vijayanagar Empire. Despite being migrants, they became the dominant agricultural community and political leaders in the Nilgiris. They maintain complex exchange relationships with Todas, Kotas, and Kurumbas.',
    religion: 'Hindu (Shaiva sect)',
    location: 'Throughout Nilgiri Hills, especially Kotagiri, Ooty'
  }
];

function TribalHeritage() {
  const navigate = useNavigate();
  const [selectedTribe, setSelectedTribe] = useState(null);

  const handleBack = () => {
    if (selectedTribe) {
      setSelectedTribe(null);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="tribal-heritage-container">
      {/* Header */}
      <motion.header
        className="heritage-header"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
      >
        <button className="back-btn" onClick={handleBack}>
          <FaArrowLeft /> Back
        </button>
        <h1>{selectedTribe ? selectedTribe.name + ' Tribe' : 'Tribal Heritage & Culture'}</h1>
        <div className="header-spacer"></div>
      </motion.header>

      {/* Main Content */}
      <main className="heritage-main">
        {!selectedTribe ? (
          <motion.div
            className="tribes-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="section-title">🏛️ Six Tribes of Nilgiris</h2>
            <p className="section-subtitle">Explore the rich heritage and history of indigenous communities</p>

            <div className="tribes-grid">
              {tribes.map((tribe, index) => (
                <motion.div
                  key={tribe.id}
                  className="tribe-card"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, rotateY: 5 }}
                  onClick={() => setSelectedTribe(tribe)}
                >
                  <div
                    className="tribe-image"
                    style={{ backgroundImage: `url(${tribe.image})` }}
                  >
                    <div className="tribe-overlay">
                      <FaUsers size={50} color="white" />
                    </div>
                  </div>
                  <div className="tribe-content">
                    <h3>{tribe.name}</h3>
                    <p className="tribe-population">Population: {tribe.population}</p>
                    <p className="tribe-occupation">{tribe.occupation}</p>
                    <div className="explore-btn">
                      <FaBook /> Explore Heritage
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="tribe-detail"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="detail-header">
              <h2>{selectedTribe.name} Tribe</h2>
              <div className="tribe-stats">
                <div className="stat">
                  <FaUsers />
                  <span>{selectedTribe.population}</span>
                </div>
                <div className="stat">
                  <FaLandmark />
                  <span>Nilgiris</span>
                </div>
              </div>
            </div>

            <div className="detail-content">
              {selectedTribe.detailed && (
                <div className="tribe-featured-story">
                  <div className="story-kicker">Nilgiris Indigenous Heritage</div>
                  <h3>Who are the Todas?</h3>
                  <p>{selectedTribe.detailed.introduction}</p>
                </div>
              )}

              <div className="info-section">
                <h3><FaBook /> Language & Occupation</h3>
                <div className="info-grid">
                  <div className="info-card">
                    <strong>Language:</strong> {selectedTribe.language}
                  </div>
                  <div className="info-card">
                    <strong>Occupation:</strong> {selectedTribe.occupation}
                  </div>
                  <div className="info-card">
                    <strong>Religion:</strong> {selectedTribe.religion}
                  </div>
                  <div className="info-card">
                    <strong>Location:</strong> {selectedTribe.location}
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3><FaHistory /> Heritage & Culture</h3>
                <p className="heritage-text">{selectedTribe.heritage}</p>
              </div>

              <div className="info-section">
                <h3>📜 History</h3>
                <p className="history-text">{selectedTribe.detailed?.historyDetail || selectedTribe.history}</p>
              </div>

              {selectedTribe.detailed && (
                <>
                  <div className="info-section">
                    <h3>🏔️ Traditional Beliefs and Sacred World</h3>
                    <p className="heritage-text">{selectedTribe.detailed.belief}</p>
                  </div>

                  <div className="toda-heritage-sections">
                    {selectedTribe.detailed.sections.map((section) => (
                      <article key={section.title} className="toda-heritage-card">
                        <span className="toda-card-icon">{section.icon}</span>
                        <div>
                          <h3>{section.title}</h3>
                          <p>{section.text}</p>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="toda-ar-panel">
                    <h3>📱 Toda AR Heritage Experiences</h3>
                    <div className="toda-ar-list">
                      {selectedTribe.detailed.arExperiences.map((experience) => <div key={experience}>◈ {experience}</div>)}
                    </div>
                  </div>

                  <div className="toda-gallery">
                    <div className="toda-gallery-heading">
                      <h3>📷 Toda Heritage Gallery</h3>
                      <p>Images supplied for this heritage module. Cultural use and publication should follow community and photographer permissions.</p>
                    </div>
                    <div className="toda-gallery-grid">
                      {selectedTribe.detailed.gallery.map((image) => (
                        <figure key={image.src} className="toda-gallery-item">
                          <img src={image.src} alt={image.label} />
                          <figcaption>{image.label}</figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>

                  <div className="toda-responsible-note">⚠️ {selectedTribe.detailed.responsibleNote}</div>
                </>
              )}

              <div className="cultural-highlights">
                <h3>🎨 Cultural Highlights</h3>
                <div className="highlights-grid">
                  <div className="highlight-card">Traditional Arts & Crafts</div>
                  <div className="highlight-card">Unique Language & Scripts</div>
                  <div className="highlight-card">Ancient Rituals & Festivals</div>
                  <div className="highlight-card">Sustainable Living Practices</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default TribalHeritage;
