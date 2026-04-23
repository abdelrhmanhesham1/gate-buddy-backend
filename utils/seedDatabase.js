const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/userModel");
const Flight = require("../models/flightModel");
const Service = require("../models/serviceModel");
const Faq = require("../models/faqModel");
const Airport = require("../models/airportModel");
const Rating = require("../models/ratingModel");

dotenv.config();

const DB = process.env.DATABASE_URL;

const seedData = async () => {
  try {
    console.log("🧹 Clearing legacy data...");
    await Promise.all([
      User.deleteMany(),
      Service.deleteMany(),
      Faq.deleteMany(),
      Airport.deleteMany(),
      Rating.deleteMany()
    ]);

    console.log("⚠️ WARNING: Admin password is set to 'password1234' for development. Change in production!");
    
    console.log("👤 Creating Admin...");
    const admin = await User.create({
      name: "GateBuddy Admin",
      email: "admin@gatebuddy.com",
      password: "password1234",
      passwordConfirm: "password1234",
      role: "admin"
    });

    // Flights are now synced from AirLabs API — no fake seeds needed
    console.log("✈️  Flights: Skipped (populated by AirLabs sync job)");

    console.log("🏪 Seeding All Service Categories...");
    const services = await Service.create([
      // Counters - Varied Variety
      {
        name: "EgyptAir Business Counter", category: "COUNTERS",
        location: { type: "Point", coordinates: [31.400, 30.112] },
        terminal: "T3", level: "1", gate: "G1-G12", zone: "Zone B",
        rating: 4.5, status: "Open", airline: "EgyptAir"
      },
      {
        name: "Lufthansa Check-in", category: "COUNTERS",
        location: { type: "Point", coordinates: [31.398, 30.111] },
        terminal: "T2", level: "1", gate: "C15-C20", zone: "Zone A",
        rating: 4.2, status: "Closed", airline: "Lufthansa"
      },
      {
        name: "Emirates First Class", category: "COUNTERS",
        location: { type: "Point", coordinates: [31.399, 30.113] },
        terminal: "T2", level: "1", gate: "F01-F05", zone: "Zone C",
        rating: 4.9, status: "Busy", airline: "Emirates"
      },

      // Financial Services - SubCategories
      {
        name: "Banque Misr ATM", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [31.401, 30.115] },
        terminal: "T2", level: "1", zone: "Food Court Area",
        rating: 4.0, status: "Open"
      },
      {
        name: "HSBC Bank Branch", category: "FINANCIAL", subCategory: "Banks",
        location: { type: "Point", coordinates: [31.402, 30.116] },
        terminal: "T3", level: "1", zone: "Departure Hall",
        rating: 4.8, status: "Open"
      },
      {
        name: "Travelex Exchange", category: "FINANCIAL", subCategory: "Currency Exchange",
        location: { type: "Point", coordinates: [31.403, 30.117] },
        terminal: "T3", level: "1", zone: "Arrivals Center",
        rating: 4.3, status: "Open"
      },

      // Others
      {
        name: "Wheelchair Assistance", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [31.402, 30.110] },
        terminal: "T3", level: "1", zone: "Arrivals Center",
        rating: 4.9, status: "Open"
      },
      {
        name: "Pearl Lounge", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [31.399, 30.118] },
        terminal: "T2", level: "2", gate: "B01-B10", zone: "Departure Lounge",
        rating: 4.7, status: "Open"
      },
      {
        name: "Duty Free Shop", category: "SHOPS",
        location: { type: "Point", coordinates: [31.405, 30.120] },
        terminal: "T3", level: "1", zone: "Luxury Wing",
        rating: 4.3, status: "Open"
      },
      {
        name: "Starbucks Coffee", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [31.403, 30.119] },
        terminal: "T3", level: "1", gate: "G15", zone: "Gate Concourse",
        rating: 4.6, status: "Open"
      }
    ]);

    console.log("⭐ Seeding Sample App Ratings...");
    await Rating.create([
      { user: admin._id, rating: 5, review: "Excellent app! Extremely helpful for Cairene travelers." },
    ]);

    console.log("❓ Seeding FAQs...");
    await Faq.create([
      {
        question: "How can I track my flight?",
        answer: "Go to the 'Flights' tab and scan your boarding pass barcode or search by your flight number.",
        order: 1
      },
      {
        question: "Where is the prayer room located?",
        answer: "Prayer rooms are available in all terminals. In T3, it's located near Gate G12 and the food court area.",
        order: 2
      },
      {
        question: "Is there free Wi-Fi at CAI?",
        answer: "Yes, free Wi-Fi is available for 30 minutes. Look for the 'CAI-Free-WiFi' network.",
        order: 3
      },
      {
        question: "What should I do if I lose my luggage?",
        answer: "Visit the 'Lost and Found' counter in the Arrivals hall or contact your airline's baggage service counter.",
        order: 4
      }
    ]);

    console.log("🏙️ Seeding Destination Airports...");
    await Airport.create([
      {
        code: "DXB",
        name: "Dubai International Airport",
        operationHours: "24/7",
        contactCenter: "+971 4 224 5555",
        wifi: true,
        parkingSpaces: 3400
      },
      {
        code: "LHR",
        name: "London Heathrow Airport",
        operationHours: "24/7",
        contactCenter: "+44 344 335 1801",
        wifi: true,
        parkingSpaces: 24000
      },
      {
        code: "SSH",
        name: "Sharm El Sheikh International Airport",
        operationHours: "24/7",
        contactCenter: "+20 69 360 1140",
        wifi: true,
        parkingSpaces: 800
      },
      {
        code: "FRA",
        name: "Frankfurt Airport",
        operationHours: "24/7",
        contactCenter: "+49 69 690 79455",
        wifi: true,
        parkingSpaces: 17000
      },
      {
        code: "CDG",
        name: "Paris Charles de Gaulle Airport",
        operationHours: "24/7",
        contactCenter: "+33 1 70 36 39 50",
        wifi: true,
        parkingSpaces: 27000
      },
      {
        code: "DOH",
        name: "Hamad International Airport",
        operationHours: "24/7",
        contactCenter: "+974 4010 6666",
        wifi: true,
        parkingSpaces: 3325
      }
    ]);

    // Report Summary
    const stats = await Promise.all([
      User.countDocuments(),
      Flight.countDocuments(),
      Service.countDocuments(),
      Faq.countDocuments(),
      Airport.countDocuments(),
      Rating.countDocuments()
    ]);

    console.log(`✅ Seeding successful!`);
    console.log(`📊 STATS: Users: ${stats[0]}, Flights: ${stats[1]}, Services: ${stats[2]}, FAQs: ${stats[3]}, Airports: ${stats[4]}, Ratings: ${stats[5]}`);
    process.exit();
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

mongoose.connect(DB).then(seedData);
