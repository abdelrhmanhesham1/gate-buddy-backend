const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Service = require("./models/serviceModel");

dotenv.config();

const missingPOIs = [
  // Lost & Found
  {
    name: "Lost & Found - Arrivals",
    category: "ACCESSIBILITY",
    location: { type: "Point", coordinates: [4.7626, 52.3088] },
    terminal: "Arrivals Hall",
    zone: "0",
    operatingHours: "24/24",
    status: "Open",
    rating: 0
  },
  {
    name: "Lost & Found - Lounge 1",
    category: "ACCESSIBILITY",
    location: { type: "Point", coordinates: [4.7622, 52.3065] },
    zone: "1",
    status: "Open",
    rating: 0
  },
  {
    name: "Lost & Found - Holland Boulevard",
    category: "ACCESSIBILITY",
    location: { type: "Point", coordinates: [4.7660, 52.3092] },
    zone: "1",
    status: "Open",
    rating: 0
  },
  // Information Desks
  {
    name: "Information Desk - Plaza",
    category: "ACCESSIBILITY",
    location: { type: "Point", coordinates: [4.7624, 52.3096] },
    zone: "0",
    status: "Open",
    rating: 0
  },
  {
    name: "Information Desk - Departures 2",
    category: "ACCESSIBILITY",
    location: { type: "Point", coordinates: [4.7635, 52.3100] },
    zone: "1",
    status: "Open",
    rating: 0
  },
  {
    name: "Information Desk - Arrivals",
    category: "ACCESSIBILITY",
    location: { type: "Point", coordinates: [4.7620, 52.3090] },
    zone: "0",
    status: "Open",
    rating: 0
  },
  // Prayer Room
  {
    name: "Multi-faith Prayer Room",
    category: "ACCESSIBILITY",
    location: { type: "Point", coordinates: [4.7628, 52.3108] },
    zone: "1",
    description: "Quiet multi-faith prayer and meditation room",
    status: "Open",
    rating: 0
  },
  // Baggage Claim
  {
    name: "Baggage Claim Hall 1",
    category: "COUNTERS",
    location: { type: "Point", coordinates: [4.7618, 52.3085] },
    zone: "-1",
    status: "Open",
    rating: 0
  },
  {
    name: "Baggage Claim Hall 2",
    category: "COUNTERS",
    location: { type: "Point", coordinates: [4.7632, 52.3087] },
    zone: "-1",
    status: "Open",
    rating: 0
  },
  // First Aid
  {
    name: "First Aid Center",
    category: "ACCESSIBILITY",
    location: { type: "Point", coordinates: [4.7625, 52.3084] },
    zone: "0",
    operatingHours: "24/24",
    status: "Open",
    rating: 0
  }
];

const seedMissing = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("MongoDB Connected for Seeding Missing POIs...");

    const result = await Service.insertMany(missingPOIs);
    console.log(`Successfully seeded ${result.length} missing POIs into the services collection.`);

    await mongoose.disconnect();
    console.log("MongoDB Disconnected.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error.message);
    process.exit(1);
  }
};

seedMissing();
