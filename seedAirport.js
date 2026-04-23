const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Service = require('./models/serviceModel');

dotenv.config();

const mapCategory = (tags) => {
  if (tags.aeroway === 'gate') return "COUNTERS";
  if (tags.amenity === 'bank' || tags.amenity === 'atm') return "FINANCIAL";
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') return "RESTAURANTS";
  if (tags.shop) return "SHOPS";
  return "SHOPS";
};

const seedAirport = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("MongoDB Connected");

    const query = `[out:json][timeout:60];
(
  node["shop"](52.290,4.730,52.320,4.790);
  node["amenity"="restaurant"](52.290,4.730,52.320,4.790);
  node["amenity"="cafe"](52.290,4.730,52.320,4.790);
  node["amenity"="bank"](52.290,4.730,52.320,4.790);
  node["amenity"="atm"](52.290,4.730,52.320,4.790);
  node["aeroway"="gate"](52.290,4.730,52.320,4.790);
);
out body;`;

    console.log("Fetching OSM data...");
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GateBuddy-SeedBot/1.0 (Contact: admin@gatebuddy.com)'
        } 
      }
    );

    const elements = response.data.elements;
    console.log(`Fetched ${elements.length} elements from Overpass.`);

    const documents = [];

    for (const element of elements) {
      const tags = element.tags || {};
      
      if (!tags.name) continue;

      documents.push({
        name: tags.name,
        category: mapCategory(tags),
        location: {
          type: "Point",
          coordinates: [element.lon, element.lat]
        },
        terminal: tags.description || "Schiphol Terminal",
        gate: tags.ref || null,
        operatingHours: tags.opening_hours || "24/24",
        status: "Open",
        rating: 0,
        description: tags.description || "",
        zone: tags.level || "0"
      });
    }

    if (documents.length > 0) {
      const inserted = await Service.insertMany(documents, { ordered: false });
      console.log(`Successfully mapped and inserted ${inserted.length} services.`);
    } else {
      console.log("No services with valid names were found.");
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedAirport();
