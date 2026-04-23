const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const NavigationNode = require('./models/NavigationNode');

dotenv.config();

// Helper to calculate distance in meters between two coordinates
const getDistance = (lon1, lat1, lon2, lat2) => {
  const distanceDegrees = Math.sqrt(Math.pow(lon1 - lon2, 2) + Math.pow(lat1 - lat2, 2));
  return Math.round(distanceDegrees * 111000); // 1 degree ≈ 111km
};

const seedNavigation = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("MongoDB Connected");

    // Clear old data
    await NavigationNode.deleteMany({});
    console.log("Cleared existing navigation nodes.");

    // 1. Load Corridor Data
    const corridorPath = path.join(__dirname, '../gatebuddy-map/public/maps/ams-corridors.geojson');
    const corridorData = JSON.parse(fs.readFileSync(corridorPath, 'utf8'));
    
    const corridorNodes = new Map(); // Key: "lon,lat,level", Value: node object
    let corridorNodeCount = 0;

    console.log("Processing corridor segments...");
    corridorData.features.forEach((feature) => {
      const { geometry, properties } = feature;
      const level = properties.level ? parseInt(properties.level, 10) : (properties.layer ? parseInt(properties.layer, 10) : 0);
      
      let coords = [];
      if (geometry.type === "LineString") {
        coords = geometry.coordinates;
      } else if (geometry.type === "Polygon") {
        coords = geometry.coordinates[0]; // Exterior ring
      } else if (geometry.type === "MultiLineString") {
        coords = geometry.coordinates[0]; // Just take first for simplicity
      }

      for (let i = 0; i < coords.length; i++) {
        const [lon, lat] = coords[i];
        const key = `${lon},${lat},${level}`;
        
        if (!corridorNodes.has(key)) {
          corridorNodes.set(key, {
            nodeId: `corr-${corridorNodeCount++}`,
            name: `Corridor Point ${corridorNodeCount}`,
            type: "corridor",
            location: { type: "Point", coordinates: [lon, lat] },
            level: level,
            connectedTo: []
          });
        }

        // Connect to previous point in the segment
        if (i > 0) {
          const [prevLon, prevLat] = coords[i - 1];
          const prevKey = `${prevLon},${prevLat},${level}`;
          const currentNode = corridorNodes.get(key);
          const prevNode = corridorNodes.get(prevKey);

          const dist = getDistance(lon, lat, prevLon, prevLat);
          
          // Bidirectional connection
          if (!currentNode.connectedTo.find(c => c.nodeId === prevNode.nodeId)) {
            currentNode.connectedTo.push({ nodeId: prevNode.nodeId, distanceMeters: dist });
          }
          if (!prevNode.connectedTo.find(c => c.nodeId === currentNode.nodeId)) {
            prevNode.connectedTo.push({ nodeId: currentNode.nodeId, distanceMeters: dist });
          }
        }
      }
    });

    console.log(`Created ${corridorNodes.size} corridor nodes.`);

    // 2. Fetch POIs (Gates, Elevators, etc.)
    const query = `[out:json][timeout:60];
(
  node["aeroway"="gate"](52.290,4.730,52.320,4.790);
  node["highway"="elevator"](52.290,4.730,52.320,4.790);
  node["stairs"](52.290,4.730,52.320,4.790);
  node["highway"="steps"](52.290,4.730,52.320,4.790);
  node["aeroway"="checkpoint"](52.290,4.730,52.320,4.790);
);
out body;`;

    console.log("Fetching POI data from Overpass...");
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GateBuddy-SeedBot/1.0'
        }
      }
    );

    const elements = response.data.elements;
    console.log(`Fetched ${elements.length} POIs.`);

    const poiNodes = [];
    for (const element of elements) {
      const tags = element.tags || {};
      const level = tags.level ? parseInt(tags.level, 10) : 0;
      
      let type = "unknown";
      if (tags.highway === "elevator") type = "elevator";
      else if (tags.stairs || tags.highway === "steps") type = "stairs";
      else if (tags.aeroway === "checkpoint") type = "checkpoint";
      else if (tags.aeroway === "gate") type = "gate";

      if (type === "unknown") continue;

      const name = tags.name || tags.ref || `${type.charAt(0).toUpperCase() + type.slice(1)} ${element.id}`;

      const poiNode = {
        nodeId: `osm-${element.id}`,
        name: name,
        type: type,
        location: { type: "Point", coordinates: [element.lon, element.lat] },
        level: isNaN(level) ? 0 : level,
        connectedTo: []
      };

      // 3. Link POI to nearest Corridor Node on the SAME level
      let nearestCorr = null;
      let minDist = Infinity;

      for (const corr of corridorNodes.values()) {
        if (corr.level === poiNode.level) {
          const dist = getDistance(poiNode.location.coordinates[0], poiNode.location.coordinates[1], corr.location.coordinates[0], corr.location.coordinates[1]);
          if (dist < minDist) {
            minDist = dist;
            nearestCorr = corr;
          }
        }
      }

      // Only link if within 100 meters (prevent linking to wrong pier)
      if (nearestCorr && minDist < 100) {
        poiNode.connectedTo.push({ nodeId: nearestCorr.nodeId, distanceMeters: minDist });
        nearestCorr.connectedTo.push({ nodeId: poiNode.nodeId, distanceMeters: minDist });
      }

      poiNodes.push(poiNode);
    }

    // 4. Combine and Save
    const allNodes = [...Array.from(corridorNodes.values()), ...poiNodes];
    
    if (allNodes.length > 0) {
      await NavigationNode.insertMany(allNodes, { ordered: false });
      console.log(`Successfully seeded ${allNodes.length} nodes (${corridorNodes.size} corridors, ${poiNodes.length} POIs).`);
    } else {
      console.log("No nodes to insert.");
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error("Seeding error:", error.message || error);
    process.exit(1);
  }
};

seedNavigation();
