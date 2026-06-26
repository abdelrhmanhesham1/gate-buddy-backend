const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/userModel");
const Flight = require("../models/flightModel");
const Service = require("../models/serviceModel");
const Faq = require("../models/faqModel");
const Airport = require("../models/airportModel");
const Rating = require("../models/ratingModel");

const path = require("path");
dotenv.config({ path: path.join(__dirname, "../variables.env") });

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

    // Seed static AMS flights as baseline (AirLabs sync will upsert live data on top)
    console.log("✈️  Seeding baseline AMS flights...");
    const now = new Date();
    const h = (hrs) => new Date(now.getTime() + hrs * 60 * 60 * 1000);
    await Flight.deleteMany({});
    await Flight.create([
      // ── Departures ────────────────────────────────────────────────────────
      {
        flightNumber: "KL0601", direction: "departure", type: "international",
        airline: { name: "KLM Royal Dutch Airlines", logo: "https://pics.avs.io/200/200/KL.png" },
        route: { from: "AMS", fromCode: "AMS", to: "LHR", toCode: "LHR" },
        departure: { terminal: "2", gate: "D59", scheduledTime: h(1) },
        arrival:   { terminal: "5", gate: "B32", scheduledTime: h(2.5) },
        status: "ON_TIME",
      },
      {
        flightNumber: "KL0643", direction: "departure", type: "international",
        airline: { name: "KLM Royal Dutch Airlines", logo: "https://pics.avs.io/200/200/KL.png" },
        route: { from: "AMS", fromCode: "AMS", to: "CDG", toCode: "CDG" },
        departure: { terminal: "2", gate: "E18", scheduledTime: h(1.5) },
        arrival:   { terminal: "2E", gate: "K22", scheduledTime: h(3) },
        status: "ON_TIME",
      },
      {
        flightNumber: "EK0149", direction: "departure", type: "international",
        airline: { name: "Emirates", logo: "https://pics.avs.io/200/200/EK.png" },
        route: { from: "AMS", fromCode: "AMS", to: "DXB", toCode: "DXB" },
        departure: { terminal: "2", gate: "F4", scheduledTime: h(2) },
        arrival:   { terminal: "3", gate: "C14", scheduledTime: h(8.5) },
        status: "ON_TIME",
      },
      {
        flightNumber: "LH0991", direction: "departure", type: "international",
        airline: { name: "Lufthansa", logo: "https://pics.avs.io/200/200/LH.png" },
        route: { from: "AMS", fromCode: "AMS", to: "FRA", toCode: "FRA" },
        departure: { terminal: "2", gate: "D7", scheduledTime: h(2.5) },
        arrival:   { terminal: "1", gate: "B26", scheduledTime: h(4) },
        status: "DELAYED",
      },
      {
        flightNumber: "TK1952", direction: "departure", type: "international",
        airline: { name: "Turkish Airlines", logo: "https://pics.avs.io/200/200/TK.png" },
        route: { from: "AMS", fromCode: "AMS", to: "IST", toCode: "IST" },
        departure: { terminal: "2", gate: "F8", scheduledTime: h(3) },
        arrival:   { terminal: "I", gate: "G11", scheduledTime: h(7) },
        status: "BOARDING",
      },
      {
        flightNumber: "BA0428", direction: "departure", type: "international",
        airline: { name: "British Airways", logo: "https://pics.avs.io/200/200/BA.png" },
        route: { from: "AMS", fromCode: "AMS", to: "LHR", toCode: "LHR" },
        departure: { terminal: "2", gate: "D64", scheduledTime: h(4) },
        arrival:   { terminal: "5", gate: "A12", scheduledTime: h(5.5) },
        status: "ON_TIME",
      },
      {
        flightNumber: "U21978", direction: "departure", type: "international",
        airline: { name: "easyJet", logo: "https://pics.avs.io/200/200/U2.png" },
        route: { from: "AMS", fromCode: "AMS", to: "BCN", toCode: "BCN" },
        departure: { terminal: "2", gate: "C14", scheduledTime: h(4.5) },
        arrival:   { terminal: "2", gate: "B11", scheduledTime: h(7) },
        status: "ON_TIME",
      },
      {
        flightNumber: "QR0271", direction: "departure", type: "international",
        airline: { name: "Qatar Airways", logo: "https://pics.avs.io/200/200/QR.png" },
        route: { from: "AMS", fromCode: "AMS", to: "DOH", toCode: "DOH" },
        departure: { terminal: "2", gate: "F2", scheduledTime: h(5) },
        arrival:   { terminal: "D", gate: "D16", scheduledTime: h(11) },
        status: "ON_TIME",
      },
      {
        flightNumber: "HV5104", direction: "departure", type: "international",
        airline: { name: "Transavia", logo: "https://pics.avs.io/200/200/HV.png" },
        route: { from: "AMS", fromCode: "AMS", to: "MAD", toCode: "MAD" },
        departure: { terminal: "2", gate: "B28", scheduledTime: h(6) },
        arrival:   { terminal: "4S", gate: "G5", scheduledTime: h(9) },
        status: "ON_TIME",
      },
      {
        flightNumber: "AF1240", direction: "departure", type: "international",
        airline: { name: "Air France", logo: "https://pics.avs.io/200/200/AF.png" },
        route: { from: "AMS", fromCode: "AMS", to: "CDG", toCode: "CDG" },
        departure: { terminal: "2", gate: "E20", scheduledTime: h(6.5) },
        arrival:   { terminal: "2F", gate: "L41", scheduledTime: h(8) },
        status: "DELAYED",
      },

      // ── Arrivals ──────────────────────────────────────────────────────────
      {
        flightNumber: "KL0868", direction: "arrival", type: "international",
        airline: { name: "KLM Royal Dutch Airlines", logo: "https://pics.avs.io/200/200/KL.png" },
        route: { from: "JFK", fromCode: "JFK", to: "AMS", toCode: "AMS" },
        departure: { terminal: "4", gate: "B32", scheduledTime: h(-8) },
        arrival:   { terminal: "2", gate: "D57", scheduledTime: h(0.5) },
        status: "IN_FLIGHT",
      },
      {
        flightNumber: "EK0148", direction: "arrival", type: "international",
        airline: { name: "Emirates", logo: "https://pics.avs.io/200/200/EK.png" },
        route: { from: "DXB", fromCode: "DXB", to: "AMS", toCode: "AMS" },
        departure: { terminal: "3", gate: "C16", scheduledTime: h(-7) },
        arrival:   { terminal: "2", gate: "F6", scheduledTime: h(1) },
        status: "IN_FLIGHT",
      },
      {
        flightNumber: "LH0990", direction: "arrival", type: "international",
        airline: { name: "Lufthansa", logo: "https://pics.avs.io/200/200/LH.png" },
        route: { from: "FRA", fromCode: "FRA", to: "AMS", toCode: "AMS" },
        departure: { terminal: "1", gate: "A18", scheduledTime: h(-2) },
        arrival:   { terminal: "2", gate: "D9", scheduledTime: h(1.5) },
        status: "ON_TIME",
      },
      {
        flightNumber: "TK1951", direction: "arrival", type: "international",
        airline: { name: "Turkish Airlines", logo: "https://pics.avs.io/200/200/TK.png" },
        route: { from: "IST", fromCode: "IST", to: "AMS", toCode: "AMS" },
        departure: { terminal: "I", gate: "G9", scheduledTime: h(-5) },
        arrival:   { terminal: "2", gate: "F3", scheduledTime: h(2) },
        status: "DELAYED",
      },
      {
        flightNumber: "QR0270", direction: "arrival", type: "international",
        airline: { name: "Qatar Airways", logo: "https://pics.avs.io/200/200/QR.png" },
        route: { from: "DOH", fromCode: "DOH", to: "AMS", toCode: "AMS" },
        departure: { terminal: "D", gate: "D14", scheduledTime: h(-7) },
        arrival:   { terminal: "2", gate: "F1", scheduledTime: h(3) },
        status: "IN_FLIGHT",
      },
    ]);
    console.log("✅ 15 baseline AMS flights seeded.");

    console.log("🏪 Seeding Schiphol Airport Services...");

    const IMG = {
      starbucks:        "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&w=800",
      coffee_counter:   "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&w=800",
      burger:           "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&w=800",
      fast_food:        "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&w=800",
      mcdonalds:        "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&w=800",
      sushi:            "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&w=800",
      sushi_belt:       "https://images.unsplash.com/photo-1617196034183-421b4040ed20?auto=format&w=800",
      italian:          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&w=800",
      pizza:            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&w=800",
      dutch_cafe:       "https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&w=800",
      bar_interior:     "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&w=800",
      beer_tap:         "https://images.unsplash.com/photo-1436076863939-06870fe779c2?auto=format&w=800",
      heineken:         "https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&w=800",
      wine_bar:         "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&w=800",
      noodles:          "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?auto=format&w=800",
      kebab:            "https://images.unsplash.com/photo-1529008922463-fd89f4de7519?auto=format&w=800",
      sandwich:         "https://images.unsplash.com/photo-1553909489-ec61b98ef773?auto=format&w=800",
      healthy:          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&w=800",
      food_grab:        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&w=800",
      donuts:           "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&w=800",
      lounge:           "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&w=800",
      lounge_seating:   "https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&w=800",
      lounge_dining:    "https://images.unsplash.com/photo-1551882547-ff40c4ba1bfc?auto=format&w=800",
      duty_free:        "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&w=800",
      luxury_shop:      "https://images.unsplash.com/photo-1551232864-3f0890e580d9?auto=format&w=800",
      fashion:          "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&w=800",
      perfume:          "https://images.unsplash.com/photo-1592945403245-4171f35e12af?auto=format&w=800",
      cosmetics:        "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&w=800",
      tech:             "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&w=800",
      headphones:       "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&w=800",
      books:            "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&w=800",
      souvenirs:        "https://images.unsplash.com/photo-1584888638393-af6ef3e70b12?auto=format&w=800",
      pharmacy:         "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&w=800",
      wellness:         "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&w=800",
      jewelry:          "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&w=800",
      watches:          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&w=800",
      chocolate:        "https://images.unsplash.com/photo-1511381939415-e44cd2442b8f?auto=format&w=800",
      kids_lego:        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&w=800",
      rituals:          "https://images.unsplash.com/photo-1584553421349-3557471bed79?auto=format&w=800",
      atm:              "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&w=800",
      forex:            "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&w=800",
    };

    const services = await Service.create([

      // ══════════════════════════════════════════════════════════════════════
      // COUNTERS — Airline Check-in Desks  (~20)
      // Zones: DEP1 [4.7585,52.3102]  DEP2 [4.7648,52.3108]  DEP3 [4.7712,52.3113]
      // ══════════════════════════════════════════════════════════════════════

      // — Departure Hall 1 (west) —
      {
        name: "Ryanair Check-in (Desks 1–6, Hall 1)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7585, 52.3102] },
        terminal: "Departure Hall 1", gate: "B Pier", zone: "Departures Level 2",
        rating: 3.5, status: "Open", airline: "Ryanair",
        airlineLogo: "https://pics.avs.io/200/200/FR.png",
        gates: ["B1", "B4", "B6"],
        services: ["Check-in", "Priority Bag Drop"],
        operatingHours: "04:30–20:30"
      },
      {
        name: "Transavia Check-in (Desks 70–82, Hall 1)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7587, 52.3101] },
        terminal: "Departure Hall 1", gate: "B Pier", zone: "Departures Level 2",
        rating: 3.9, status: "Open", airline: "Transavia",
        airlineLogo: "https://pics.avs.io/200/200/HV.png",
        gates: ["B28", "B30"],
        services: ["Check-in", "Bag Drop"],
        operatingHours: "04:00–21:00"
      },
      {
        name: "easyJet Check-in (Desks 7–14, Hall 1)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7583, 52.3103] },
        terminal: "Departure Hall 1", gate: "C Pier", zone: "Departures Level 2",
        rating: 3.8, status: "Open", airline: "easyJet",
        airlineLogo: "https://pics.avs.io/200/200/U2.png",
        gates: ["C14", "C16"],
        services: ["Check-in", "Bag Drop", "Speedy Boarding Desk"],
        operatingHours: "04:00–20:00"
      },
      {
        name: "Vueling Check-in (Desks 83–88, Hall 1)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7589, 52.3102] },
        terminal: "Departure Hall 1", gate: "B/C Pier", zone: "Departures Level 2",
        rating: 3.7, status: "Open", airline: "Vueling",
        airlineLogo: "https://pics.avs.io/200/200/VY.png",
        gates: ["C10", "C12"],
        services: ["Check-in", "Bag Drop"],
        operatingHours: "05:00–20:00"
      },

      // — Departure Hall 2 (central) —
      {
        name: "KLM Check-in (Desks 1–99)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7648, 52.3108] },
        terminal: "Departure Hall 2", gate: "D/E Pier", zone: "Departures Level 2",
        rating: 4.2, status: "Open", airline: "KLM",
        airlineLogo: "https://pics.avs.io/200/200/KL.png",
        gates: ["D57", "D59", "E18", "E20"],
        services: ["Check-in", "Baggage Drop", "Special Assistance", "Flying Blue Desk"],
        operatingHours: "04:00–22:00"
      },
      // — Departure Hall 2 (central) continued —
      {
        name: "KLM Business Class Check-in (Desks 100–115)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7650, 52.3107] },
        terminal: "Departure Hall 2", gate: "D Pier", zone: "Departures Level 2",
        rating: 4.7, status: "Open", airline: "KLM",
        airlineLogo: "https://pics.avs.io/200/200/KL.png",
        gates: ["D57", "D59"],
        services: ["Business Class Check-in", "Priority Baggage", "Lounge Access Confirmation"],
        operatingHours: "04:00–22:00"
      },
      {
        name: "Emirates Check-in (Desks 25–35)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7646, 52.3109] },
        terminal: "Departure Hall 2", gate: "F Pier", zone: "Departures Level 2",
        rating: 4.7, status: "Open", airline: "Emirates",
        airlineLogo: "https://pics.avs.io/200/200/EK.png",
        gates: ["F1", "F2", "F4", "F6"],
        services: ["First Class Check-in", "Business Class", "Baggage Drop", "Skywards Desk"],
        operatingHours: "05:00–21:00"
      },
      {
        name: "Lufthansa Check-in (Desks 8–14)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7648, 52.3106] },
        terminal: "Departure Hall 2", gate: "D Pier", zone: "Departures Level 2",
        rating: 4.1, status: "Open", airline: "Lufthansa",
        airlineLogo: "https://pics.avs.io/200/200/LH.png",
        gates: ["D7", "D9"],
        services: ["Check-in", "Baggage Drop", "Miles & More Desk"],
        operatingHours: "05:00–20:00"
      },
      {
        name: "Turkish Airlines Check-in (Desks 40–48)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7652, 52.3108] },
        terminal: "Departure Hall 2", gate: "F Pier", zone: "Departures Level 2",
        rating: 4.0, status: "Open", airline: "Turkish Airlines",
        airlineLogo: "https://pics.avs.io/200/200/TK.png",
        gates: ["F8", "F3"],
        services: ["Check-in", "Baggage Drop", "Miles&Smiles Desk"],
        operatingHours: "04:30–21:30"
      },
      {
        name: "British Airways Check-in (Desks 56–62)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7644, 52.3109] },
        terminal: "Departure Hall 2", gate: "D Pier", zone: "Departures Level 2",
        rating: 4.1, status: "Open", airline: "British Airways",
        airlineLogo: "https://pics.avs.io/200/200/BA.png",
        gates: ["D64", "D62"],
        services: ["Check-in", "Baggage Drop", "Executive Club Desk"],
        operatingHours: "05:00–20:30"
      },
      {
        name: "Qatar Airways Check-in (Desks 17–22)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7650, 52.3110] },
        terminal: "Departure Hall 2", gate: "F Pier", zone: "Departures Level 2",
        rating: 4.8, status: "Open", airline: "Qatar Airways",
        airlineLogo: "https://pics.avs.io/200/200/QR.png",
        gates: ["F1", "F2"],
        services: ["Business & First Class", "Privilege Club Desk", "Baggage Drop"],
        operatingHours: "05:00–22:00"
      },
      {
        name: "Air France Check-in (Desks 50–56)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7646, 52.3107] },
        terminal: "Departure Hall 2", gate: "E Pier", zone: "Departures Level 2",
        rating: 4.0, status: "Open", airline: "Air France",
        airlineLogo: "https://pics.avs.io/200/200/AF.png",
        gates: ["E20", "E18"],
        services: ["Check-in", "Baggage Drop", "Flying Blue Desk"],
        operatingHours: "05:00–21:00"
      },
      {
        name: "Swiss International Check-in (Desks 15–18)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7652, 52.3109] },
        terminal: "Departure Hall 2", gate: "D Pier", zone: "Departures Level 2",
        rating: 4.3, status: "Open", airline: "Swiss",
        airlineLogo: "https://pics.avs.io/200/200/LX.png",
        gates: ["D11", "D13"],
        services: ["Check-in", "Baggage Drop"],
        operatingHours: "05:30–20:00"
      },

      // — Departure Hall 3 (east) —
      {
        name: "Singapore Airlines Check-in (Desks 30–36)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7712, 52.3113] },
        terminal: "Departure Hall 3", gate: "F Pier", zone: "Departures Level 2",
        rating: 4.9, status: "Open", airline: "Singapore Airlines",
        airlineLogo: "https://pics.avs.io/200/200/SQ.png",
        gates: ["F5", "F7"],
        services: ["First & Business Class", "KrisFlyer Desk", "Baggage Drop"],
        operatingHours: "06:00–20:00"
      },
      {
        name: "Etihad Airways Check-in (Desks 22–28)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7710, 52.3114] },
        terminal: "Departure Hall 3", gate: "F Pier", zone: "Departures Level 2",
        rating: 4.5, status: "Open", airline: "Etihad Airways",
        airlineLogo: "https://pics.avs.io/200/200/EY.png",
        gates: ["F9", "F11"],
        services: ["First & Business Class", "Guest Services", "Baggage Drop"],
        operatingHours: "05:30–21:30"
      },
      {
        name: "United Airlines Check-in (Desks 35–40)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7714, 52.3112] },
        terminal: "Departure Hall 3", gate: "G Pier", zone: "Departures Level 2",
        rating: 3.9, status: "Open", airline: "United Airlines",
        airlineLogo: "https://pics.avs.io/200/200/UA.png",
        gates: ["G5", "G7"],
        services: ["Check-in", "Baggage Drop", "MileagePlus Desk"],
        operatingHours: "05:00–21:00"
      },
      {
        name: "Cathay Pacific Check-in (Desks 41–46)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7708, 52.3113] },
        terminal: "Departure Hall 3", gate: "G Pier", zone: "Departures Level 2",
        rating: 4.4, status: "Open", airline: "Cathay Pacific",
        airlineLogo: "https://pics.avs.io/200/200/CX.png",
        gates: ["G9", "G11"],
        services: ["First & Business Class", "Marco Polo Desk", "Baggage Drop"],
        operatingHours: "06:00–21:00"
      },
      {
        name: "Delta Air Lines Check-in (Desks 47–52)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7716, 52.3114] },
        terminal: "Departure Hall 3", gate: "G Pier", zone: "Departures Level 2",
        rating: 4.0, status: "Open", airline: "Delta Air Lines",
        airlineLogo: "https://pics.avs.io/200/200/DL.png",
        gates: ["G13", "G15"],
        services: ["Check-in", "Baggage Drop", "SkyMiles Desk"],
        operatingHours: "05:00–20:00"
      },
      {
        name: "American Airlines Check-in (Desks 53–58)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7710, 52.3112] },
        terminal: "Departure Hall 3", gate: "G Pier", zone: "Departures Level 2",
        rating: 3.8, status: "Open", airline: "American Airlines",
        airlineLogo: "https://pics.avs.io/200/200/AA.png",
        gates: ["G17", "G19"],
        services: ["Check-in", "Baggage Drop", "AAdvantage Desk"],
        operatingHours: "05:30–20:30"
      },
      {
        name: "Iberia Check-in (Desks 59–64)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7714, 52.3113] },
        terminal: "Departure Hall 3", gate: "E Pier", zone: "Departures Level 2",
        rating: 3.9, status: "Open", airline: "Iberia",
        airlineLogo: "https://pics.avs.io/200/200/IB.png",
        gates: ["E1", "E3"],
        services: ["Check-in", "Baggage Drop", "Iberia Plus Desk"],
        operatingHours: "05:00–21:00"
      },

      // ══════════════════════════════════════════════════════════════════════
      // FINANCIAL (~15)
      // ══════════════════════════════════════════════════════════════════════

      // — Departure Halls —
      {
        name: "GWK Travelex — Departure Hall 1", category: "FINANCIAL", subCategory: "Currency Exchange",
        location: { type: "Point", coordinates: [4.7585, 52.3103] },
        terminal: "Departure Hall 1", zone: "Departures Level 2 (before security)",
        rating: 3.8, status: "Open", operatingHours: "06:00–22:00",
        description: "Currency exchange and travel money. 40+ currencies available."
      },
      {
        name: "ABN AMRO ATM — Departure Hall 1", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7583, 52.3102] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 4.1, status: "Open", operatingHours: "24/24"
      },
      {
        name: "GWK Travelex — Departure Hall 2", category: "FINANCIAL", subCategory: "Currency Exchange",
        location: { type: "Point", coordinates: [4.7650, 52.3108] },
        terminal: "Departure Hall 2", zone: "Departures Level 2 (before security)",
        rating: 3.9, status: "Open", operatingHours: "06:00–22:00",
        description: "Currency exchange and travel money. Click & collect available."
      },
      {
        name: "ABN AMRO ATM — Departure Hall 2", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7646, 52.3108] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.1, status: "Open", operatingHours: "24/24"
      },
      {
        name: "ABN AMRO Travel Insurance Desk", category: "FINANCIAL", subCategory: "Insurance",
        location: { type: "Point", coordinates: [4.7648, 52.3110] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.0, status: "Open", operatingHours: "07:00–21:00",
        description: "Last-minute travel and baggage insurance."
      },
      {
        name: "GWK Travelex — Departure Hall 3", category: "FINANCIAL", subCategory: "Currency Exchange",
        location: { type: "Point", coordinates: [4.7712, 52.3115] },
        terminal: "Departure Hall 3", zone: "Departures Level 2 (before security)",
        rating: 3.8, status: "Open", operatingHours: "06:00–22:00",
        description: "Currency exchange kiosk. Euros, USD, GBP, and 30+ currencies."
      },
      {
        name: "Rabobank ATM — Departure Hall 3", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7710, 52.3113] },
        terminal: "Departure Hall 3", zone: "Departures Level 2",
        rating: 4.0, status: "Open", operatingHours: "24/24"
      },

      // — Arrivals Halls —
      {
        name: "GWK Travelex — Arrivals Hall 2", category: "FINANCIAL", subCategory: "Currency Exchange",
        location: { type: "Point", coordinates: [4.7643, 52.3093] },
        terminal: "Arrivals Hall 2", zone: "Arrivals Level 1",
        rating: 3.8, status: "Open", operatingHours: "06:00–23:00",
        description: "First currency exchange after landing. Euro and major currencies."
      },
      {
        name: "ABN AMRO ATM — Arrivals Hall 2", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7645, 52.3092] },
        terminal: "Arrivals Hall 2", zone: "Arrivals Level 1",
        rating: 4.2, status: "Open", operatingHours: "24/24"
      },
      {
        name: "GWK Travelex — Arrivals Hall 3", category: "FINANCIAL", subCategory: "Currency Exchange",
        location: { type: "Point", coordinates: [4.7710, 52.3097] },
        terminal: "Arrivals Hall 3", zone: "Arrivals Level 1",
        rating: 3.7, status: "Open", operatingHours: "06:00–23:00",
        description: "Currency exchange in eastern arrivals. Competitive rates post-landing."
      },
      {
        name: "ING ATM — Arrivals Hall 3", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7708, 52.3097] },
        terminal: "Arrivals Hall 3", zone: "Arrivals Level 1",
        rating: 4.0, status: "Open", operatingHours: "24/24"
      },

      // — Schiphol Plaza & Airside —
      {
        name: "Rabobank ATM — Schiphol Plaza", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7638, 52.3071] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.0, status: "Open", operatingHours: "24/24"
      },
      {
        name: "GWK Travelex — Non-Schengen E Pier", category: "FINANCIAL", subCategory: "Currency Exchange",
        location: { type: "Point", coordinates: [4.7777, 52.2973] },
        terminal: "Non-Schengen", zone: "E Pier (after passport control)",
        rating: 4.0, status: "Open", operatingHours: "05:00–22:00",
        description: "Airside currency exchange with competitive rates."
      },
      {
        name: "ING ATM — E Pier (Non-Schengen)", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7775, 52.2974] },
        terminal: "Non-Schengen", zone: "E Pier (after security)",
        rating: 4.0, status: "Open", operatingHours: "24/24"
      },
      {
        name: "ABN AMRO ATM — F Pier (Non-Schengen)", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7848, 52.2958] },
        terminal: "Non-Schengen", zone: "F Pier (airside)",
        rating: 3.9, status: "Open", operatingHours: "24/24"
      },

      // ══════════════════════════════════════════════════════════════════════
      // VIP SERVICES — Lounges (~10) — all in pier zones (airside)
      // ══════════════════════════════════════════════════════════════════════
      {
        name: "Aspire Lounge — B Pier (Schengen)", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7535, 52.3001] },
        terminal: "Schengen", gate: "B Pier", zone: "B Pier mid (airside)",
        rating: 4.2, status: "Open", operatingHours: "05:00–21:00",
        amenities: ["Free Wi-Fi", "Hot Food", "Bar", "Priority Pass & DragonPass Access"]
      },
      {
        name: "No1 Lounge — C Pier (Schengen)", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7618, 52.2993] },
        terminal: "Schengen", gate: "C Pier", zone: "C Pier mid (airside)",
        rating: 4.3, status: "Open", operatingHours: "05:30–21:30",
        amenities: ["Free Wi-Fi", "Buffet", "Bar", "Newspapers", "Open Access"]
      },
      {
        name: "KLM Crown Lounge 52 (Schengen)", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7700, 52.2986] },
        terminal: "Schengen", gate: "D Pier", zone: "D Pier mid (airside)",
        rating: 4.5, status: "Open", operatingHours: "05:00–22:00",
        amenities: ["Free Wi-Fi", "Snacks", "Bar", "Business Centre", "SkyTeam Access"]
      },
      {
        name: "Lufthansa Business Lounge — D Pier", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7702, 52.2987] },
        terminal: "Schengen", gate: "D Pier", zone: "D Pier mid (airside)",
        rating: 4.4, status: "Open", operatingHours: "05:30–21:00",
        amenities: ["Free Wi-Fi", "Buffet", "Bar", "Showers", "Miles & More Access"]
      },
      {
        name: "KLM Crown Lounge 25 (Non-Schengen)", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7775, 52.2974] },
        terminal: "Non-Schengen", gate: "E Pier", zone: "E Pier mid (airside)",
        rating: 4.6, status: "Open", operatingHours: "05:00–23:00",
        amenities: ["Free Wi-Fi", "Hot Meals", "Full Bar", "Showers", "Business Centre", "SkyTeam Access", "Panoramic Views"]
      },
      {
        name: "The Lounge Amsterdam — Non-Schengen", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7777, 52.2975] },
        terminal: "Non-Schengen", gate: "E Pier", zone: "E Pier mid (airside)",
        rating: 4.4, status: "Open", operatingHours: "05:00–23:00",
        amenities: ["Free Wi-Fi", "Hot & Cold Buffet", "Premium Bar", "Showers", "Quiet Zone", "Open Access (fee)"]
      },
      {
        name: "Singapore Airlines SilverKris Lounge", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7848, 52.2958] },
        terminal: "Non-Schengen", gate: "F Pier", zone: "F Pier mid (airside)",
        rating: 4.8, status: "Open", operatingHours: "06:00–20:00",
        amenities: ["Free Wi-Fi", "À la Carte Dining", "Premium Bar", "Showers", "Business Suites", "SIA Business Class Access"]
      },
      {
        name: "Emirates Business Class Lounge", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7850, 52.2957] },
        terminal: "Non-Schengen", gate: "F Pier", zone: "F Pier mid (airside)",
        rating: 4.7, status: "Open", operatingHours: "05:00–21:00",
        amenities: ["Free Wi-Fi", "Gourmet Buffet", "Cocktail Bar", "Showers", "Emirates Business/First Access"]
      },
      {
        name: "Qatar Airways Al Mourjan Lounge — F/G Pier", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7869, 52.2934] },
        terminal: "Non-Schengen", gate: "G Pier", zone: "F/G Pier (airside)",
        rating: 4.8, status: "Open", operatingHours: "05:00–22:00",
        amenities: ["Free Wi-Fi", "Gourmet Buffet", "Full Bar", "Showers", "Privilege Club Access"]
      },
      {
        name: "Turkish Airlines Lounge — G Pier", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7914, 52.2921] },
        terminal: "Non-Schengen", gate: "G Pier", zone: "G Pier (airside)",
        rating: 4.5, status: "Open", operatingHours: "05:00–22:00",
        amenities: ["Free Wi-Fi", "Hot Buffet", "Bar", "Showers", "Miles&Smiles Access"]
      },

      // ══════════════════════════════════════════════════════════════════════
      // ACCESSIBILITY (~20) — spread across all halls and piers
      // ══════════════════════════════════════════════════════════════════════

      // — Departure Hall 1 —
      {
        name: "Schiphol Assistance Desk — Departure Hall 1", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7585, 52.3104] },
        terminal: "Departure Hall 1", zone: "Departures Level 2 (before security)",
        rating: 4.7, status: "Open", operatingHours: "04:00–23:00",
        amenities: ["Wheelchair Assistance", "Electric Cart", "Priority Security", "Boarding Support"]
      },
      {
        name: "Prayer Room — Departure Hall 1", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7583, 52.3101] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 4.4, status: "Open", operatingHours: "24/24",
        amenities: ["Multi-Faith", "Ablution Facilities", "Prayer Mats", "Direction Indicator"]
      },
      {
        name: "Baby Care Room — Departure Hall 1", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7587, 52.3103] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 4.5, status: "Open", operatingHours: "24/24",
        amenities: ["Changing Tables", "Nursing Area", "Bottle Warming", "Privacy Screens"]
      },

      // — Departure Hall 2 —
      {
        name: "Schiphol Assistance Desk — Departure Hall 2", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7648, 52.3109] },
        terminal: "Departure Hall 2", zone: "Departures Level 2 (before security)",
        rating: 4.7, status: "Open", operatingHours: "04:00–23:00",
        amenities: ["Wheelchair Assistance", "Electric Cart", "Priority Security", "Boarding Support"]
      },
      {
        name: "Prayer Room — Departure Hall 2", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7650, 52.3106] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.4, status: "Open", operatingHours: "24/24",
        amenities: ["Multi-Faith", "Ablution Facilities", "Prayer Mats", "Direction Indicator"]
      },
      {
        name: "Baby Care Room — Departure Hall 2", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7646, 52.3107] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.6, status: "Open", operatingHours: "24/24",
        amenities: ["Changing Tables", "Nursing Area", "Bottle Warming", "Privacy Screens"]
      },
      {
        name: "Schiphol Medical Centre", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7648, 52.3111] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.8, status: "Open", operatingHours: "07:00–22:00",
        amenities: ["First Aid", "GP Consultation", "Travel Vaccinations", "Pharmacy", "AED Defibrillators"]
      },
      {
        name: "Quiet Room — Departure Hall 2", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7652, 52.3107] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.4, status: "Open", operatingHours: "24/24",
        amenities: ["Sensory-Friendly", "Low Noise", "Dimmed Lighting", "Comfortable Seating"]
      },

      // — Departure Hall 3 —
      {
        name: "Schiphol Assistance Desk — Departure Hall 3", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7712, 52.3116] },
        terminal: "Departure Hall 3", zone: "Departures Level 2 (before security)",
        rating: 4.6, status: "Open", operatingHours: "04:00–23:00",
        amenities: ["Wheelchair Assistance", "Electric Cart", "Priority Security", "Boarding Support"]
      },
      {
        name: "Baby Care Room — Departure Hall 3", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7710, 52.3115] },
        terminal: "Departure Hall 3", zone: "Departures Level 2",
        rating: 4.5, status: "Open", operatingHours: "24/24",
        amenities: ["Changing Tables", "Nursing Area", "Bottle Warming"]
      },

      // — Arrivals Halls —
      {
        name: "Schiphol Assistance Desk — Arrivals Hall 2", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7643, 52.3094] },
        terminal: "Arrivals Hall 2", zone: "Arrivals Level 1",
        rating: 4.6, status: "Open", operatingHours: "04:00–23:00",
        amenities: ["Wheelchair Assistance", "Meet & Greet", "Baggage Assistance"]
      },
      {
        name: "Baby Care Room — Arrivals Hall 2", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7641, 52.3093] },
        terminal: "Arrivals Hall 2", zone: "Arrivals Level 1",
        rating: 4.5, status: "Open", operatingHours: "24/24",
        amenities: ["Changing Tables", "Nursing Area"]
      },
      {
        name: "Lost & Found — Schiphol Plaza", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7638, 52.3073] },
        terminal: "Schiphol Plaza", zone: "Level 1",
        rating: 4.1, status: "Open", operatingHours: "07:00–22:00",
        amenities: ["Lost Property Registration", "Online Tracking", "Baggage Claim Support"]
      },
      {
        name: "Schiphol Assistance Desk — Arrivals Hall 3", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7710, 52.3099] },
        terminal: "Arrivals Hall 3", zone: "Arrivals Level 1",
        rating: 4.5, status: "Open", operatingHours: "04:00–23:00",
        amenities: ["Wheelchair Assistance", "Meet & Greet", "Escort Service"]
      },
      {
        name: "Schiphol Assistance Desk — Arrivals Hall 4", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7735, 52.3099] },
        terminal: "Arrivals Hall 4", zone: "Arrivals Level 1",
        rating: 4.5, status: "Open", operatingHours: "04:00–23:00",
        amenities: ["Wheelchair Assistance", "Meet & Greet", "Escort Service"]
      },

      // — Piers (airside) —
      {
        name: "Quiet Room — B Pier (Schengen)", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7535, 52.3003] },
        terminal: "Schengen", zone: "B Pier mid (airside)",
        rating: 4.4, status: "Open", operatingHours: "24/24",
        amenities: ["Sensory-Friendly", "Low Noise", "Dimmed Lighting"]
      },
      {
        name: "Assistance Point — C Pier (Schengen)", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7618, 52.2995] },
        terminal: "Schengen", zone: "C Pier mid (airside)",
        rating: 4.3, status: "Open", operatingHours: "05:00–22:00",
        amenities: ["Wheelchair Assistance", "Boarding Support", "Electric Cart Pickup"]
      },
      {
        name: "Prayer Room — D Pier (Schengen)", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7700, 52.2988] },
        terminal: "Schengen", zone: "D Pier mid (airside)",
        rating: 4.3, status: "Open", operatingHours: "24/24",
        amenities: ["Multi-Faith", "Ablution Facilities", "Prayer Mats"]
      },
      {
        name: "Quiet Room — D Pier (Schengen)", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7702, 52.2985] },
        terminal: "Schengen", zone: "D Pier mid (airside)",
        rating: 4.4, status: "Open", operatingHours: "24/24",
        amenities: ["Sensory-Friendly", "Low Noise", "Dimmed Lighting"]
      },
      {
        name: "Prayer Room — E Pier (Non-Schengen)", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7775, 52.2976] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.3, status: "Open", operatingHours: "24/24",
        amenities: ["Multi-Faith", "Ablution Facilities", "Prayer Mats"]
      },

      // ══════════════════════════════════════════════════════════════════════
      // SHOPS (~50) — across all piers and plaza
      // ══════════════════════════════════════════════════════════════════════

      // — Schiphol Plaza [4.7638, 52.3071] —
      {
        name: "Rituals — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7638, 52.3069] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.6, status: "Open", operatingHours: "06:00–22:00",
        images: [IMG.rituals, IMG.rituals2],
        description: "Dutch luxury body & home care brand with exclusive airport travel sets and gift packaging."
      },
      {
        name: "De Bijenkorf Boutique — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7636, 52.3071] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.5, status: "Open", operatingHours: "06:00–22:00",
        images: [IMG.bijenkorf, IMG.bijenkorf2],
        description: "Curated luxury Dutch fashion, accessories, designer handbags, and gifts."
      },
      {
        name: "Lacoste — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7640, 52.3070] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.3, status: "Open", operatingHours: "06:30–21:30",
        images: [IMG.lacoste, IMG.lacoste2],
        description: "Classic Lacoste sportswear, polo shirts, accessories, and travel bags."
      },
      {
        name: "Hugo Boss — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7638, 52.3073] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.4, status: "Open", operatingHours: "06:30–21:30",
        images: [IMG.hugo_boss, IMG.hugo_boss2],
        description: "Men's and women's premium fashion, suits, and accessories."
      },
      {
        name: "Michael Kors — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7636, 52.3069] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.4, status: "Open", operatingHours: "06:30–21:30",
        images: [IMG.michael_kors, IMG.michael_kors2],
        description: "Handbags, watches, footwear, and ready-to-wear collections."
      },
      {
        name: "Pandora — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7640, 52.3072] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.2, status: "Open", operatingHours: "06:30–21:30",
        images: [IMG.pandora, IMG.pandora2],
        description: "Personalised charm bracelets, rings, and jewellery sets."
      },
      {
        name: "Apple Authorised Reseller — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7636, 52.3073] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.5, status: "Open", operatingHours: "06:30–22:00",
        images: [IMG.apple, IMG.apple2],
        description: "iPhones, iPads, MacBooks, AirPods, and Apple accessories."
      },
      {
        name: "Lego Store — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7638, 52.3067] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.7, status: "Open", operatingHours: "06:30–21:30",
        images: [IMG.lego, IMG.lego2],
        description: "Full Lego range including airport exclusives. Popular with families."
      },
      {
        name: "Mango — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7640, 52.3068] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.2, status: "Open", operatingHours: "06:30–21:30",
        images: [IMG.mango, IMG.mango2],
        description: "Contemporary women's fashion and accessories."
      },
      {
        name: "Holland & Barrett — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7634, 52.3071] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.1, status: "Open", operatingHours: "07:00–21:00",
        images: [IMG.holland_barrett, IMG.holland_barrett2],
        description: "Vitamins, supplements, healthy snacks, and organic products."
      },
      {
        name: "Amsterdam House — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7642, 52.3070] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.4, status: "Open", operatingHours: "06:00–22:00",
        images: [IMG.amsterdam_house, IMG.amsterdam_house2],
        description: "Authentic Dutch souvenirs: Delft Blue pottery, tulip bulbs, stroopwafels, Gouda cheese, and clogs."
      },

      // — Departure Hall 1 —
      {
        name: "WHSmith — Departure Hall 1", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7585, 52.3101] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 3.9, status: "Open", operatingHours: "05:00–22:30",
        images: [IMG.whsmith, IMG.whsmith2],
        description: "Books, magazines, newspapers, snacks, and travel accessories."
      },
      {
        name: "Airport Pharmacy — Departure Hall 1", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7583, 52.3102] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 4.3, status: "Open", operatingHours: "06:00–22:00",
        images: [IMG.pharmacy, IMG.wellness],
        description: "Over-the-counter medicines, travel health products, sunscreens, and baby care."
      },
      {
        name: "Travel Accessories — Departure Hall 1", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7587, 52.3100] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 3.8, status: "Open", operatingHours: "05:30–22:00",
        images: [IMG.dufry, IMG.dufry2],
        description: "Luggage locks, neck pillows, adapters, headphones, and travel essentials."
      },

      // — Departure Hall 2 —
      {
        name: "WHSmith — Departure Hall 2", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7648, 52.3107] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 3.9, status: "Open", operatingHours: "05:00–22:30",
        images: [IMG.whsmith, IMG.whsmith2],
        description: "Books, magazines, newspapers, snacks, and travel accessories."
      },
      {
        name: "Nespresso — Departure Hall 2", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7650, 52.3106] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.5, status: "Open", operatingHours: "05:30–22:00",
        images: [IMG.nespresso, IMG.nespresso2],
        description: "Coffee capsules, machines, and accessories. Try a complimentary espresso."
      },
      {
        name: "Swarovski — Departure Hall 2", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7646, 52.3106] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.4, status: "Open", operatingHours: "06:00–21:30",
        images: [IMG.swarovski, IMG.swarovski2],
        description: "Crystal jewellery, figurines, and accessories."
      },

      // — Departure Hall 3 —
      {
        name: "WHSmith — Departure Hall 3", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7712, 52.3112] },
        terminal: "Departure Hall 3", zone: "Departures Level 2",
        rating: 3.8, status: "Open", operatingHours: "05:00–22:00",
        images: [IMG.whsmith, IMG.whsmith2],
        description: "Books, magazines, newspapers, and travel accessories."
      },
      {
        name: "Airport Pharmacy — Departure Hall 3", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7714, 52.3113] },
        terminal: "Departure Hall 3", zone: "Departures Level 2",
        rating: 4.2, status: "Open", operatingHours: "06:00–22:00",
        images: [IMG.pharmacy, IMG.wellness],
        description: "Travel medicines, supplements, and health products."
      },

      // — B Pier mid [4.7535, 52.3001] —
      {
        name: "Newsagent & Snacks — B Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7535, 52.2999] },
        terminal: "Schengen", zone: "B Pier mid (airside)",
        rating: 3.8, status: "Open", operatingHours: "05:00–22:00",
        images: [IMG.whsmith2, IMG.books],
        description: "Magazines, paperbacks, snacks, bottled water, and confectionery."
      },
      {
        name: "Dutch Souvenirs — B Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7537, 52.3001] },
        terminal: "Schengen", zone: "B Pier mid (airside)",
        rating: 4.0, status: "Open", operatingHours: "05:30–21:30",
        images: [IMG.amsterdam_house, IMG.chocolate],
        description: "Dutch gifts: stroopwafels, Dutch chocolate, Delftware, and tulip seeds."
      },

      // — C Pier mid [4.7618, 52.2993] —
      {
        name: "Grab & Go Shop — C Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7618, 52.2991] },
        terminal: "Schengen", zone: "C Pier mid (airside)",
        rating: 3.9, status: "Open", operatingHours: "05:00–22:00",
        images: [IMG.food_grab, IMG.healthy],
        description: "Pre-packed sandwiches, salads, juices, snacks, and travel essentials."
      },
      {
        name: "WHSmith — C Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7620, 52.2993] },
        terminal: "Schengen", zone: "C Pier mid (airside)",
        rating: 3.8, status: "Open", operatingHours: "05:00–22:00",
        images: [IMG.whsmith, IMG.books],
        description: "Books, magazines, and travel accessories."
      },
      {
        name: "Chocolates & Sweets — C Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7616, 52.2993] },
        terminal: "Schengen", zone: "C Pier mid (airside)",
        rating: 4.2, status: "Open", operatingHours: "05:30–21:30",
        images: [IMG.chocolate, IMG.souvenirs],
        description: "Belgian chocolates, Dutch stroopwafels, and premium confectionery for gifts."
      },

      // — D Pier mid [4.7700, 52.2986] —
      {
        name: "Duty Free by Heinemann — D Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7700, 52.2984] },
        terminal: "Schengen", zone: "D Pier mid (airside)",
        rating: 4.3, status: "Open", operatingHours: "05:00–22:30",
        images: [IMG.heinemann, IMG.heinemann2],
        description: "Perfume, cosmetics, spirits, tobacco, and Dutch treats."
      },
      {
        name: "Perfume & Cosmetics — D Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7702, 52.2986] },
        terminal: "Schengen", zone: "D Pier mid (airside)",
        rating: 4.2, status: "Open", operatingHours: "05:00–22:00",
        images: [IMG.perfume, IMG.cosmetics],
        description: "Designer fragrances, skincare, and makeup at duty-free prices."
      },
      {
        name: "Dutch Treats Shop — D Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7698, 52.2986] },
        terminal: "Schengen", zone: "D Pier mid (airside)",
        rating: 4.1, status: "Open", operatingHours: "05:30–22:00",
        images: [IMG.chocolate, IMG.amsterdam_house],
        description: "Stroopwafels, Dutch cheese, Gouda biscuits, and Delft Blue mementos."
      },

      // — E Pier mid [4.7775, 52.2974] —
      {
        name: "Duty Free by Heinemann — E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7775, 52.2972] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.3, status: "Open", operatingHours: "05:00–22:30",
        images: [IMG.heinemann, IMG.heinemann2],
        description: "Largest duty-free at Schiphol. Perfume, cosmetics, spirits, tobacco, and fashion."
      },
      {
        name: "Rituals — E Pier (airside)", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7777, 52.2974] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.5, status: "Open", operatingHours: "05:30–22:30",
        images: [IMG.rituals, IMG.rituals2],
        description: "Airside Rituals with travel-exclusive sets. Great for last-minute gifts."
      },
      {
        name: "Chanel Beauty — E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7773, 52.2975] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.8, status: "Open", operatingHours: "05:30–22:00",
        images: [IMG.chanel, IMG.chanel2],
        description: "Chanel N°5, Les Exclusifs, makeup, and skincare collections."
      },
      {
        name: "Swarovski — E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7775, 52.2976] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.4, status: "Open", operatingHours: "05:30–22:30",
        images: [IMG.swarovski, IMG.swarovski2],
        description: "Crystal jewellery, figurines, and accessories. Tax-free savings available."
      },
      {
        name: "Bose — E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7777, 52.2972] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.6, status: "Open", operatingHours: "05:30–22:30",
        images: [IMG.bose, IMG.bose2],
        description: "Noise-cancelling headphones, earbuds, and portable speakers. Try before you fly."
      },
      {
        name: "DUFRY Travel Value — E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7773, 52.2973] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.1, status: "Open", operatingHours: "05:00–23:00",
        images: [IMG.dufry, IMG.dufry2],
        description: "Electronics, watches, sunglasses, travel gadgets, and accessories."
      },
      {
        name: "WHSmith — E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7779, 52.2974] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 3.9, status: "Open", operatingHours: "05:00–23:00",
        images: [IMG.whsmith, IMG.whsmith2],
        description: "Books, magazines, travel accessories, and Dutch souvenirs."
      },
      {
        name: "Nespresso — E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7775, 52.2970] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.5, status: "Open", operatingHours: "05:30–22:00",
        images: [IMG.nespresso, IMG.nespresso2],
        description: "Coffee capsules, machines, and accessories. Try a complimentary espresso."
      },

      // — E Pier gate end [4.7798, 52.2951] —
      {
        name: "Mini Market — E Pier Gate End", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7798, 52.2951] },
        terminal: "Non-Schengen", zone: "E Pier gate end (airside)",
        rating: 3.8, status: "Open", operatingHours: "05:00–23:00",
        images: [IMG.food_grab, IMG.souvenirs],
        description: "Snacks, drinks, magazines, and last-minute travel items at gate level."
      },
      {
        name: "Chocolates Kiosk — E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7800, 52.2951] },
        terminal: "Non-Schengen", zone: "E Pier gate end (airside)",
        rating: 4.0, status: "Open", operatingHours: "05:30–22:30",
        images: [IMG.chocolate, IMG.souvenirs],
        description: "Premium Dutch and Belgian chocolates — perfect last-minute gifts."
      },

      // — F Pier mid [4.7848, 52.2958] —
      {
        name: "Duty Free by Heinemann — F Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7848, 52.2956] },
        terminal: "Non-Schengen", zone: "F Pier mid (airside)",
        rating: 4.2, status: "Open", operatingHours: "05:00–23:00",
        images: [IMG.heinemann, IMG.heinemann2],
        description: "Spirits, wines, tobacco, and Dutch treats including Delft Blue souvenirs."
      },
      {
        name: "Hermès — F Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7850, 52.2958] },
        terminal: "Non-Schengen", zone: "F Pier mid (airside)",
        rating: 4.9, status: "Open", operatingHours: "06:00–21:00",
        images: [IMG.hermes, IMG.hermes2],
        description: "Luxury French fashion house. Scarves, leather goods, and fragrances."
      },
      {
        name: "Dior — F Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7846, 52.2958] },
        terminal: "Non-Schengen", zone: "F Pier mid (airside)",
        rating: 4.9, status: "Open", operatingHours: "06:00–21:00",
        images: [IMG.dior, IMG.dior2],
        description: "Christian Dior perfumes, cosmetics, and accessories in an exclusive boutique."
      },
      {
        name: "Luxury Watches — F Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7848, 52.2960] },
        terminal: "Non-Schengen", zone: "F Pier mid (airside)",
        rating: 4.6, status: "Open", operatingHours: "06:00–21:00",
        images: [IMG.watches, IMG.jewelry],
        description: "TAG Heuer, Omega, and Swiss watch brands at duty-free prices."
      },
      {
        name: "Chocolates & Belgian Sweets — F Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7852, 52.2957] },
        terminal: "Non-Schengen", zone: "F Pier mid (airside)",
        rating: 4.3, status: "Open", operatingHours: "05:30–22:00",
        images: [IMG.chocolate, IMG.souvenirs],
        description: "Godiva, Neuhaus, and Dutch chocolate gift boxes for premium gifting."
      },
      {
        name: "Jewellery Boutique — F Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7846, 52.2957] },
        terminal: "Non-Schengen", zone: "F Pier mid (airside)",
        rating: 4.5, status: "Open", operatingHours: "06:00–21:00",
        images: [IMG.jewelry, IMG.watches],
        description: "Fine jewellery and diamond pieces. Tax-free savings for non-EU passengers."
      },

      // — F Pier gate end [4.7869, 52.2934] —
      {
        name: "Mini Market — F Pier Gate End", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7869, 52.2934] },
        terminal: "Non-Schengen", zone: "F Pier gate end (airside)",
        rating: 3.7, status: "Open", operatingHours: "05:00–22:30",
        images: [IMG.food_grab, IMG.books],
        description: "Snacks, drinks, books, and last-minute essentials at gate level."
      },
      {
        name: "Gift Shop — F Pier Gate End", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7871, 52.2934] },
        terminal: "Non-Schengen", zone: "F Pier gate end (airside)",
        rating: 3.9, status: "Open", operatingHours: "05:30–22:00",
        images: [IMG.souvenirs, IMG.amsterdam_house],
        description: "Quick gifts, Dutch mementos, postcards, and travel essentials."
      },

      // — G Pier [4.7914, 52.2921] —
      {
        name: "Newsagent & Snacks — G Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7914, 52.2921] },
        terminal: "Non-Schengen", zone: "G Pier (airside)",
        rating: 3.8, status: "Open", operatingHours: "05:00–22:00",
        images: [IMG.whsmith2, IMG.books],
        description: "Magazines, newspapers, snacks, water, and travel accessories."
      },
      {
        name: "Dutch Souvenir Kiosk — G Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7916, 52.2921] },
        terminal: "Non-Schengen", zone: "G Pier (airside)",
        rating: 4.0, status: "Open", operatingHours: "05:30–21:30",
        images: [IMG.amsterdam_house2, IMG.souvenirs],
        description: "Delft Blue ceramics, tulip seeds, Gouda cheese, and Dutch chocolate."
      },
      {
        name: "Chocolate & Delicacies — G Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7912, 52.2921] },
        terminal: "Non-Schengen", zone: "G Pier (airside)",
        rating: 4.2, status: "Open", operatingHours: "05:30–22:00",
        images: [IMG.chocolate, IMG.souvenirs],
        description: "Artisan chocolates, stroopwafels, and premium Dutch confectionery."
      },

      // — Arrivals Level —
      {
        name: "Drugstore — Arrivals Hall 2", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7643, 52.3091] },
        terminal: "Arrivals Hall 2", zone: "Arrivals Level 1",
        rating: 4.0, status: "Open", operatingHours: "06:00–23:00",
        images: [IMG.pharmacy, IMG.wellness],
        description: "Medicines, toiletries, baby care, and personal hygiene products."
      },
      {
        name: "Newsagent — Arrivals Hall 3", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7710, 52.3095] },
        terminal: "Arrivals Hall 3", zone: "Arrivals Level 1",
        rating: 3.8, status: "Open", operatingHours: "06:00–23:00",
        images: [IMG.whsmith, IMG.books],
        description: "Newspapers, magazines, books, snacks, and SIM cards."
      },

      // ══════════════════════════════════════════════════════════════════════
      // RESTAURANTS & FOOD (~60) — every pier has at least 4 food options
      // ══════════════════════════════════════════════════════════════════════

      // — Departure Hall 1 [4.7585, 52.3102] —
      {
        name: "Starbucks — Departure Hall 1", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7585, 52.3100] },
        terminal: "Departure Hall 1", zone: "Departures Level 2 (before security)",
        rating: 4.0, status: "Open", operatingHours: "04:30–22:30",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        images: [IMG.starbucks, IMG.starbucks2],
        description: "Full Starbucks menu including Frappuccinos and seasonal drinks."
      },
      {
        name: "Burger King — Departure Hall 1", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7583, 52.3101] },
        terminal: "Departure Hall 1", zone: "Departures Level 2 (before security)",
        rating: 3.6, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Burgers", "Fast Food"],
        images: [IMG.burger_king, IMG.burger_king2],
        description: "Classic Burger King menu including the Whopper and plant-based options."
      },
      {
        name: "Dunkin' — Departure Hall 1", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7587, 52.3102] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 3.8, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Coffee", "Donuts", "Bagels"],
        images: [IMG.dunkin, IMG.dunkin2],
        description: "Donuts, bagels, muffins, and freshly brewed coffee."
      },
      {
        name: "Café Amsterdam — Departure Hall 1", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7585, 52.3104] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 4.1, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Dutch", "Bitterballen", "Beer"],
        images: [IMG.amsterdam_cafe, IMG.amsterdam_cafe2],
        description: "Traditional Dutch brown café atmosphere. Bitterballen, jenever, and local craft beer."
      },
      {
        name: "Subway — Departure Hall 1", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7589, 52.3101] },
        terminal: "Departure Hall 1", zone: "Departures Level 2 (before security)",
        rating: 3.6, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Sandwiches", "Fast Food", "Salads"],
        images: [IMG.subway, IMG.subway2],
        description: "Build-your-own sub sandwiches and wraps."
      },

      // — Departure Hall 2 [4.7648, 52.3108] —
      {
        name: "Starbucks — Departure Hall 2", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7648, 52.3106] },
        terminal: "Departure Hall 2", zone: "Departures Level 2 (before security)",
        rating: 4.0, status: "Open", operatingHours: "04:30–22:30",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        images: [IMG.starbucks, IMG.starbucks2],
        description: "Full Starbucks menu. Order ahead via the app."
      },
      {
        name: "Pret a Manger — Departure Hall 2", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7650, 52.3108] },
        terminal: "Departure Hall 2", zone: "Departures Level 2 (before security)",
        rating: 4.1, status: "Open", operatingHours: "05:30–22:00",
        cuisine: ["Sandwiches", "Wraps", "Coffee", "Salads"],
        images: [IMG.pret, IMG.pret2],
        description: "Natural and organic sandwiches, wraps, hot drinks, and freshly prepared salads."
      },
      {
        name: "La Place — Departure Hall 2", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7646, 52.3109] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.2, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Dutch", "International", "Salads", "Hot Dishes"],
        images: [IMG.la_place, IMG.la_place2],
        description: "Fresh self-service restaurant. Dutch soups, stamppot, and fresh salad bars."
      },
      {
        name: "Subway — Departure Hall 2", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7648, 52.3110] },
        terminal: "Departure Hall 2", zone: "Departures Level 2 (before security)",
        rating: 3.6, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Sandwiches", "Fast Food", "Salads"],
        images: [IMG.subway, IMG.subway2],
        description: "Build-your-own sub sandwiches and wraps."
      },
      {
        name: "McDonald's — Departure Hall 2", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7652, 52.3108] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 3.6, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Fast Food", "Burgers", "Breakfast"],
        images: [IMG.mcdonalds, IMG.mcdonalds2],
        description: "Full McDonald's menu including McCafé. Open early for quick breakfasts."
      },

      // — Departure Hall 3 [4.7712, 52.3113] —
      {
        name: "Starbucks — Departure Hall 3", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7712, 52.3111] },
        terminal: "Departure Hall 3", zone: "Departures Level 2 (before security)",
        rating: 4.0, status: "Open", operatingHours: "04:30–22:30",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        images: [IMG.starbucks, IMG.starbucks2],
        description: "Full Starbucks menu in the east departure hall."
      },
      {
        name: "Burger King — Departure Hall 3", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7710, 52.3113] },
        terminal: "Departure Hall 3", zone: "Departures Level 2",
        rating: 3.7, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Burgers", "Fast Food"],
        images: [IMG.burger_king, IMG.burger_king2],
        description: "Classic Burger King menu including the Whopper."
      },
      {
        name: "Café Junction — Departure Hall 3", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7714, 52.3112] },
        terminal: "Departure Hall 3", zone: "Departures Level 2",
        rating: 3.9, status: "Open", operatingHours: "05:30–22:00",
        cuisine: ["Coffee", "Pastries", "Light Meals"],
        images: [IMG.coffee_counter, IMG.grab_fly],
        description: "Café serving coffees, teas, pastries, and light hot snacks."
      },

      // — Schiphol Plaza [4.7638, 52.3071] —
      {
        name: "Hard Rock Cafe — Schiphol Plaza", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7638, 52.3068] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 2",
        rating: 4.1, status: "Open", operatingHours: "07:00–22:00",
        cuisine: ["American", "Burgers", "Cocktails"],
        images: [IMG.hard_rock, IMG.hard_rock2],
        description: "Rock music-themed restaurant and bar. Classic burgers, nachos, and cocktails."
      },
      {
        name: "La Place — Schiphol Plaza", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7636, 52.3072] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 2",
        rating: 4.2, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Dutch", "International", "Salads", "Hot Dishes"],
        images: [IMG.la_place, IMG.la_place2],
        description: "Fresh self-service restaurant. Known for Dutch soups and fresh salad bars."
      },
      {
        name: "Eurest — Schiphol Plaza Canteen", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7640, 52.3067] },
        terminal: "Schiphol Plaza", zone: "Level 0",
        rating: 3.9, status: "Open", operatingHours: "06:00–20:00",
        cuisine: ["Dutch", "International", "Hot Meals", "Soup"],
        images: [IMG.la_place2, IMG.food_grab],
        description: "Cafeteria-style hot meals, Dutch daily specials, salads, and soups."
      },
      {
        name: "Starbucks — Schiphol Plaza", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7642, 52.3071] },
        terminal: "Schiphol Plaza", zone: "Level 1",
        rating: 4.0, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        images: [IMG.starbucks, IMG.starbucks2],
        description: "Full Starbucks menu in Schiphol Plaza — open early and late."
      },

      // — Arrivals Hall 2 [4.7643, 52.3093] —
      {
        name: "McDonald's — Arrivals Hall 2", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7643, 52.3095] },
        terminal: "Arrivals Hall 2", zone: "Arrivals Level 1",
        rating: 3.5, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Fast Food", "Burgers", "Breakfast"],
        images: [IMG.mcdonalds, IMG.mcdonalds2],
        description: "Full McDonald's menu including McCafé. Open early for arrival breakfasts."
      },
      {
        name: "Starbucks — Arrivals Hall 2", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7641, 52.3093] },
        terminal: "Arrivals Hall 2", zone: "Arrivals Level 1",
        rating: 4.0, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        images: [IMG.starbucks, IMG.starbucks2],
        description: "Post-arrival coffee and breakfast for arrivals."
      },
      {
        name: "Café & Bar — Arrivals Hall 2", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7645, 52.3092] },
        terminal: "Arrivals Hall 2", zone: "Arrivals Level 1",
        rating: 3.9, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Coffee", "Snacks", "Beer"],
        images: [IMG.dutch_cafe, IMG.bar_interior],
        description: "Light meals, coffee, and refreshments in the arrivals area."
      },

      // — Arrivals Hall 3 [4.7710, 52.3097] —
      {
        name: "McDonald's — Arrivals Hall 3", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7710, 52.3099] },
        terminal: "Arrivals Hall 3", zone: "Arrivals Level 1",
        rating: 3.5, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Fast Food", "Burgers", "Breakfast"],
        images: [IMG.mcdonalds, IMG.mcdonalds2],
        description: "Full McDonald's menu. Open early for arrival breakfasts."
      },
      {
        name: "Coffee Corner — Arrivals Hall 3", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7708, 52.3097] },
        terminal: "Arrivals Hall 3", zone: "Arrivals Level 1",
        rating: 3.8, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Coffee", "Pastries", "Snacks"],
        images: [IMG.coffee_counter, IMG.starbucks2],
        description: "Quick coffee, pastries, and light bites after landing."
      },

      // — B Pier mid [4.7535, 52.3001] —
      {
        name: "Café B — B Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7535, 52.3003] },
        terminal: "Schengen", zone: "B Pier mid (airside)",
        rating: 3.9, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Coffee", "Sandwiches", "Snacks"],
        images: [IMG.coffee_counter, IMG.grab_fly],
        description: "Coffee, teas, sandwiches, and pastries — the first stop on B Pier."
      },
      {
        name: "The Pub — B Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7533, 52.3001] },
        terminal: "Schengen", zone: "B Pier mid (airside)",
        rating: 4.0, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Beer", "Snacks", "Dutch Bites"],
        images: [IMG.bar_interior, IMG.beer_tap],
        description: "Airport pub with draught beers, bitterballen, and Dutch snacks."
      },
      {
        name: "Grab & Fly — B Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7537, 52.3000] },
        terminal: "Schengen", zone: "B Pier mid (airside)",
        rating: 3.8, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Sandwiches", "Wraps", "Salads", "Snacks"],
        images: [IMG.grab_fly, IMG.grab_fly2],
        description: "Pre-packed sandwiches, salads, juices, and snacks to take to the gate."
      },
      {
        name: "Healthy Bites — B Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7535, 52.2999] },
        terminal: "Schengen", zone: "B Pier mid (airside)",
        rating: 4.1, status: "Open", operatingHours: "05:30–22:00",
        cuisine: ["Salads", "Smoothies", "Wraps", "Healthy"],
        images: [IMG.healthy, IMG.pret2],
        description: "Freshly made salads, smoothie bowls, and wraps for health-conscious travellers."
      },

      // — B Pier gate end [4.7523, 52.2978] —
      {
        name: "Gate Café — B Pier End", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7523, 52.2980] },
        terminal: "Schengen", zone: "B Pier gate end (airside)",
        rating: 3.7, status: "Open", operatingHours: "05:30–21:30",
        cuisine: ["Coffee", "Pastries", "Snacks"],
        images: [IMG.coffee_counter, IMG.donuts],
        description: "Coffee, pastries, and light snacks right at the gate."
      },
      {
        name: "Snack Bar — B Gate End", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7521, 52.2978] },
        terminal: "Schengen", zone: "B Pier gate end (airside)",
        rating: 3.6, status: "Busy", operatingHours: "05:30–21:30",
        cuisine: ["Snacks", "Drinks", "Sandwiches"],
        images: [IMG.food_grab, IMG.sandwich],
        description: "Quick snacks and cold drinks before boarding."
      },

      // — C Pier mid [4.7618, 52.2993] —
      {
        name: "Starbucks — C Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7618, 52.2995] },
        terminal: "Schengen", zone: "C Pier mid (airside)",
        rating: 4.1, status: "Open", operatingHours: "05:00–22:30",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        images: [IMG.starbucks, IMG.starbucks2],
        description: "Airside Starbucks with the full menu including Frappuccinos."
      },
      {
        name: "Grab & Fly — C Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7616, 52.2993] },
        terminal: "Schengen", zone: "C Pier mid (airside)",
        rating: 3.8, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Sandwiches", "Wraps", "Salads", "Snacks"],
        images: [IMG.grab_fly, IMG.grab_fly2],
        description: "Quick-service grab-and-go with fresh sandwiches, salads, and juices."
      },
      {
        name: "Beer House — C Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7620, 52.2992] },
        terminal: "Schengen", zone: "C Pier mid (airside)",
        rating: 4.0, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Beer", "Bar Snacks", "Dutch Bites"],
        images: [IMG.heineken, IMG.beer_tap],
        description: "Craft and draught beers, Dutch bitterballen, and bar snacks."
      },
      {
        name: "Healthy Bites — C Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7618, 52.2991] },
        terminal: "Schengen", zone: "C Pier mid (airside)",
        rating: 4.2, status: "Open", operatingHours: "05:30–22:00",
        cuisine: ["Salads", "Bowls", "Wraps", "Healthy"],
        images: [IMG.healthy, IMG.pret2],
        description: "Nutritious salads, grain bowls, wraps, and fresh-pressed juices."
      },

      // — C Pier gate end [4.7612, 52.2970] —
      {
        name: "Gate Café — C Pier End", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7612, 52.2972] },
        terminal: "Schengen", zone: "C Pier gate end (airside)",
        rating: 3.7, status: "Open", operatingHours: "05:30–21:30",
        cuisine: ["Coffee", "Pastries", "Snacks"],
        images: [IMG.coffee_counter, IMG.dutch_cafe],
        description: "Coffee, pastries, and cold drinks at the C Pier gates."
      },
      {
        name: "Sandwich Bar — C Gate End", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7610, 52.2970] },
        terminal: "Schengen", zone: "C Pier gate end (airside)",
        rating: 3.6, status: "Open", operatingHours: "05:30–21:30",
        cuisine: ["Sandwiches", "Wraps", "Drinks"],
        images: [IMG.sandwich, IMG.food_grab],
        description: "Fresh sandwiches and wraps to take on board."
      },

      // — D Pier mid [4.7700, 52.2986] —
      {
        name: "Sushiya — D Pier (Schengen)", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7700, 52.2988] },
        terminal: "Schengen", zone: "D Pier mid (airside)",
        rating: 4.3, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Japanese", "Sushi", "Asian"],
        images: [IMG.sushiya, IMG.sushiya2],
        description: "Conveyor-belt sushi bar with hot ramen and gyoza."
      },
      {
        name: "Kebapçı Istanbul — D Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7702, 52.2986] },
        terminal: "Schengen", zone: "D Pier mid (airside)",
        rating: 4.2, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Turkish", "Kebab", "Mediterranean"],
        images: [IMG.kebap, IMG.kebap2],
        description: "Authentic doner and shish kebabs, falafel wraps, and Turkish desserts."
      },
      {
        name: "Starbucks — D Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7698, 52.2987] },
        terminal: "Schengen", zone: "D Pier mid (airside)",
        rating: 4.1, status: "Open", operatingHours: "05:00–22:30",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        images: [IMG.starbucks, IMG.starbucks2],
        description: "Full Starbucks menu airside on D Pier."
      },
      {
        name: "Café Schengen — D Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7700, 52.2984] },
        terminal: "Schengen", zone: "D Pier mid (airside)",
        rating: 4.0, status: "Open", operatingHours: "05:30–22:00",
        cuisine: ["Dutch", "Coffee", "Light Meals"],
        images: [IMG.dutch_cafe, IMG.amsterdam_cafe2],
        description: "Dutch café serving coffees, bitterballen, and stamppot soup."
      },

      // — D Pier gate end [4.7708, 52.2963] —
      {
        name: "Gate Bar — D Pier End", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7708, 52.2965] },
        terminal: "Schengen", zone: "D Pier gate end (airside)",
        rating: 3.9, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Beer", "Drinks", "Snacks"],
        images: [IMG.bar_interior, IMG.beer_tap],
        description: "Beer, wine, cocktails, and snacks right before boarding."
      },
      {
        name: "Coffee Corner — D Gate End", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7706, 52.2963] },
        terminal: "Schengen", zone: "D Pier gate end (airside)",
        rating: 3.8, status: "Open", operatingHours: "05:30–22:00",
        cuisine: ["Coffee", "Pastries", "Snacks"],
        images: [IMG.coffee_counter, IMG.donuts],
        description: "Quick coffees, pastries, and snacks at the D gate."
      },

      // — E Pier mid [4.7775, 52.2974] —
      {
        name: "Starbucks — E Pier (airside)", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7775, 52.2976] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.1, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        images: [IMG.starbucks, IMG.starbucks2],
        description: "Airside Starbucks for that last caffeine fix before boarding."
      },
      {
        name: "Heineken — The Airport Brewery", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7777, 52.2973] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.5, status: "Open", operatingHours: "06:00–23:00",
        cuisine: ["Beer", "Snacks", "Dutch Bites"],
        images: [IMG.heineken, IMG.heineken2],
        description: "Iconic Dutch beer brand's own airport bar. Fresh Heineken on tap, guided tastings, and brewery memorabilia."
      },
      {
        name: "Sushiya — E Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7773, 52.2974] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.4, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Japanese", "Sushi", "Asian"],
        images: [IMG.sushiya, IMG.sushiya2],
        description: "Conveyor-belt and à la carte sushi. Fresh rolls and nigiri made in-house."
      },
      {
        name: "Burger King — E Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7775, 52.2972] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 3.7, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Burgers", "Fast Food"],
        images: [IMG.burger_king, IMG.burger_king2],
        description: "Classic Burger King menu including the Whopper and plant-based options."
      },
      {
        name: "Gall & Gall — Wine Bar E Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7779, 52.2975] },
        terminal: "Non-Schengen", zone: "E Pier mid (airside)",
        rating: 4.4, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Wine", "Beer", "Spirits", "Tapas"],
        images: [IMG.gall_gall, IMG.gall_gall2],
        description: "Dutch wine & spirits retailer with an airside tasting bar. Extensive wine list and cheese boards."
      },
      {
        name: "Sky Lounge Restaurant — E Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7777, 52.2976] },
        terminal: "Non-Schengen", zone: "E Pier Level 2 (airside)",
        rating: 4.3, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["International", "Sit-Down", "European"],
        images: [IMG.lounge_dining, IMG.bar_interior],
        description: "Full-service sit-down restaurant with panoramic runway views. European cuisine and wine list."
      },

      // — E Pier gate end [4.7798, 52.2951] —
      {
        name: "Gate Café — E Pier End", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7798, 52.2953] },
        terminal: "Non-Schengen", zone: "E Pier gate end (airside)",
        rating: 3.8, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Coffee", "Pastries", "Snacks"],
        images: [IMG.coffee_counter, IMG.grab_fly],
        description: "Coffee and snacks right at the E Pier gates."
      },
      {
        name: "Snack Bar — E Gate End", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7800, 52.2951] },
        terminal: "Non-Schengen", zone: "E Pier gate end (airside)",
        rating: 3.7, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Snacks", "Drinks", "Sandwiches"],
        images: [IMG.food_grab, IMG.sandwich],
        description: "Quick snacks, cold drinks, and pre-packed sandwiches at the gates."
      },
      {
        name: "Coffee & Bagels — E Gate", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7796, 52.2951] },
        terminal: "Non-Schengen", zone: "E Pier gate end (airside)",
        rating: 3.9, status: "Open", operatingHours: "05:30–22:30",
        cuisine: ["Coffee", "Bagels", "Pastries"],
        images: [IMG.starbucks2, IMG.donuts],
        description: "Bagels, muffins, and freshly brewed coffee before long-haul flights."
      },
      {
        name: "Noodle Bar — C Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7622, 52.2994] },
        terminal: "Schengen", zone: "C Pier mid (airside)",
        rating: 4.1, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Asian", "Noodles", "Ramen"],
        images: [IMG.noodles, IMG.sushiya],
        description: "Hot ramen, udon noodles, and Japanese sides — perfect for a warming pre-flight meal."
      },

      // — F Pier mid [4.7848, 52.2958] —
      {
        name: "Obika Mozzarella Bar — F Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7848, 52.2960] },
        terminal: "Non-Schengen", zone: "F Pier mid (airside)",
        rating: 4.5, status: "Open", operatingHours: "06:00–21:30",
        cuisine: ["Italian", "Mozzarella", "Mediterranean"],
        images: [IMG.obika, IMG.obika2],
        description: "Premium Italian restaurant specialising in buffalo mozzarella and antipasti."
      },
      {
        name: "Heineken Bar — F Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7850, 52.2957] },
        terminal: "Non-Schengen", zone: "F Pier mid (airside)",
        rating: 4.3, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Beer", "Snacks", "Dutch Bites"],
        images: [IMG.heineken, IMG.heineken2],
        description: "Heineken on tap with Dutch bites and bar snacks."
      },
      {
        name: "Starbucks — F Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7846, 52.2958] },
        terminal: "Non-Schengen", zone: "F Pier mid (airside)",
        rating: 4.0, status: "Open", operatingHours: "05:30–22:30",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        images: [IMG.starbucks, IMG.starbucks2],
        description: "Full Starbucks menu airside on F Pier."
      },
      {
        name: "Noodle Bar — F Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7848, 52.2956] },
        terminal: "Non-Schengen", zone: "F Pier mid (airside)",
        rating: 4.2, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Asian", "Noodles", "Ramen", "Thai"],
        images: [IMG.noodles, IMG.sushiya],
        description: "Hot ramen, pad thai, pho, and Asian noodle dishes before long-haul flights."
      },

      // — F Pier gate end [4.7869, 52.2934] —
      {
        name: "Gate Café — F Pier End", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7869, 52.2936] },
        terminal: "Non-Schengen", zone: "F Pier gate end (airside)",
        rating: 3.8, status: "Open", operatingHours: "05:30–22:00",
        cuisine: ["Coffee", "Pastries", "Snacks"],
        images: [IMG.coffee_counter, IMG.donuts],
        description: "Coffee, pastries, and snacks right at the F Pier gates."
      },
      {
        name: "Wine & Tapas Bar — F Gate", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7871, 52.2933] },
        terminal: "Non-Schengen", zone: "F Pier gate end (airside)",
        rating: 4.2, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Wine", "Tapas", "Cheese", "Charcuterie"],
        images: [IMG.gall_gall, IMG.wine_bar],
        description: "Wine, cheese, and tapas — a refined pre-flight experience at the F gates."
      },

      // — G Pier [4.7914, 52.2921] —
      {
        name: "The Grand Café — G Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7914, 52.2923] },
        terminal: "Non-Schengen", zone: "G Pier (airside)",
        rating: 4.3, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["International", "Sit-Down", "European"],
        images: [IMG.lounge_dining, IMG.dutch_cafe],
        description: "Full-service restaurant with European cuisine and runway views. Ideal for long layovers."
      },
      {
        name: "Bar & Grill — G Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7916, 52.2920] },
        terminal: "Non-Schengen", zone: "G Pier (airside)",
        rating: 4.1, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Burgers", "Grill", "Beer", "Cocktails"],
        images: [IMG.hard_rock2, IMG.burger_king],
        description: "Grilled meats, burgers, craft beers, and cocktails."
      },
      {
        name: "Starbucks — G Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7912, 52.2922] },
        terminal: "Non-Schengen", zone: "G Pier (airside)",
        rating: 4.0, status: "Open", operatingHours: "05:00–22:30",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        images: [IMG.starbucks, IMG.starbucks2],
        description: "Full Starbucks menu at the far end of G Pier."
      },
      {
        name: "Asian Fusion — G Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7914, 52.2919] },
        terminal: "Non-Schengen", zone: "G Pier (airside)",
        rating: 4.2, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Asian", "Sushi", "Thai", "Dim Sum"],
        images: [IMG.sushiya, IMG.noodles],
        description: "Pan-Asian menu: sushi, dim sum, pad thai, and Vietnamese noodles."
      },

    ]);

    console.log("⭐ Seeding Sample App Ratings...");
    await Rating.create([
      { user: admin._id, rating: 5, review: "Excellent app! Extremely helpful at Schiphol." },
    ]);

    console.log("❓ Seeding FAQs...");
    await Faq.create([
      {
        question: "How can I track my flight?",
        answer: "Go to the 'Flights' tab and scan your boarding pass barcode or enter your flight number manually. GateBuddy will show live status, gate, and boarding time.",
        order: 1
      },
      {
        question: "Where is the prayer room at Schiphol?",
        answer: "Prayer rooms are located in Departure Hall 2 (before security) and airside on the Non-Schengen E Pier. Both are open 24/7 and include ablution facilities and prayer mats.",
        order: 2
      },
      {
        question: "Is there free Wi-Fi at Amsterdam Schiphol?",
        answer: "Yes, Schiphol offers free unlimited Wi-Fi throughout the airport. Connect to the 'Schiphol' network — no registration required.",
        order: 3
      },
      {
        question: "What should I do if I lose my luggage?",
        answer: "Visit the Lost & Found desk in Schiphol Plaza (Level 1) or contact your airline's baggage service counter in the Arrivals hall. You can also report online via the Schiphol website.",
        order: 4
      },
      {
        question: "How do I get to the KLM Crown Lounge?",
        answer: "The KLM Crown Lounge has two locations: Lounge 25 (Non-Schengen, airside past passport control) and Lounge 52 (Schengen). Access is for Business Class passengers and SkyTeam Elite Plus members.",
        order: 5
      },
      {
        question: "How do I navigate between gates at Schiphol?",
        answer: "Use the GateBuddy indoor navigation feature. Enter your current location and destination gate, and the app will provide step-by-step walking directions including floor changes via lifts or escalators.",
        order: 6
      },
      {
        question: "Where can I exchange currency at Schiphol?",
        answer: "GWK Travelex has four locations: Departure Hall 1, Departure Hall 2, Non-Schengen E Pier (airside), and Arrivals Hall 3. The airside location often has the best rates.",
        order: 7
      },
      {
        question: "Is there a medical centre at Schiphol?",
        answer: "Yes. The Schiphol Medical Centre is in Departure Hall 2 (Level 2) and offers GP consultations, travel vaccinations, a pharmacy, and first aid. Open 07:00–22:00 daily.",
        order: 8
      }
    ]);

    console.log("🏙️ Seeding Destination Airports...");
    await Airport.create([
      {
        code: "AMS",
        name: "Amsterdam Airport Schiphol",
        operationHours: "24/7",
        contactCenter: "+31 20 794 0800",
        wifi: true,
        parkingSpaces: 30000
      },
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
      },
      {
        code: "JFK",
        name: "John F. Kennedy International Airport",
        operationHours: "24/7",
        contactCenter: "+1 718 244 4444",
        wifi: true,
        parkingSpaces: 9000
      },
      {
        code: "IST",
        name: "Istanbul Airport",
        operationHours: "24/7",
        contactCenter: "+90 444 1 442",
        wifi: true,
        parkingSpaces: 12000
      },
      {
        code: "BCN",
        name: "Barcelona–El Prat Airport",
        operationHours: "24/7",
        contactCenter: "+34 902 404 704",
        wifi: true,
        parkingSpaces: 11000
      },
      {
        code: "MAD",
        name: "Adolfo Suárez Madrid–Barajas Airport",
        operationHours: "24/7",
        contactCenter: "+34 902 404 704",
        wifi: true,
        parkingSpaces: 14000
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
