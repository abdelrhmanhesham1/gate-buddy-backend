// One-time script: fetch Pexels images for each service and patch the DB
// Usage: node scripts/seedServiceImages.js

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../variables.env') });

const mongoose = require('mongoose');
const https = require('https');
const Service = require('../models/serviceModel');

const PEXELS_KEY = process.env.PEXELS_API_KEY;

// Curated search queries per service name keyword / category
const QUERY_MAP = {
  // By name keyword (checked first, case-insensitive substring)
  'KLM': 'KLM airline check-in counter airport',
  'Emirates': 'Emirates airline business class airport',
  'Lufthansa': 'Lufthansa check-in airport terminal',
  'Turkish Airlines': 'Turkish Airlines airport counter',
  'easyJet': 'easyjet airport check-in',
  'Qatar Airways': 'Qatar Airways first class airport lounge',
  'British Airways': 'British Airways airport terminal',
  'Transavia': 'Transavia airline airport',
  'Air France': 'Air France airport check-in terminal',
  'Swiss': 'Swiss Airlines airport check-in',
  'Vueling': 'Vueling airport terminal Spain',
  'Ryanair': 'Ryanair airport departure terminal',
  'Singapore Airlines': 'Singapore Airlines SilverKris lounge',
  'Etihad': 'Etihad Airways business lounge airport',
  'GWK Travelex': 'currency exchange airport bureau de change',
  'ATM': 'ATM cash machine airport bank',
  'Insurance': 'travel insurance airport desk',
  'Crown Lounge': 'KLM crown lounge airport premium',
  'SilverKris': 'Singapore Airlines lounge premium dining',
  'The Lounge': 'airport premium lounge buffet bar',
  'Aspire Lounge': 'airport lounge Priority Pass',
  'Emirates Business': 'Emirates business lounge gourmet',
  'No1 Lounge': 'airport business lounge buffet',
  'Assistance Desk': 'airport wheelchair assistance disabled passenger',
  'Quiet Room': 'airport quiet room sensory calm',
  'Prayer Room': 'airport prayer room multi-faith',
  'Baby Care': 'airport baby care room nursing',
  'Medical Centre': 'airport medical centre first aid',
  'Lost & Found': 'airport lost and found baggage',
  'Heinemann': 'airport duty free shop luxury perfume',
  'DUFRY': 'airport duty free electronics watches',
  'Rituals': 'Rituals cosmetics beauty store',
  'Bijenkorf': 'luxury department store fashion boutique',
  'Lacoste': 'Lacoste fashion store sportswear',
  'Hugo Boss': 'Hugo Boss fashion store suits',
  'Michael Kors': 'Michael Kors handbags accessories store',
  'Swarovski': 'Swarovski crystal jewellery store',
  'Hermès': 'Hermes luxury boutique scarves leather',
  'Dior': 'Christian Dior perfume beauty boutique',
  'Chanel': 'Chanel beauty perfume boutique',
  'Pandora': 'Pandora jewellery charm bracelet store',
  'Apple': 'Apple store iphone technology electronics',
  'Bose': 'Bose headphones audio electronics store',
  'WHSmith': 'WHSmith bookshop magazine newsagent airport',
  'Amsterdam House': 'Dutch souvenirs Delft Blue pottery tulips',
  'Holland & Barrett': 'health food vitamins supplements store',
  'Nespresso': 'Nespresso coffee capsules boutique espresso',
  'Lego': 'Lego store colourful bricks toys',
  'Mango': 'Mango fashion women clothing store',
  'Starbucks': 'Starbucks coffee shop espresso latte',
  'Burger King': 'Burger King fast food restaurant',
  'La Place': 'Dutch fresh food restaurant cafeteria',
  'Obika': 'Italian mozzarella restaurant antipasti',
  'Café Amsterdam': 'Dutch brown café bitterballen beer',
  'Sushiya': 'sushi conveyor belt Japanese restaurant',
  'Gall & Gall': 'wine bar tasting spirits airport',
  'Heineken': 'Heineken beer bar brewery tap',
  'Hard Rock': 'Hard Rock Cafe restaurant music bar',
  'Subway': 'Subway sandwich fast food restaurant',
  'Dunkin': 'Dunkin donuts coffee bakery',
  'Kebapçı': 'Turkish kebab restaurant doner wrap',
  'Sky Lounge': 'airport restaurant panoramic runway view',
  'Grab & Fly': 'airport grab and go sandwiches food',
  'Pret': 'Pret a Manger organic sandwich coffee',
  'McDonald': 'McDonald fast food airport restaurant',
  'Eurest': 'cafeteria canteen hot meals food',
  'Gate D57': 'airport departure gate boarding bridge',
  'Gate E18': 'airport gate terminal departure lounge',
  'Gate F4': 'airport wide-body gate departure',
  'Gate B28': 'airport remote stand bus gate',
  'Gate G1': 'airport departure gate concourse',
};

// Fallback queries per category
const CATEGORY_FALLBACK = {
  COUNTERS: 'airline check-in counter airport terminal',
  FINANCIAL: 'currency exchange airport bank atm',
  VIP_SERVICES: 'airport business lounge premium seating',
  ACCESSIBILITY: 'airport accessibility wheelchair assistance',
  SHOPS: 'airport duty free shopping luxury',
  RESTAURANTS: 'airport restaurant food dining',
  GATES: 'airport departure gate boarding',
};

function pexelsFetch(query) {
  return new Promise((resolve, reject) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
    const options = {
      headers: { Authorization: PEXELS_KEY },
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const photos = json.photos || [];
          const urls = photos.map(p => p.src.large);
          resolve(urls);
        } catch {
          resolve([]);
        }
      });
    }).on('error', reject);
  });
}

function buildQuery(service) {
  for (const [keyword, query] of Object.entries(QUERY_MAP)) {
    if (service.name.toLowerCase().includes(keyword.toLowerCase())) {
      return query;
    }
  }
  return CATEGORY_FALLBACK[service.category] || 'airport terminal modern';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!PEXELS_KEY) { console.error('PEXELS_API_KEY not set'); process.exit(1); }
  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Connected. Fetching images for all services...\n');

  const services = await Service.find({}).lean();
  console.log(`Found ${services.length} services.\n`);

  let updated = 0;
  let failed = 0;

  for (const service of services) {
    const query = buildQuery(service);
    try {
      const urls = await pexelsFetch(query);
      if (urls.length > 0) {
        await Service.updateOne({ _id: service._id }, { $set: { images: urls } });
        console.log(`✅ ${service.name} — ${urls.length} image(s)`);
        updated++;
      } else {
        console.warn(`⚠️  ${service.name} — no results for "${query}"`);
        failed++;
      }
    } catch (err) {
      console.error(`❌ ${service.name} — ${err.message}`);
      failed++;
    }
    // Pexels free tier: 200 req/hour — 300ms spacing is safe
    await sleep(300);
  }

  console.log(`\n── Done ──────────────────────────────`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`⚠️  Failed:  ${failed}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
