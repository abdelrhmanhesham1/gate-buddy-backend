// verify.js — Data accuracy verification + auto-fix (NO API KEYS REQUIRED)
// Usage: MONGO_URI=mongodb://... node scripts/verify.js
// Requires: npm install mongoose puppeteer cheerio node-fetch

const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI;

// Load GateBuddy models so mongoose.model() can find them
require('../models/serviceModel');
require('../models/airportModel');

// ─── Configure your models here ──────────────────────────────────────────────
const MODELS_TO_VERIFY = {
  // Airport services: shops, restaurants, lounges, airline counters
  Service: {
    type: 'brand',
    fields: ['name', 'rating', 'photo', 'logo'],
    nameField: 'name',
    // photo → images[0], logo → airlineLogo (remapped below in verifyBrand)
    photoField: 'images',   // array — we check images[0]
    logoField: 'airlineLogo',
  },
};
// ─────────────────────────────────────────────────────────────────────────────

const report = { clean: [], flagged: [], manual: [] };
const fixLog = [];
let browser;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Sanity checks ─────────────────────────────────────────────────────────────
function checkRating(value) {
  if (typeof value !== 'number') return 'Rating is not a number';
  if (value < 1.0 || value > 5.0) return `Rating out of range: ${value}`;
  if (value === 5.0) return 'Suspiciously perfect rating (5.0)';
  if (Number.isInteger(value)) return `Suspiciously round rating: ${value}`;
  return null;
}

function checkText(value, fieldName, minLength = 5) {
  if (!value || typeof value !== 'string') return `${fieldName} is empty`;
  if (/<[^>]+>/.test(value)) return `${fieldName} contains HTML tags`;
  if (/lorem ipsum/i.test(value)) return `${fieldName} contains filler text`;
  if (value.length < minLength) return `${fieldName} too short (${value.length} chars)`;
  return null;
}

function checkPrice(value, maxPrice = 500) {
  if (typeof value !== 'number' || isNaN(value)) return 'Price is not a number';
  if (value <= 0) return `Invalid price: ${value}`;
  if (value > maxPrice) return `Price ${value} exceeds category max ${maxPrice}`;
  return null;
}

async function checkImageUrl(url) {
  if (!url) return 'Image URL is missing';
  if (/placeholder|no-image|noimage|default/i.test(url)) return 'Placeholder image URL';
  try {
    const res = await fetch(url, { method: 'HEAD', timeout: 5000 });
    if (res.status === 404) return 'Image URL returns 404';
    const size = parseInt(res.headers.get('content-length') || '9999');
    if (size < 1000) return `Image too small (${size} bytes) — likely 1×1 tracker`;
    return null;
  } catch {
    return 'Image URL unreachable';
  }
}

// ── Free brand verification via scraping ──────────────────────────────────────
async function scrapeBrandFromGoogle(brandName) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  try {
    const query = encodeURIComponent(`${brandName} official site rating`);
    await page.goto(`https://www.google.com/search?q=${query}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    const ratingText = $('[data-attrid="kc:/collection/knowledge_panels/has_reviews:star_score"]').text()
      || $('span.Aq14fc').first().text();
    const rating = parseFloat(ratingText);

    const logo = $('g-img.MZIHPe img').attr('src') || $('img.t_sMZb').attr('src') || null;
    const officialUrl = $('a[href*="//"] cite').first().text().trim() || null;

    await page.close();
    return {
      rating: !isNaN(rating) && rating >= 1 && rating <= 5 ? rating : null,
      logo: logo || null,
      officialUrl,
    };
  } catch {
    await page.close();
    return null;
  }
}

async function scrapePhotoFromBrandSite(officialUrl) {
  if (!officialUrl) return null;
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  try {
    const url = officialUrl.startsWith('http') ? officialUrl : `https://${officialUrl}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    let bestImg = null;
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      const width = parseInt($(el).attr('width') || '0');
      if (src && width > 300 && !src.includes('logo') && !src.includes('icon')) {
        bestImg = src.startsWith('http') ? src : `${url}/${src.replace(/^\//, '')}`;
        return false;
      }
    });

    await page.close();
    return bestImg;
  } catch {
    await page.close();
    return null;
  }
}

// ── Re-scrape product from its source URL ─────────────────────────────────────
async function reScrapeProduct(doc, urlField) {
  const sourceUrl = doc[urlField];
  if (!sourceUrl) return null;
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  try {
    await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    const name = $('h1').first().text().trim()
      || $('[class*="product-title"], [class*="product-name"]').first().text().trim()
      || null;
    const priceText = $('[class*="price"]').first().text().replace(/[^0-9.]/g, '');
    const price = parseFloat(priceText) || null;
    const description = $('[class*="description"], [class*="product-desc"]').first().text().trim()
      || $('meta[name="description"]').attr('content')
      || null;
    const image = $('meta[property="og:image"]').attr('content')
      || $('[class*="product-image"] img').first().attr('src')
      || null;

    await page.close();
    return { name, price, description, image };
  } catch {
    await page.close();
    return null;
  }
}

// ── Per-model verification ────────────────────────────────────────────────────
async function verifyBrand(doc, config, Model) {
  const flags = [];

  if (config.fields.includes('rating')) {
    // Service.rating allows 0 (unrated) — only flag clearly wrong values
    if (doc.rating !== 0) {
      const err = checkRating(doc.rating);
      if (err) flags.push({ field: 'rating', reason: err });
    }
  }
  if (config.fields.includes('name')) {
    const err = checkText(doc.name, 'name', 2);
    if (err) flags.push({ field: 'name', reason: err });
  }
  if (config.fields.includes('photo')) {
    // Service uses images[] array — check the first entry
    const photoField = config.photoField || 'photo';
    const photoVal = Array.isArray(doc[photoField]) ? doc[photoField][0] : doc[photoField];
    const err = await checkImageUrl(photoVal);
    if (err) flags.push({ field: photoField, reason: err, arrayIndex: 0 });
  }
  if (config.fields.includes('logo')) {
    const logoField = config.logoField || 'logo';
    const err = await checkImageUrl(doc[logoField]);
    if (err) flags.push({ field: logoField, reason: err });
  }

  if (flags.length === 0) {
    report.clean.push({ model: Model.modelName, _id: doc._id });
    return;
  }

  const googleData = doc[config.nameField]
    ? await scrapeBrandFromGoogle(doc[config.nameField])
    : null;
  const photo = googleData?.officialUrl
    ? await scrapePhotoFromBrandSite(googleData.officialUrl)
    : null;
  const sourceData = { ...googleData, photo };

  const updates = {};
  const fixed = [];
  const manual = [];

  for (const flag of flags) {
    // Map scraped field names back to doc field names
    const scrapeKey = flag.field === (config.photoField || 'photo') ? 'photo'
      : flag.field === (config.logoField || 'logo') ? 'logo'
      : flag.field;
    const fix = sourceData?.[scrapeKey];
    if (fix && flag.field !== 'name') {
      // images is an array — patch only index 0
      if (flag.arrayIndex !== undefined) {
        const arr = [...(doc[flag.field] || [])];
        arr[flag.arrayIndex] = fix;
        updates[flag.field] = arr;
      } else {
        updates[flag.field] = fix;
      }
      fixLog.push({
        model: Model.modelName, _id: doc._id,
        field: flag.field, oldValue: doc[flag.field],
        newValue: fix, source: 'google_scrape', fixedAt: new Date(),
      });
      fixed.push(flag.field);
    } else {
      manual.push(flag);
    }
  }

  if (Object.keys(updates).length) await Model.updateOne({ _id: doc._id }, { $set: updates });
  if (fixed.length) report.flagged.push({ model: Model.modelName, _id: doc._id, fixed, remaining: manual });
  if (manual.length) report.manual.push({ model: Model.modelName, _id: doc._id, flags: manual });
}

async function verifyProduct(doc, config, Model) {
  const flags = [];

  if (config.fields.includes('name')) {
    const err = checkText(doc.name, 'name', 3);
    if (err) flags.push({ field: 'name', reason: err });
  }
  if (config.fields.includes('price')) {
    const err = checkPrice(doc.price, config.categoryMaxPrice);
    if (err) flags.push({ field: 'price', reason: err });
  }
  if (config.fields.includes('description')) {
    const err = checkText(doc.description, 'description', 20);
    if (err) flags.push({ field: 'description', reason: err });
  }
  if (config.fields.includes('image')) {
    const err = await checkImageUrl(doc.image);
    if (err) flags.push({ field: 'image', reason: err });
  }

  if (flags.length === 0) {
    report.clean.push({ model: Model.modelName, _id: doc._id });
    return;
  }

  const fresh = await reScrapeProduct(doc, config.urlField);
  const updates = {};
  const fixed = [];
  const manual = [];

  for (const flag of flags) {
    const fix = fresh?.[flag.field];
    if (fix) {
      updates[flag.field] = fix;
      fixLog.push({
        model: Model.modelName, _id: doc._id,
        field: flag.field, oldValue: doc[flag.field],
        newValue: fix, source: 're-scrape', fixedAt: new Date(),
      });
      fixed.push(flag.field);
    } else {
      manual.push(flag);
    }
  }

  if (Object.keys(updates).length) await Model.updateOne({ _id: doc._id }, { $set: updates });
  if (fixed.length) report.flagged.push({ model: Model.modelName, _id: doc._id, fixed, remaining: manual });
  if (manual.length) report.manual.push({ model: Model.modelName, _id: doc._id, flags: manual });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!MONGO_URI) { console.error('MONGO_URI is required'); process.exit(1); }

  await mongoose.connect(MONGO_URI);
  browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  console.log('Connected. Starting verification...\n');

  for (const [modelName, config] of Object.entries(MODELS_TO_VERIFY)) {
    let Model;
    try { Model = mongoose.model(modelName); }
    catch { console.warn(`Model "${modelName}" not registered — skipping`); continue; }

    const docs = await Model.find({}).lean();
    console.log(`Verifying ${docs.length} docs in ${modelName}...`);

    for (const doc of docs) {
      if (config.type === 'brand') await verifyBrand(doc, config, Model);
      if (config.type === 'product') await verifyProduct(doc, config, Model);
      await sleep(300);
    }
  }

  if (fixLog.length > 0) {
    await mongoose.connection.db.collection('DataFixLog').insertMany(fixLog);
    console.log(`\n${fixLog.length} fixes logged to DataFixLog.`);
  }

  fs.writeFileSync('verify-report.json', JSON.stringify(report, null, 2));
  fs.writeFileSync('manual-review.json', JSON.stringify(report.manual, null, 2));

  console.log('\n── Verification Complete ──────────────────');
  console.log(`✅ Clean:   ${report.clean.length}`);
  console.log(`⚠️  Flagged: ${report.flagged.length} (auto-fixed where possible)`);
  console.log(`❌ Manual:  ${report.manual.length} (see manual-review.json)`);

  await browser.close();
  await mongoose.disconnect();
}

main().catch(async err => {
  console.error(err);
  if (browser) await browser.close();
  process.exit(1);
});
