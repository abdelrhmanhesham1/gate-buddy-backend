/**
 * Fixes all service coordinates in seedDatabase.js using real OSM gate data.
 * Each old zone anchor is remapped to the real Schiphol location.
 * Run once: node utils/fixServiceCoords.js
 */
const fs = require("fs");
const path = require("path");

// ── Real OSM-derived zone anchors ─────────────────────────────────────────────
// Old anchor [lng, lat]  →  New anchor [lng, lat]
// Derived from Overpass API gate bounding boxes + Terminal 1A (52.3065, 4.7630)
const ZONE_MAP = [
  // ── Terminal building (landside) ──────────────────────────────────────────
  // DEP1: was ~52.3102°N, 4.7585°E  →  inside western departure hall
  { old: [4.7585, 52.3102], new: [4.7608, 52.3067] },
  // DEP2: was ~52.3108°N, 4.7648°E  →  inside central departure hall
  { old: [4.7648, 52.3108], new: [4.7635, 52.3065] },
  // DEP3: was ~52.3113°N, 4.7712°E  →  inside eastern departure hall
  { old: [4.7712, 52.3113], new: [4.7656, 52.3065] },
  // ARR1/2: was ~52.3093°N, 4.7643°E  →  arrivals level below departure
  { old: [4.7643, 52.3093], new: [4.7635, 52.3063] },
  // ARR3: was ~52.3097°N, 4.7710°E  →  east arrivals
  { old: [4.7710, 52.3097], new: [4.7660, 52.3063] },
  // ARR4: was ~52.3099°N, 4.7735°E  →  far-east arrivals
  { old: [4.7735, 52.3099], new: [4.7680, 52.3061] },
  // PLAZA: was ~52.3071°N, 4.7638°E  →  Schiphol Plaza (OSM: 52.3090, 4.7610)
  { old: [4.7638, 52.3071], new: [4.7610, 52.3090] },

  // ── Piers (airside) — all from OSM gate bounding boxes ───────────────────
  // B pier mid: was ~52.3001°N, 4.7535°E  →  real B pier centre ~52.304°N, 4.763°E
  { old: [4.7535, 52.3001], new: [4.7628, 52.3043] },
  // B pier end: was ~52.2978°N, 4.7523°E  →  far end B pier ~52.303°N, 4.763°E
  { old: [4.7523, 52.2978], new: [4.7633, 52.3033] },
  // C pier mid: was ~52.2993°N, 4.7618°E  →  real C pier ~52.306°N, 4.766°E
  { old: [4.7618, 52.2993], new: [4.7662, 52.3057] },
  // C pier end: was ~52.2970°N, 4.7612°E  →  far end C pier ~52.305°N, 4.767°E
  { old: [4.7612, 52.2970], new: [4.7667, 52.3048] },
  // D pier mid: was ~52.2986°N, 4.7700°E  →  real D pier ~52.308°N, 4.769°E
  { old: [4.7700, 52.2986], new: [4.7695, 52.3085] },
  // D pier end: was ~52.2963°N, 4.7708°E  →  far end D pier ~52.309°N, 4.773°E
  { old: [4.7708, 52.2963], new: [4.7720, 52.3090] },
  // E pier mid: was ~52.2974°N, 4.7775°E  →  real E pier ~52.311°N, 4.766°E
  { old: [4.7775, 52.2974], new: [4.7668, 52.3118] },
  // E pier end: was ~52.2951°N, 4.7798°E  →  far end E pier ~52.313°N, 4.768°E
  { old: [4.7798, 52.2951], new: [4.7682, 52.3133] },
  // F pier mid: was ~52.2958°N, 4.7848°E  →  real F pier ~52.312°N, 4.762°E
  { old: [4.7848, 52.2958], new: [4.7618, 52.3122] },
  // F pier end: was ~52.2934°N, 4.7869°E  →  far end F pier ~52.313°N, 4.762°E
  { old: [4.7869, 52.2934], new: [4.7618, 52.3132] },
  // G pier end: was ~52.2921°N, 4.7914°E  →  real G pier ~52.312°N, 4.757°E
  { old: [4.7914, 52.2921], new: [4.7570, 52.3124] },
];

const TOLERANCE_LNG = 0.0005;
const TOLERANCE_LAT = 0.0005;

function findZone(lng, lat) {
  for (const z of ZONE_MAP) {
    if (
      Math.abs(lng - z.old[0]) <= TOLERANCE_LNG &&
      Math.abs(lat - z.old[1]) <= TOLERANCE_LAT
    ) return z;
  }
  return null;
}

const filePath = path.join(__dirname, "seedDatabase.js");
let content = fs.readFileSync(filePath, "utf8");

let replaced = 0;
content = content.replace(
  /coordinates: \[([\d.]+), ([\d.]+)\]/g,
  (match, lngStr, latStr) => {
    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);
    const zone = findZone(lng, lat);
    if (!zone) return match; // leave unchanged if not a service coordinate

    // Preserve small offset from anchor (keeps services from stacking)
    const dLng = lng - zone.old[0];
    const dLat = lat - zone.old[1];
    const newLng = (zone.new[0] + dLng).toFixed(4);
    const newLat = (zone.new[1] + dLat).toFixed(4);
    replaced++;
    return `coordinates: [${newLng}, ${newLat}]`;
  }
);

fs.writeFileSync(filePath, content, "utf8");
console.log(`✅ Replaced ${replaced} coordinate pairs.`);

// Verify no old wrong coordinates remain
const remaining = [...content.matchAll(/coordinates: \[([\d.]+), ([\d.]+)\]/g)]
  .filter(m => {
    const lat = parseFloat(m[2]);
    return lat < 52.300 || lat > 52.316;
  });
console.log(`⚠️  Coordinates outside Schiphol bounds after fix: ${remaining.length}`);
if (remaining.length) remaining.forEach(m => console.log(" →", m[0]));
