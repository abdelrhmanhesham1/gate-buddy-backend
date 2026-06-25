// One-time script: clear all stale flight data so the sync job starts fresh
// Usage: node scripts/resetFlights.js

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../variables.env') });

const mongoose = require('mongoose');
const Flight = require('../models/flightModel');
const FlightUpdate = require('../models/flightUpdateModel');
const FlightTrack = require('../models/flightTrackModel');

async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Connected to DB.');

  const flights = await Flight.countDocuments();
  const updates = await FlightUpdate.countDocuments();
  const tracks = await FlightTrack.countDocuments();

  console.log(`Found: ${flights} flights, ${updates} flight updates, ${tracks} tracked flights`);

  await Flight.deleteMany({});
  await FlightUpdate.deleteMany({});
  // Keep FlightTrack records — they reference users; orphaned refs are harmless until a new flight is tracked

  console.log('✅ Flights and FlightUpdates cleared.');
  console.log('ℹ️  FlightTrack records preserved (user tracking preferences).');
  console.log('\nNext: restart the server — the sync job will repopulate from AirLabs (AIRPORT_IATA=CAI).');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
