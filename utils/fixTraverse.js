/**
 * Moves any service coordinates that fall on De Traverse road or the hotel zones
 * into the correct indoor positions inside the terminal building.
 *
 * De Traverse road: ~52.308–52.310°N, 4.759–4.762°E
 * Mercure Terminal:  52.3110°N,  4.7615°E
 * Yotel Schiphol:   52.3093°N,  4.7650°E
 * Mercure Higherlevel: 52.3104°N, 4.7620°E
 *
 * All terminal indoor services that are LANDSIDE (shops, restaurants,
 * check-in, arrivals) belong at the Terminal 1A building level:
 *   Departure halls:  ~52.3064–52.3068°N
 *   Arrivals halls:   ~52.3060–52.3064°N
 *   Schiphol Plaza:   ~52.3068–52.3075°N  (landside shopping, ground floor)
 *
 * Pier services are already correctly placed using OSM gate bounding boxes.
 * This script only touches the problematic traverse-zone cluster.
 */
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "seedDatabase.js");
let content = fs.readFileSync(filePath, "utf8");

// The bad cluster: PLAZA zone was placed at (4.7610, 52.3090) which is ON the traverse.
// Real Schiphol Plaza indoor shopping is at terminal-building level ~52.3070°N.
// New anchor: (4.7625, 52.3070) — inside Terminal 1A, landside shopping floor.
const PLAZA_OLD_CENTER = [4.7610, 52.3090];
const PLAZA_NEW_CENTER = [4.7625, 52.3070];

// Tolerance: match any coord within ±0.0005 of the old plaza cluster
const TOL = 0.0005;

let replaced = 0;
content = content.replace(
  /coordinates: \[([\d.]+), ([\d.]+)\]/g,
  (match, lngStr, latStr) => {
    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);

    const onTraverse =
      Math.abs(lng - PLAZA_OLD_CENTER[0]) <= TOL &&
      Math.abs(lat - PLAZA_OLD_CENTER[1]) <= TOL;

    if (!onTraverse) return match;

    // Preserve offset, apply to new anchor
    const dLng = lng - PLAZA_OLD_CENTER[0];
    const dLat = lat - PLAZA_OLD_CENTER[1];
    const newLng = (PLAZA_NEW_CENTER[0] + dLng).toFixed(4);
    const newLat = (PLAZA_NEW_CENTER[1] + dLat).toFixed(4);
    replaced++;
    return `coordinates: [${newLng}, ${newLat}]`;
  }
);

fs.writeFileSync(filePath, content, "utf8");
console.log(`✅ Moved ${replaced} traverse-zone services into terminal building.`);

// Sanity check: no services should now fall on traverse or hotels
const DANGER_ZONES = [
  { name: "De Traverse",        lat: 52.3090, lng: 4.7610, r: 0.0010 },
  { name: "Mercure Terminal",   lat: 52.3110, lng: 4.7615, r: 0.0008 },
  { name: "Yotel Schiphol",     lat: 52.3093, lng: 4.7650, r: 0.0008 },
  { name: "Mercure Higherlevel",lat: 52.3104, lng: 4.7620, r: 0.0008 },
  { name: "citizenM",           lat: 52.3094, lng: 4.7558, r: 0.0008 },
];

const coords = [...content.matchAll(/coordinates: \[([\d.]+), ([\d.]+)\]/g)]
  .map(m => ({ lng: parseFloat(m[1]), lat: parseFloat(m[2]) }));

let issues = 0;
DANGER_ZONES.forEach(z => {
  const hits = coords.filter(c =>
    Math.abs(c.lat - z.lat) <= z.r && Math.abs(c.lng - z.lng) <= z.r
  );
  if (hits.length) {
    console.log(`⚠️  ${hits.length} service(s) still near ${z.name}:`);
    hits.forEach(c => console.log(`   lat=${c.lat} lng=${c.lng}`));
    issues += hits.length;
  }
});

if (issues === 0) console.log("✅ No services in hotel/traverse danger zones.");

// Show final distribution
const lats = coords.map(c => c.lat);
const lngs = coords.map(c => c.lng);
console.log(`\nFinal bounds: lat ${Math.min(...lats).toFixed(4)}–${Math.max(...lats).toFixed(4)}  lng ${Math.min(...lngs).toFixed(4)}–${Math.max(...lngs).toFixed(4)}`);
