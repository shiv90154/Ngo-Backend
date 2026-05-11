const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Contract = require('../models/Contract');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/samraddh';

const contracts = [
  {
    role: 'ADDITIONAL_DIRECTOR',
    title: 'सेवा अनुबंध – Additional Director (State Head)',
    content: `यह सेवा अनुबंध ("अनुबंध") दि नां क ___ __________ 2026 को Samraddh Bharat Foundation (SBF), जो कि कंपनी अधि नि यम, 2013 के अंतर्गत पंजी कृत धा रा 8 कंपनी है (CIN: U88900MP2024NPL070959), जि सका पंजी कृत एवं प्रशा सनि क का र्या लय: ________________________________ (आगे "पा र्टी 1" कहला एगी ), तथा श्री /श्री मती /संस्था ____________________________________ नि वा सी ______________________________________________ (आगे "पा र्टी 2" कहला एंगेएं गे), के मध्य वि धि वत रूप से नि ष्पा दि त कि या जा ता है। दो नों पक्ष संयुक्त रूप से "पा र्टि याँ " कहला एंगेएं गे।

    [यहाँ पर क्लाइंट के दिए गए Additional Director के अनुबंध का पूरा टेक्स्ट डालें – जिसमें सभी धाराएं (1 से 50 तक), Annexure A-12, और हस्ताक्षर अनुभाग शामिल हैं]`,
    terms: [
      'राज्य में न्यूनतम 5 जिला इकाइयों का गठन',
      'राज्य स्तरीय बैठक हर तिमाही आयोजित करना',
      'प्रति माह कम से कम 50 लाइसेंस बिक्री सुनिश्चित करना',
      'सभी वित्तीय लेन-देन संस्था के अधिकृत खातों से ही होंगे',
      'डेटा सुरक्षा और गोपनीयता का पूर्ण पालन',
    ],
    requiredFields: ['processingFee', 'securityDeposit'],
  },
  {
    role: 'STATE_DEVELOPMENT_COORDINATOR',
    title: 'सेवा अनुबंध – State Development Coordinator (SDC)',
    content: `यह सेवा अनुबंध ("अनुबंध") दि नां क ___ __________ 2026 को Samraddh Bharat Foundation (SBF), जो कि कंपनी अधि नि यम, 2013 के अंतर्गत पंजी कृत धा रा 8 कंपनी है (CIN: U88900MP2024NPL070959), जि सका पंजी कृत एवं प्रशा सनि क का र्या लय: ________________________________ (आगे "पा र्टी 1"), तथा श्री /श्री मती /संस्था ____________________________________ नि वा सी ______________________________________________ (आगे "पा र्टी 2"), के मध्य वि धि वत रूप से नि ष्पा दि त कि या जा ता है। दो नों पक्ष संयुक्त रूप से "पा र्टि याँ " कहला एंगेएं गे।

    [यहाँ पर क्लाइंट के दिए गए State Development Coordinator के अनुबंध का पूरा टेक्स्ट डालें – जिसमें सभी धाराएं (1 से 30.7 तक), Annexure A-9, और हस्ताक्षर अनुभाग शामिल हैं]`,
    terms: [
      'न्यूनतम 5 जिलों का प्रबंधन',
      'प्रत्येक जिले में सक्रिय टीम सुनिश्चित करना',
      'मासिक रिपोर्टिंग अनिवार्य',
      'धन संग्रह पर पूर्ण प्रतिबंध',
      'गोपनीयता और डेटा सुरक्षा का पालन',
    ],
    requiredFields: ['processingFee', 'securityDeposit'],
  },
  {
    role: 'BLOCK_DEVELOPMENT_COORDINATOR',
    title: 'सेवा अनुबंध – Block Coordinator / Program Officer',
    content: `यह सेवा अनुबंध ("अनुबंध") दि नां क ___ __________ 2026 को Samraddh Bharat Foundation (SBF), जो कि कंपनी अधि नि यम, 2013 के अंतर्गत पंजी कृत धा रा 8 कंपनी है (CIN: U88900MP2024NPL070959), जि सका पंजी कृत एवं प्रशा सनि क का र्या लय उपर्युक्त पते पर ____________________________________________ है (आगे "पा र्टी 1"), तथा श्री /श्री मती /संस्था ______________________, नि वा सी ______________________ (आगे "पा र्टी 2") के मध्य वि धि वत संपन्न कि या जा ता है। दो नों को संयुक्त रूप से "पा र्टि याँ " कहा जा एगा ।

    [यहाँ पर क्लाइंट के दिए गए Block Coordinator के अनुबंध का पूरा टेक्स्ट डालें – जिसमें सभी धाराएं (1 से 29 तक), Annexure A, और हस्ताक्षर अनुभाग शामिल हैं]`,
    terms: [
      'ब्लॉक स्तर पर टीम गठन और प्रबंधन',
      'सदस्य पंजीकरण और ऑनबोर्डिंग',
      'साप्ताहिक रिपोर्टिंग',
      'अनुशासन और आचरण नीति का पालन',
      'बिना अनुमति धन संग्रह वर्जित',
    ],
    requiredFields: ['processingFee'],
  },
];

async function seedContracts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');

    // पुराने कॉन्ट्रैक्ट हटाएँ (वैकल्पिक)
    await Contract.deleteMany({});
    console.log('🗑️ Old contracts cleared.');

    // नए कॉन्ट्रैक्ट डालें
    for (const c of contracts) {
      await Contract.findOneAndUpdate(
        { role: c.role },
        { ...c, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }
    console.log(`📄 ${contracts.length} contracts seeded successfully.`);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

seedContracts();