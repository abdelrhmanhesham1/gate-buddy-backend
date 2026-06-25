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
    const services = await Service.create([

      // ══════════════════════════════════════════════════════════════════════
      // COUNTERS — Airline Check-in Desks
      // ══════════════════════════════════════════════════════════════════════
      {
        name: "KLM Check-in (Desks 1–99)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7647, 52.3081] },
        terminal: "Departure Hall 2", gate: "D/E Pier", zone: "Departures Level 2",
        rating: 4.2, status: "Open", airline: "KLM",
        airlineLogo: "https://pics.avs.io/200/200/KL.png",
        gates: ["D57", "D59", "E18", "E20"],
        services: ["Check-in", "Baggage Drop", "Special Assistance", "Flying Blue Desk"],
        operatingHours: "04:00–22:00"
      },
      {
        name: "KLM Business Class Check-in (Desks 100–115)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7648, 52.3082] },
        terminal: "Departure Hall 2", gate: "D Pier", zone: "Departures Level 2",
        rating: 4.7, status: "Open", airline: "KLM",
        airlineLogo: "https://pics.avs.io/200/200/KL.png",
        gates: ["D57", "D59"],
        services: ["Business Class Check-in", "Priority Baggage", "Lounge Access Confirmation"],
        operatingHours: "04:00–22:00"
      },
      {
        name: "Emirates Check-in (Desks 25–35)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7651, 52.3079] },
        terminal: "Departure Hall 2", gate: "F Pier", zone: "Departures Level 2",
        rating: 4.7, status: "Open", airline: "Emirates",
        airlineLogo: "https://pics.avs.io/200/200/EK.png",
        gates: ["F1", "F2", "F4", "F6"],
        services: ["First Class Check-in", "Business Class", "Baggage Drop", "Skywards Desk"],
        operatingHours: "05:00–21:00"
      },
      {
        name: "Lufthansa Check-in (Desks 8–14)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7639, 52.3083] },
        terminal: "Departure Hall 2", gate: "D Pier", zone: "Departures Level 2",
        rating: 4.1, status: "Open", airline: "Lufthansa",
        airlineLogo: "https://pics.avs.io/200/200/LH.png",
        gates: ["D7", "D9"],
        services: ["Check-in", "Baggage Drop", "Miles & More Desk"],
        operatingHours: "05:00–20:00"
      },
      {
        name: "Turkish Airlines Check-in (Desks 40–48)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7655, 52.3077] },
        terminal: "Departure Hall 2", gate: "F Pier", zone: "Departures Level 2",
        rating: 4.0, status: "Open", airline: "Turkish Airlines",
        airlineLogo: "https://pics.avs.io/200/200/TK.png",
        gates: ["F8", "F3"],
        services: ["Check-in", "Baggage Drop", "Miles&Smiles Desk"],
        operatingHours: "04:30–21:30"
      },
      {
        name: "easyJet Check-in (Desks 1–8)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7630, 52.3086] },
        terminal: "Departure Hall 2", gate: "C Pier", zone: "Departures Level 2",
        rating: 3.8, status: "Open", airline: "easyJet",
        airlineLogo: "https://pics.avs.io/200/200/U2.png",
        gates: ["C14", "C16"],
        services: ["Check-in", "Bag Drop", "Speedy Boarding Desk"],
        operatingHours: "04:00–20:00"
      },
      {
        name: "Qatar Airways Check-in (Desks 17–22)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7653, 52.3080] },
        terminal: "Departure Hall 2", gate: "F Pier", zone: "Departures Level 2",
        rating: 4.8, status: "Open", airline: "Qatar Airways",
        airlineLogo: "https://pics.avs.io/200/200/QR.png",
        gates: ["F1", "F2"],
        services: ["Business & First Class", "Privilege Club Desk", "Baggage Drop"],
        operatingHours: "05:00–22:00"
      },
      {
        name: "British Airways Check-in (Desks 56–62)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7645, 52.3083] },
        terminal: "Departure Hall 2", gate: "D Pier", zone: "Departures Level 2",
        rating: 4.1, status: "Open", airline: "British Airways",
        airlineLogo: "https://pics.avs.io/200/200/BA.png",
        gates: ["D64", "D62"],
        services: ["Check-in", "Baggage Drop", "Executive Club Desk"],
        operatingHours: "05:00–20:30"
      },
      {
        name: "Transavia Check-in (Desks 70–82)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7636, 52.3087] },
        terminal: "Departure Hall 2", gate: "B Pier", zone: "Departures Level 2",
        rating: 3.9, status: "Open", airline: "Transavia",
        airlineLogo: "https://pics.avs.io/200/200/HV.png",
        gates: ["B28", "B30"],
        services: ["Check-in", "Bag Drop"],
        operatingHours: "04:00–21:00"
      },
      {
        name: "Air France Check-in (Desks 50–56)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7643, 52.3082] },
        terminal: "Departure Hall 2", gate: "E Pier", zone: "Departures Level 2",
        rating: 4.0, status: "Open", airline: "Air France",
        airlineLogo: "https://pics.avs.io/200/200/AF.png",
        gates: ["E20", "E18"],
        services: ["Check-in", "Baggage Drop", "Flying Blue Desk"],
        operatingHours: "05:00–21:00"
      },
      {
        name: "Swiss International Check-in (Desks 15–18)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7641, 52.3083] },
        terminal: "Departure Hall 2", gate: "D Pier", zone: "Departures Level 2",
        rating: 4.3, status: "Open", airline: "Swiss",
        airlineLogo: "https://pics.avs.io/200/200/LX.png",
        gates: ["D11", "D13"],
        services: ["Check-in", "Baggage Drop"],
        operatingHours: "05:30–20:00"
      },
      {
        name: "Vueling Check-in (Desks 83–88)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7637, 52.3086] },
        terminal: "Departure Hall 2", gate: "B/C Pier", zone: "Departures Level 2",
        rating: 3.7, status: "Open", airline: "Vueling",
        airlineLogo: "https://pics.avs.io/200/200/VY.png",
        gates: ["C10", "C12"],
        services: ["Check-in", "Bag Drop"],
        operatingHours: "05:00–20:00"
      },
      {
        name: "Ryanair Check-in (Desks 1–6, Hall 1)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7624, 52.3095] },
        terminal: "Departure Hall 1", gate: "B Pier", zone: "Departures Level 2",
        rating: 3.5, status: "Open", airline: "Ryanair",
        airlineLogo: "https://pics.avs.io/200/200/FR.png",
        gates: ["B1", "B4", "B6"],
        services: ["Check-in", "Priority Bag Drop"],
        operatingHours: "04:30–20:30"
      },
      {
        name: "Singapore Airlines Check-in (Desks 30–36)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7652, 52.3079] },
        terminal: "Departure Hall 2", gate: "F Pier", zone: "Departures Level 2",
        rating: 4.9, status: "Open", airline: "Singapore Airlines",
        airlineLogo: "https://pics.avs.io/200/200/SQ.png",
        gates: ["F5", "F7"],
        services: ["First & Business Class", "KrisFlyer Desk", "Baggage Drop"],
        operatingHours: "06:00–20:00"
      },
      {
        name: "Etihad Airways Check-in (Desks 22–28)", category: "COUNTERS",
        location: { type: "Point", coordinates: [4.7652, 52.3080] },
        terminal: "Departure Hall 2", gate: "F Pier", zone: "Departures Level 2",
        rating: 4.5, status: "Open", airline: "Etihad Airways",
        airlineLogo: "https://pics.avs.io/200/200/EY.png",
        gates: ["F9", "F11"],
        services: ["First & Business Class", "Guest Services", "Baggage Drop"],
        operatingHours: "05:30–21:30"
      },

      // ══════════════════════════════════════════════════════════════════════
      // FINANCIAL
      // ══════════════════════════════════════════════════════════════════════
      {
        name: "GWK Travelex — Departure Hall 1", category: "FINANCIAL", subCategory: "Currency Exchange",
        location: { type: "Point", coordinates: [4.7623, 52.3096] },
        terminal: "Departure Hall 1", zone: "Departures Level 2 (before security)",
        rating: 3.8, status: "Open", operatingHours: "06:00–22:00",
        description: "Currency exchange and travel money. 40+ currencies available."
      },
      {
        name: "GWK Travelex — Departure Hall 2", category: "FINANCIAL", subCategory: "Currency Exchange",
        location: { type: "Point", coordinates: [4.7644, 52.3082] },
        terminal: "Departure Hall 2", zone: "Departures Level 2 (before security)",
        rating: 3.9, status: "Open", operatingHours: "06:00–22:00",
        description: "Currency exchange and travel money. Click & collect available."
      },
      {
        name: "GWK Travelex — Non-Schengen (E Pier)", category: "FINANCIAL", subCategory: "Currency Exchange",
        location: { type: "Point", coordinates: [4.7660, 52.3075] },
        terminal: "Non-Schengen", zone: "E Pier (after passport control)",
        rating: 4.0, status: "Open", operatingHours: "05:00–22:00",
        description: "Airside currency exchange with competitive rates."
      },
      {
        name: "GWK Travelex — Arrivals Hall 3", category: "FINANCIAL", subCategory: "Currency Exchange",
        location: { type: "Point", coordinates: [4.7635, 52.3090] },
        terminal: "Arrivals Hall 3", zone: "Arrivals Level 1",
        rating: 3.7, status: "Open", operatingHours: "06:00–23:00",
        description: "First currency exchange after landing. Euro and major currencies."
      },
      {
        name: "ABN AMRO ATM — Arrivals Hall 3", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7634, 52.3090] },
        terminal: "Arrivals Hall 3", zone: "Arrivals Level 1",
        rating: 4.2, status: "Open", operatingHours: "24/24"
      },
      {
        name: "ABN AMRO ATM — Departure Hall 1", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7625, 52.3093] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 4.1, status: "Open", operatingHours: "24/24"
      },
      {
        name: "ABN AMRO ATM — Departure Hall 2", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7646, 52.3081] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.1, status: "Open", operatingHours: "24/24"
      },
      {
        name: "ING Bank ATM — Non-Schengen E Pier", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7658, 52.3078] },
        terminal: "Non-Schengen", zone: "E Pier (after security)",
        rating: 4.0, status: "Open", operatingHours: "24/24"
      },
      {
        name: "Rabobank ATM — Schiphol Plaza", category: "FINANCIAL", subCategory: "ATMs",
        location: { type: "Point", coordinates: [4.7629, 52.3094] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.0, status: "Open", operatingHours: "24/24"
      },
      {
        name: "ABN AMRO Travel Insurance Desk", category: "FINANCIAL", subCategory: "Insurance",
        location: { type: "Point", coordinates: [4.7644, 52.3083] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.0, status: "Open", operatingHours: "07:00–21:00",
        description: "Last-minute travel and baggage insurance."
      },

      // ══════════════════════════════════════════════════════════════════════
      // VIP SERVICES — Lounges
      // ══════════════════════════════════════════════════════════════════════
      {
        name: "KLM Crown Lounge 25 (Non-Schengen)", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7662, 52.3074] },
        terminal: "Non-Schengen", gate: "D Pier", zone: "Lounge 25 (airside)",
        rating: 4.6, status: "Open", operatingHours: "05:00–23:00",
        amenities: ["Free Wi-Fi", "Hot Meals", "Full Bar", "Showers", "Business Centre", "SkyTeam Access", "Panoramic Views"]
      },
      {
        name: "KLM Crown Lounge 52 (Schengen)", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7641, 52.3084] },
        terminal: "Schengen", gate: "C/D Pier", zone: "Lounge 52 (airside)",
        rating: 4.5, status: "Open", operatingHours: "05:00–22:00",
        amenities: ["Free Wi-Fi", "Snacks", "Bar", "Business Centre", "SkyTeam Access"]
      },
      {
        name: "The Lounge Amsterdam — Non-Schengen", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7665, 52.3073] },
        terminal: "Non-Schengen", gate: "F/G Pier", zone: "F Pier (airside)",
        rating: 4.4, status: "Open", operatingHours: "05:00–23:00",
        amenities: ["Free Wi-Fi", "Hot & Cold Buffet", "Premium Bar", "Showers", "Quiet Zone", "Open Access (fee)"]
      },
      {
        name: "Aspire Lounge — Schengen B Pier", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7635, 52.3088] },
        terminal: "Schengen", gate: "B Pier", zone: "B Pier (airside)",
        rating: 4.2, status: "Open", operatingHours: "05:00–21:00",
        amenities: ["Free Wi-Fi", "Hot Food", "Bar", "Priority Pass & DragonPass Access"]
      },
      {
        name: "Singapore Airlines SilverKris Lounge", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7664, 52.3073] },
        terminal: "Non-Schengen", gate: "F Pier", zone: "F Pier Level 2 (airside)",
        rating: 4.8, status: "Open", operatingHours: "06:00–20:00",
        amenities: ["Free Wi-Fi", "À la Carte Dining", "Premium Bar", "Showers", "Business Suites", "SIA Business Class Access"]
      },
      {
        name: "Emirates Business Class Lounge", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7663, 52.3074] },
        terminal: "Non-Schengen", gate: "F Pier", zone: "F Pier (airside)",
        rating: 4.7, status: "Open", operatingHours: "05:00–21:00",
        amenities: ["Free Wi-Fi", "Gourmet Buffet", "Cocktail Bar", "Showers", "Emirates Business/First Access"]
      },
      {
        name: "No1 Lounge — Schengen D Pier", category: "VIP_SERVICES",
        location: { type: "Point", coordinates: [4.7649, 52.3080] },
        terminal: "Schengen", gate: "D Pier", zone: "D Pier (airside)",
        rating: 4.3, status: "Open", operatingHours: "05:30–21:30",
        amenities: ["Free Wi-Fi", "Buffet", "Bar", "Newspapers", "Open Access"]
      },

      // ══════════════════════════════════════════════════════════════════════
      // ACCESSIBILITY
      // ══════════════════════════════════════════════════════════════════════
      {
        name: "Schiphol Assistance Desk — Departure Hall 1", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7622, 52.3096] },
        terminal: "Departure Hall 1", zone: "Departures Level 2 (before security)",
        rating: 4.7, status: "Open", operatingHours: "04:00–23:00",
        amenities: ["Wheelchair Assistance", "Electric Cart", "Priority Security", "Boarding Support"]
      },
      {
        name: "Schiphol Assistance Desk — Departure Hall 2", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7645, 52.3081] },
        terminal: "Departure Hall 2", zone: "Departures Level 2 (before security)",
        rating: 4.7, status: "Open", operatingHours: "04:00–23:00",
        amenities: ["Wheelchair Assistance", "Electric Cart", "Priority Security", "Boarding Support"]
      },
      {
        name: "Schiphol Assistance Desk — Arrivals Hall 3", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7633, 52.3091] },
        terminal: "Arrivals Hall 3", zone: "Arrivals Level 1",
        rating: 4.6, status: "Open", operatingHours: "04:00–23:00",
        amenities: ["Wheelchair Assistance", "Meet & Greet", "Baggage Assistance"]
      },
      {
        name: "Schiphol Assistance Desk — Arrivals Hall 4", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7636, 52.3089] },
        terminal: "Arrivals Hall 4", zone: "Arrivals Level 1",
        rating: 4.5, status: "Open", operatingHours: "04:00–23:00",
        amenities: ["Wheelchair Assistance", "Meet & Greet", "Escort Service"]
      },
      {
        name: "Quiet Room — E Pier (Non-Schengen)", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7658, 52.3077] },
        terminal: "Non-Schengen", zone: "E Pier (airside)",
        rating: 4.5, status: "Open", operatingHours: "24/24",
        amenities: ["Sensory-Friendly", "Low Noise", "Dimmed Lighting", "Comfortable Seating"]
      },
      {
        name: "Quiet Room — D Pier (Schengen)", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7648, 52.3081] },
        terminal: "Schengen", zone: "D Pier (airside)",
        rating: 4.4, status: "Open", operatingHours: "24/24",
        amenities: ["Sensory-Friendly", "Low Noise", "Dimmed Lighting"]
      },
      {
        name: "Prayer Room — Departure Hall 2", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7643, 52.3083] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.4, status: "Open", operatingHours: "24/24",
        amenities: ["Multi-Faith", "Ablution Facilities", "Prayer Mats", "Direction Indicator"]
      },
      {
        name: "Prayer Room — Non-Schengen E Pier", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7657, 52.3077] },
        terminal: "Non-Schengen", zone: "E Pier (airside)",
        rating: 4.3, status: "Open", operatingHours: "24/24",
        amenities: ["Multi-Faith", "Ablution Facilities", "Prayer Mats"]
      },
      {
        name: "Baby Care Room — Departure Hall 2", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7646, 52.3082] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.6, status: "Open", operatingHours: "24/24",
        amenities: ["Changing Tables", "Nursing Area", "Bottle Warming", "Privacy Screens"]
      },
      {
        name: "Baby Care Room — Arrivals Hall 3", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7634, 52.3091] },
        terminal: "Arrivals Hall 3", zone: "Arrivals Level 1",
        rating: 4.5, status: "Open", operatingHours: "24/24",
        amenities: ["Changing Tables", "Nursing Area"]
      },
      {
        name: "Schiphol Medical Centre", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7640, 52.3085] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 4.8, status: "Open", operatingHours: "07:00–22:00",
        amenities: ["First Aid", "GP Consultation", "Travel Vaccinations", "Pharmacy", "AED Defibrillators"]
      },
      {
        name: "Lost & Found — Schiphol Plaza", category: "ACCESSIBILITY",
        location: { type: "Point", coordinates: [4.7631, 52.3093] },
        terminal: "Schiphol Plaza", zone: "Level 1",
        rating: 4.1, status: "Open", operatingHours: "07:00–22:00",
        amenities: ["Lost Property Registration", "Online Tracking", "Baggage Claim Support"]
      },

      // ══════════════════════════════════════════════════════════════════════
      // SHOPS
      // ══════════════════════════════════════════════════════════════════════
      {
        name: "Duty Free by Heinemann — E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7650, 52.3077] },
        terminal: "Non-Schengen", zone: "E Pier (airside)",
        rating: 4.3, status: "Open", operatingHours: "05:00–22:30",
        description: "Largest duty-free at Schiphol. Perfume, cosmetics, spirits, tobacco, confectionery, and fashion."
      },
      {
        name: "Duty Free by Heinemann — F/G Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7664, 52.3072] },
        terminal: "Non-Schengen", zone: "G Pier (airside)",
        rating: 4.2, status: "Open", operatingHours: "05:00–23:00",
        description: "Spirits, wines, tobacco, and Dutch treats including Delft Blue souvenirs."
      },
      {
        name: "Rituals — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7628, 52.3094] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.6, status: "Open", operatingHours: "06:00–22:00",
        description: "Dutch luxury body & home care brand with exclusive airport travel sets and gift packaging."
      },
      {
        name: "Rituals — E Pier (airside)", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7659, 52.3076] },
        terminal: "Non-Schengen", zone: "E Pier (airside)",
        rating: 4.5, status: "Open", operatingHours: "05:30–22:30",
        description: "Airside Rituals with travel-exclusive sets. Great for last-minute gifts."
      },
      {
        name: "De Bijenkorf Boutique — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7632, 52.3092] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.5, status: "Open", operatingHours: "06:00–22:00",
        description: "Curated luxury Dutch fashion, accessories, designer handbags, and gifts."
      },
      {
        name: "DUFRY Travel Value — E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7656, 52.3076] },
        terminal: "Non-Schengen", gate: "E Pier", zone: "E Pier (airside)",
        rating: 4.1, status: "Open", operatingHours: "05:00–23:00",
        description: "Electronics, watches, sunglasses, travel gadgets, and accessories."
      },
      {
        name: "Lacoste — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7630, 52.3093] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.3, status: "Open", operatingHours: "06:30–21:30",
        description: "Classic Lacoste sportswear, polo shirts, accessories, and travel bags."
      },
      {
        name: "Hugo Boss — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7631, 52.3092] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.4, status: "Open", operatingHours: "06:30–21:30",
        description: "Men's and women's premium fashion, suits, and accessories."
      },
      {
        name: "Michael Kors — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7629, 52.3093] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.4, status: "Open", operatingHours: "06:30–21:30",
        description: "Handbags, watches, footwear, and ready-to-wear collections."
      },
      {
        name: "Swarovski — Non-Schengen E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7655, 52.3077] },
        terminal: "Non-Schengen", zone: "E Pier (airside)",
        rating: 4.4, status: "Open", operatingHours: "05:30–22:30",
        description: "Crystal jewellery, figurines, and accessories. Tax-free savings available."
      },
      {
        name: "Hermès — Non-Schengen F Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7662, 52.3074] },
        terminal: "Non-Schengen", zone: "F Pier (airside)",
        rating: 4.9, status: "Open", operatingHours: "06:00–21:00",
        description: "Luxury French fashion house. Scarves, leather goods, and fragrances."
      },
      {
        name: "Dior — Non-Schengen F Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7661, 52.3074] },
        terminal: "Non-Schengen", zone: "F Pier (airside)",
        rating: 4.9, status: "Open", operatingHours: "06:00–21:00",
        description: "Christian Dior perfumes, cosmetics, and accessories in an exclusive boutique."
      },
      {
        name: "Chanel Beauty — Non-Schengen E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7657, 52.3076] },
        terminal: "Non-Schengen", zone: "E Pier (airside)",
        rating: 4.8, status: "Open", operatingHours: "05:30–22:00",
        description: "Chanel N°5, Les Exclusifs, makeup, and skincare collections."
      },
      {
        name: "Pandora — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7628, 52.3095] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.2, status: "Open", operatingHours: "06:30–21:30",
        description: "Personalised charm bracelets, rings, and jewellery sets."
      },
      {
        name: "Apple Authorised Reseller — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7633, 52.3092] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.5, status: "Open", operatingHours: "06:30–22:00",
        description: "iPhones, iPads, MacBooks, AirPods, and Apple accessories."
      },
      {
        name: "Bose — Non-Schengen E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7656, 52.3077] },
        terminal: "Non-Schengen", zone: "E Pier (airside)",
        rating: 4.6, status: "Open", operatingHours: "05:30–22:30",
        description: "Noise-cancelling headphones, earbuds, and portable speakers. Try before you fly."
      },
      {
        name: "WHSmith — Departure Hall 2", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7644, 52.3082] },
        terminal: "Departure Hall 2", zone: "Departures Level 2",
        rating: 3.9, status: "Open", operatingHours: "05:00–22:30",
        description: "Books, magazines, newspapers, snacks, and travel accessories."
      },
      {
        name: "WHSmith — Non-Schengen E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7654, 52.3078] },
        terminal: "Non-Schengen", zone: "E Pier (airside)",
        rating: 3.9, status: "Open", operatingHours: "05:00–23:00",
        description: "Books, magazines, travel accessories, and Dutch souvenirs."
      },
      {
        name: "Amsterdam House — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7630, 52.3094] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.4, status: "Open", operatingHours: "06:00–22:00",
        description: "Authentic Dutch souvenirs: Delft Blue pottery, tulip bulbs, stroopwafels, Gouda cheese, and clogs."
      },
      {
        name: "Holland & Barrett — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7629, 52.3095] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.1, status: "Open", operatingHours: "07:00–21:00",
        description: "Vitamins, supplements, healthy snacks, and organic products."
      },
      {
        name: "Nespresso — Non-Schengen E Pier", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7653, 52.3078] },
        terminal: "Non-Schengen", zone: "E Pier (airside)",
        rating: 4.5, status: "Open", operatingHours: "05:30–22:00",
        description: "Coffee capsules, machines, and accessories. Try a complimentary espresso."
      },
      {
        name: "Lego Store — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7631, 52.3093] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.7, status: "Open", operatingHours: "06:30–21:30",
        description: "Full Lego range including airport exclusives. Popular with families."
      },
      {
        name: "Mango — Schiphol Plaza", category: "SHOPS",
        location: { type: "Point", coordinates: [4.7627, 52.3094] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 1",
        rating: 4.2, status: "Open", operatingHours: "06:30–21:30",
        description: "Contemporary women's fashion and accessories."
      },

      // ══════════════════════════════════════════════════════════════════════
      // RESTAURANTS & FOOD
      // ══════════════════════════════════════════════════════════════════════
      {
        name: "Starbucks — Departure Hall 1", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7623, 52.3096] },
        terminal: "Departure Hall 1", zone: "Departures Level 2 (before security)",
        rating: 4.0, status: "Open", operatingHours: "04:30–22:30",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        description: "Full Starbucks menu including Frappuccinos and seasonal drinks."
      },
      {
        name: "Starbucks — Departure Hall 2", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7642, 52.3082] },
        terminal: "Departure Hall 2", zone: "Departures Level 2 (before security)",
        rating: 4.0, status: "Open", operatingHours: "04:30–22:30",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        description: "Full Starbucks menu. Order ahead via the app."
      },
      {
        name: "Starbucks — E Pier (airside)", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7659, 52.3077] },
        terminal: "Non-Schengen", zone: "E Pier (airside)",
        rating: 4.1, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Coffee", "Sandwiches", "Pastries"],
        description: "Airside Starbucks for that last caffeine fix before boarding."
      },
      {
        name: "Burger King — E Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7657, 52.3076] },
        terminal: "Non-Schengen", gate: "E Pier", zone: "E Pier (airside)",
        rating: 3.7, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Burgers", "Fast Food"],
        description: "Classic Burger King menu including the Whopper and plant-based options."
      },
      {
        name: "Burger King — Departure Hall 1", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7623, 52.3095] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 3.6, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Burgers", "Fast Food"],
        description: "Burger King before security for a quick meal."
      },
      {
        name: "La Place — Schiphol Plaza", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7627, 52.3095] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 2",
        rating: 4.2, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Dutch", "International", "Salads", "Hot Dishes"],
        description: "Fresh self-service restaurant. Known for Dutch soups, stamppot, and fresh salad bars."
      },
      {
        name: "Obika Mozzarella Bar — F Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7663, 52.3073] },
        terminal: "Non-Schengen", gate: "F Pier", zone: "F Pier (airside)",
        rating: 4.5, status: "Open", operatingHours: "06:00–21:30",
        cuisine: ["Italian", "Mozzarella", "Mediterranean"],
        description: "Premium Italian restaurant specialising in buffalo mozzarella and antipasti."
      },
      {
        name: "Café Amsterdam — Departure Hall 1", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7624, 52.3094] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 4.1, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Dutch", "Bitterballen", "Beer"],
        description: "Traditional Dutch brown café atmosphere. Bitterballen, jenever, and local craft beer."
      },
      {
        name: "Sushiya — E Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7659, 52.3077] },
        terminal: "Non-Schengen", gate: "E Pier", zone: "E Pier (airside)",
        rating: 4.4, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Japanese", "Sushi", "Asian"],
        description: "Conveyor-belt and à la carte sushi. Fresh rolls and nigiri made in-house."
      },
      {
        name: "Sushiya — D Pier (Schengen)", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7649, 52.3081] },
        terminal: "Schengen", zone: "D Pier (airside)",
        rating: 4.3, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Japanese", "Sushi", "Asian"],
        description: "Conveyor-belt sushi bar with hot ramen and gyoza."
      },
      {
        name: "Gall & Gall — Non-Schengen Wine Bar", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7660, 52.3075] },
        terminal: "Non-Schengen", zone: "E/F Pier (airside)",
        rating: 4.4, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Wine", "Beer", "Spirits", "Tapas"],
        description: "Dutch wine & spirits retailer with an airside tasting bar. Extensive wine list and cheese boards."
      },
      {
        name: "Heineken — The Airport Brewery", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7661, 52.3075] },
        terminal: "Non-Schengen", zone: "E Pier (airside)",
        rating: 4.5, status: "Open", operatingHours: "06:00–23:00",
        cuisine: ["Beer", "Snacks", "Dutch Bites"],
        description: "Iconic Dutch beer brand's own airport bar. Fresh Heineken on tap, guided tastings, and brewery memorabilia."
      },
      {
        name: "Hard Rock Cafe — Schiphol Plaza", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7631, 52.3094] },
        terminal: "Schiphol Plaza", zone: "Shopping Centre Level 2",
        rating: 4.1, status: "Open", operatingHours: "07:00–22:00",
        cuisine: ["American", "Burgers", "Cocktails"],
        description: "Rock music-themed restaurant and bar. Classic burgers, nachos, and cocktails."
      },
      {
        name: "Subway — Departure Hall 2", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7645, 52.3082] },
        terminal: "Departure Hall 2", zone: "Departures Level 2 (before security)",
        rating: 3.6, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Sandwiches", "Fast Food", "Salads"],
        description: "Build-your-own sub sandwiches and wraps."
      },
      {
        name: "Dunkin' — Departure Hall 1", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7622, 52.3096] },
        terminal: "Departure Hall 1", zone: "Departures Level 2",
        rating: 3.8, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Coffee", "Donuts", "Bagels"],
        description: "Donuts, bagels, muffins, and freshly brewed coffee."
      },
      {
        name: "Kebapçı Istanbul — D Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7648, 52.3081] },
        terminal: "Schengen", zone: "D Pier (airside)",
        rating: 4.2, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["Turkish", "Kebab", "Mediterranean"],
        description: "Authentic doner and shish kebabs, falafel wraps, and Turkish desserts."
      },
      {
        name: "Sky Lounge Restaurant — Non-Schengen", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7662, 52.3074] },
        terminal: "Non-Schengen", zone: "E Pier Level 2 (airside)",
        rating: 4.3, status: "Open", operatingHours: "06:00–22:00",
        cuisine: ["International", "Sit-Down", "European"],
        description: "Full-service sit-down restaurant with panoramic runway views. European cuisine and wine list."
      },
      {
        name: "Grab & Fly — C Pier", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7635, 52.3087] },
        terminal: "Schengen", zone: "C Pier (airside)",
        rating: 3.8, status: "Open", operatingHours: "05:00–22:00",
        cuisine: ["Sandwiches", "Wraps", "Salads", "Snacks"],
        description: "Quick-service grab-and-go with fresh sandwiches, salads, sushi rolls, and juices."
      },
      {
        name: "Pret a Manger — Departure Hall 2", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7643, 52.3083] },
        terminal: "Departure Hall 2", zone: "Departures Level 2 (before security)",
        rating: 4.1, status: "Open", operatingHours: "05:30–22:00",
        cuisine: ["Sandwiches", "Wraps", "Coffee", "Salads"],
        description: "Natural and organic sandwiches, wraps, hot drinks, and freshly prepared salads."
      },
      {
        name: "McDonald's — Arrivals Hall 3", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7633, 52.3090] },
        terminal: "Arrivals Hall 3", zone: "Arrivals Level 1",
        rating: 3.5, status: "Open", operatingHours: "05:00–23:00",
        cuisine: ["Fast Food", "Burgers", "Breakfast"],
        description: "Full McDonald's menu including McCafé. Open early for arrival breakfasts."
      },
      {
        name: "Eurest — Staff & Public Canteen", category: "RESTAURANTS",
        location: { type: "Point", coordinates: [4.7637, 52.3088] },
        terminal: "Schiphol Centre", zone: "Level 0",
        rating: 3.9, status: "Open", operatingHours: "06:00–20:00",
        cuisine: ["Dutch", "International", "Hot Meals", "Soup"],
        description: "Cafeteria-style hot meals, Dutch daily specials, salads, and soups."
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
