const fs = require('fs');
const path = require('path');

const MAPS_DIR = path.join(__dirname, '../gatebuddy-map/public/maps');

// Helper to normalize floor level to match DB (0, 1, 2)
const normalizeLevel = (level) => {
  if (level === undefined || level === null) return 0;
  const l = parseInt(level, 10);
  if (isNaN(l)) return 0;
  // If OSM level is provided directly, use it if it's within range
  if (l >= -1 && l <= 3) return l;
  return 0;
};

// Helper to determine feature type
const determineType = (props) => {
  const shop = props.shop || props.leisure || props.commercial;
  if (shop) return 'shop';
  if (props.amenity === 'restaurant' || props.amenity === 'cafe' || props.amenity === 'fast_food') return 'restaurant';
  if (props.amenity === 'toilets') return 'restroom';
  if (props.room === 'gate' || props.aeroway === 'gate') return 'gate';
  if (props.highway === 'corridor' || props.highway === 'footway' || props.indoor === 'corridor') return 'corridor';
  if (props.amenity === 'place_of_worship') return 'prayer_room';
  if (props.amenity === 'information' || props.information) return 'information';
  if (props.aeroway === 'baggage_reclaim' || props.amenity === 'baggage_reclaim') return 'baggage_claim';
  if (props.amenity === 'seating' || props.leisure === 'seating') return 'seating';
  if (props.amenity === 'bank' || props.amenity === 'atm') return 'financial';
  return props.type || 'room';
};

const mergeGeoJSON = () => {
  const files = ['ams-indoor.geojson', 'ams-corridors.geojson', 'ams-complete.geojson'];
  const allFeatures = [];
  const seenIds = new Set();

  files.forEach(file => {
    const filePath = path.join(MAPS_DIR, file);
    if (!fs.existsSync(filePath)) return;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.features.forEach(feature => {
      const id = feature.id || feature.properties['@id'];
      if (id && seenIds.has(id)) return;
      if (id) seenIds.add(id);

      // Normalize properties
      const props = feature.properties;
      const type = determineType(props);
      
      // Build a meaningful name from available OSM tags
      let name = props.name || props.ref || props.alt_name || props.description;
      
      if (!name) {
        // Try to build a name from specific tags
        if (props.aeroway === 'gate' && props.ref) {
          name = `Gate ${props.ref}`;
        } else if (props.shop) {
          name = props.shop.charAt(0).toUpperCase() + props.shop.slice(1).replace(/_/g, ' ');
        } else if (props.amenity) {
          const amenityName = props.amenity.charAt(0).toUpperCase() + props.amenity.slice(1).replace(/_/g, ' ');
          name = amenityName;
        } else if (props.leisure) {
          name = props.leisure.charAt(0).toUpperCase() + props.leisure.slice(1).replace(/_/g, ' ');
        } else if (props.room) {
          name = props.room.charAt(0).toUpperCase() + props.room.slice(1).replace(/_/g, ' ');
        } else if (props.indoor) {
          const indoorName = props.indoor.charAt(0).toUpperCase() + props.indoor.slice(1).replace(/_/g, ' ');
          name = indoorName;
        } else if (type !== 'room') {
          name = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
        } else {
          // Last resort: use the OSM ID to make it unique
          const shortId = id ? id.replace('way/', 'W').replace('node/', 'N').replace('relation/', 'R') : '';
          name = `Area ${shortId}`.trim();
        }
      }

      feature.properties = {
        id: id,
        name: name,
        type: type,
        level: normalizeLevel(props.level || props.layer),
        source: file
      };

      allFeatures.push(feature);
    });
  });

  // Add missing POIs from the manual list (mapped to level 0, 1, 2)
  const missingPOIs = [
    { name: "Lost & Found - Arrivals", coords: [4.7626, 52.3088], level: 0, type: 'information' },
    { name: "Lost & Found - Lounge 1", coords: [4.7622, 52.3065], level: 1, type: 'information' },
    { name: "Lost & Found - Holland Boulevard", coords: [4.7660, 52.3092], level: 1, type: 'information' },
    { name: "Information Desk - Plaza", coords: [4.7624, 52.3096], level: 0, type: 'information' },
    { name: "Information Desk - Departures 2", coords: [4.7635, 52.3100], level: 1, type: 'information' },
    { name: "Information Desk - Arrivals", coords: [4.7620, 52.3090], level: 0, type: 'information' },
    { name: "Multi-faith Prayer Room", coords: [4.7628, 52.3108], level: 2, type: 'prayer_room' },
    { name: "Baggage Claim Hall 1", coords: [4.7618, 52.3085], level: 0, type: 'baggage_claim' },
    { name: "Baggage Claim Hall 2", coords: [4.7632, 52.3087], level: 0, type: 'baggage_claim' },
    { name: "First Aid Center", coords: [4.7625, 52.3084], level: 0, type: 'accessibility' }
  ];

  missingPOIs.forEach(poi => {
    allFeatures.push({
      type: "Feature",
      properties: {
        id: `manual-${poi.name.replace(/\s+/g, '-').toLowerCase()}`,
        name: poi.name,
        type: poi.type,
        level: poi.level,
        source: 'manual'
      },
      geometry: {
        type: "Point",
        coordinates: poi.coords
      }
    });
  });

  const unified = {
    type: "FeatureCollection",
    features: allFeatures
  };

  fs.writeFileSync(path.join(MAPS_DIR, 'ams-unified.geojson'), JSON.stringify(unified, null, 2));
  console.log(`Successfully unified ${allFeatures.length} features into ams-unified.geojson`);
};

mergeGeoJSON();
