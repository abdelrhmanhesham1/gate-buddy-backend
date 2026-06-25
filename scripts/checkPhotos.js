const mongoose = require('mongoose');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../variables.env') });

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const options = { method: 'HEAD', hostname: parsed.hostname, path: parsed.pathname + parsed.search, timeout: 8000 };
      const req = https.request(options, (res) => resolve({ url, status: res.statusCode, ok: res.statusCode < 400 }));
      req.on('error', () => resolve({ url, status: 0, ok: false }));
      req.on('timeout', () => { req.destroy(); resolve({ url, status: 408, ok: false }); });
      req.end();
    } catch { resolve({ url, status: 0, ok: false }); }
  });
}

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  const Service = require('../models/serviceModel');
  const services = await Service.find({}, 'name category images').lean();

  console.log(`\nTotal services: ${services.length}`);

  // Category counts
  const catCounts = {};
  for (const s of services) {
    catCounts[s.category] = (catCounts[s.category] || 0) + 1;
  }
  console.log('\nBy category:');
  Object.entries(catCounts).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  // Photo coverage
  const noPhoto = services.filter(s => !s.images?.length);
  const withPhoto = services.filter(s => s.images?.length > 0);
  console.log(`\nWith photos: ${withPhoto.length}`);
  console.log(`Without photos: ${noPhoto.length}`);
  if (noPhoto.length) noPhoto.forEach(s => console.log(`  MISSING: [${s.category}] ${s.name}`));

  // Sample URLs (check 10 random images)
  const sample = [];
  for (const s of withPhoto.slice(0, 10)) {
    const img = s.images[0];
    const url = typeof img === 'string' ? img : img?.url || img?.src || '';
    if (url) sample.push({ name: s.name, url });
  }

  console.log('\nChecking 10 sample image URLs...');
  const checks = await Promise.all(sample.map(s => checkUrl(s.url).then(r => ({ ...r, name: s.name }))));
  const dead = checks.filter(c => !c.ok);
  checks.forEach(c => console.log(`  ${c.ok ? '✅' : '❌'} [${c.status}] ${c.name}`));

  if (dead.length === 0) {
    console.log('\n✅ All sampled photos are accessible.');
  } else {
    console.log(`\n⚠️  ${dead.length} dead URLs in sample.`);
  }

  console.log('\nSample image data structure:');
  const ex = withPhoto[0]?.images[0];
  console.log(' ', typeof ex === 'string' ? `string: "${ex.slice(0, 80)}..."` : JSON.stringify(ex, null, 2));

  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
