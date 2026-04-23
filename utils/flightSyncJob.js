const cron = require("node-cron");
const axios = require("axios");
const Flight = require("../models/flightModel");
const FlightUpdate = require("../models/flightUpdateModel");
const NavigationNode = require("../models/NavigationNode");

const API_KEY = process.env.AIRLABS_API_KEY;
const BASE_URL = "https://airlabs.co/api/v9";
const AIRPORT_IATA = process.env.AIRPORT_IATA || "AMS";
const DOMESTIC_AIRPORTS = (process.env.DOMESTIC_AIRPORTS || "").split(",").map(a => a.trim()).filter(Boolean);

// ─── In-memory airline lookup (populated once on startup) ───
let airlineMap = {}; // { "MS": { name: "EgyptAir", logo: "https://..." }, ... }

/**
 * Step 1: Fetch all airlines from AirLabs → build name+logo map
 * Called ONCE on startup, never again.
 */
const loadAirlines = async () => {
  try {
    console.log("✈️  Loading airline database from AirLabs...");
    const { data } = await axios.get(`${BASE_URL}/airlines`, {
      params: { api_key: API_KEY },
    });

    if (!data?.response) {
      console.error("❌ AirLabs airlines endpoint returned no data.");
      return;
    }

    for (const airline of data.response) {
      if (airline.iata_code) {
        airlineMap[airline.iata_code] = {
          name: airline.name || "Unknown Airline",
          logo: `https://pics.avs.io/200/200/${airline.iata_code}.png`,
        };
      }
    }

    console.log(`✅ Loaded ${Object.keys(airlineMap).length} airlines into memory.`);
  } catch (err) {
    console.error("❌ Failed to load airlines:", err.message);
  }
};

/**
 * Map AirLabs flight object → our Flight model status enum.
 * Focuses on delays specifically at our airport (AMS).
 * @param {object} f — raw AirLabs flight object
 * @param {"departure"|"arrival"} direction
 */
const mapStatus = (f, direction) => {
  const s = f.status || "";
  if (s === "cancelled") return "CANCELLED";
  if (s === "landed")    return "LANDED";
  if (s === "active")    return "IN_FLIGHT";
  if (s === "incident" || s === "diverted") return "DELAYED";

  // Focus only on the delay at our airport (AMS)
  const isDelayed = direction === "departure" 
    ? (f.dep_delayed && f.dep_delayed > 0) 
    : (f.arr_delayed && f.arr_delayed > 0);

  if (isDelayed) return "DELAYED";
  return "ON_TIME";
};

/**
 * Helper: Find the nodeId in NavigationNode collection matching a gate name.
 * Uses case-insensitive partial matching (e.g., "F2" matches "Pier F2").
 */
const findGateNodeId = async (gateName) => {
  if (!gateName) return null;
  const node = await NavigationNode.findOne({ name: new RegExp(gateName, "i") });
  return node ? node.nodeId : null;
};

/**
 * Core sync: Fetch flights for a given direction and upsert into DB.
 * @param {"departure"|"arrival"} direction
 */
const syncFlights = async (direction) => {
  const paramKey = direction === "departure" ? "dep_iata" : "arr_iata";
  const label = direction === "departure" ? "departures" : "arrivals";

  try {
    console.log(`🔄 Syncing ${label} for ${AIRPORT_IATA}...`);

    const { data } = await axios.get(`${BASE_URL}/schedules`, {
      params: {
        api_key: API_KEY,
        [paramKey]: AIRPORT_IATA,
      },
    });

    if (!data?.response || !Array.isArray(data.response)) {
      console.warn(`⚠️  No ${label} data returned from AirLabs.`);
      return { synced: 0, updated: 0 };
    }

    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    let synced = 0;
    let updated = 0;
    let cancelled = 0;

    // Track every flight processed in this batch for stale-detection
    const seenFlightKeys = new Set(); // "flightNumber|depScheduledISO"

    for (const f of data.response) {
      // Skip flights without essential data
      if (!f.flight_iata || !f.dep_time || !f.arr_time) continue;

      // Skip flights beyond the 7-day rolling window
      const depScheduledCheck = new Date(f.dep_time);
      if (depScheduledCheck > sevenDaysFromNow) continue;

      const airlineCode = f.airline_iata || "";
      const airlineInfo = airlineMap[airlineCode] || {
        name: airlineCode || "Unknown",
        logo: null,
      };

      // Determine domestic vs international
      // A flight is domestic if both departure and arrival are within the "home" set
      const isDepHome = f.dep_iata === AIRPORT_IATA || DOMESTIC_AIRPORTS.includes(f.dep_iata);
      const isArrHome = f.arr_iata === AIRPORT_IATA || DOMESTIC_AIRPORTS.includes(f.arr_iata);
      const flightType = (isDepHome && isArrHome) ? "domestic" : "international";

      // Build the flight document fields
      const depScheduled = new Date(f.dep_time);
      const arrScheduled = new Date(f.arr_time);
      const depEstimated = f.dep_estimated ? new Date(f.dep_estimated) : undefined;
      const arrEstimated = f.arr_estimated ? new Date(f.arr_estimated) : undefined;
      const depActual = f.dep_actual ? new Date(f.dep_actual) : undefined;
      const arrActual = f.arr_actual ? new Date(f.arr_actual) : undefined;
      const newStatus = mapStatus(f, direction);

      // Register this flight as seen in current batch
      seenFlightKeys.add(`${f.flight_iata}|${depScheduled.toISOString()}`);

      // Check if this flight already exists in DB
      const existing = await Flight.findOne({
        flightNumber: f.flight_iata,
        direction,
        "departure.scheduledTime": depScheduled,
      });

      if (existing) {
        // ─── UPDATE PATH: detect changes and log history ───
        const changes = [];

        // ── Status change ──────────────────────────────────────────────
        if (existing.status !== newStatus) {
          changes.push({ updateType: "STATUS", field: "status", before: existing.status, after: newStatus });
          existing.status = newStatus;
        }

        // ── Departure gate change ──────────────────────────────────────
        const newDepGate = f.dep_gate || null;
        if (newDepGate && existing.departure.gate !== newDepGate) {
          changes.push({ updateType: "GATE", field: "departure.gate", before: existing.departure.gate || "TBA", after: newDepGate });
          existing.departure.gate = newDepGate;
          existing.departure.nodeId = await findGateNodeId(newDepGate);
        }

        // ── Arrival gate change ────────────────────────────────────────
        const newArrGate = f.arr_gate || null;
        if (newArrGate && existing.arrival.gate !== newArrGate) {
          changes.push({ updateType: "GATE", field: "arrival.gate", before: existing.arrival.gate || "TBA", after: newArrGate });
          existing.arrival.gate = newArrGate;
          existing.arrival.nodeId = await findGateNodeId(newArrGate);
        }

        // ── Scheduled departure time shift (= delay) ───────────────────
        if (existing.departure.scheduledTime.getTime() !== depScheduled.getTime()) {
          changes.push({ updateType: "TIME", field: "departure.scheduledTime", before: existing.departure.scheduledTime.toISOString(), after: depScheduled.toISOString() });
          existing.departure.scheduledTime = depScheduled;
        }

        // ── Actual departure time ──────────────────────────────────────
        if (depActual && (!existing.departure.actualTime || existing.departure.actualTime.getTime() !== depActual.getTime())) {
          changes.push({ updateType: "TIME", field: "departure.actualTime", before: existing.departure.actualTime?.toISOString() || "N/A", after: depActual.toISOString() });
          existing.departure.actualTime = depActual;
        }

        // ── Estimated departure time ────────────────────────────────────
        if (depEstimated && (!existing.departure.estimatedTime || existing.departure.estimatedTime.getTime() !== depEstimated.getTime())) {
          changes.push({ updateType: "TIME", field: "departure.estimatedTime", before: existing.departure.estimatedTime?.toISOString() || "N/A", after: depEstimated.toISOString() });
          existing.departure.estimatedTime = depEstimated;
        }

        // ── Actual arrival time ────────────────────────────────────────
        if (arrActual && (!existing.arrival.actualTime || existing.arrival.actualTime.getTime() !== arrActual.getTime())) {
          changes.push({ updateType: "TIME", field: "arrival.actualTime", before: existing.arrival.actualTime?.toISOString() || "N/A", after: arrActual.toISOString() });
          existing.arrival.actualTime = arrActual;
        }

        // ── Estimated arrival time ──────────────────────────────────────
        if (arrEstimated && (!existing.arrival.estimatedTime || existing.arrival.estimatedTime.getTime() !== arrEstimated.getTime())) {
          changes.push({ updateType: "TIME", field: "arrival.estimatedTime", before: existing.arrival.estimatedTime?.toISOString() || "N/A", after: arrEstimated.toISOString() });
          existing.arrival.estimatedTime = arrEstimated;
        }

        // ── Terminal info (fill if newly available) ────────────────────
        if (f.dep_terminal && !existing.departure.terminal) existing.departure.terminal = f.dep_terminal;
        if (f.arr_terminal && !existing.arrival.terminal) existing.arrival.terminal = f.arr_terminal;

        if (changes.length > 0) {
          await existing.save(); // triggers TTL pre-save hook

          // Log each change to FlightUpdate history
          await FlightUpdate.insertMany(
            changes.map((c) => ({
              flight: existing._id,
              ...c,
            }))
          );
          updated++;
        }
      } else {
        // ─── INSERT PATH: new flight ───
        const depNodeId = await findGateNodeId(f.dep_gate);
        const arrNodeId = await findGateNodeId(f.arr_gate);

        await Flight.create({
          flightNumber: f.flight_iata,
          airline: airlineInfo,
          type: flightType,
          direction,
          route: {
            from: f.dep_iata || "",
            fromCode: f.dep_iata || "",
            to: f.arr_iata || "",
            toCode: f.arr_iata || "",
          },
          departure: {
            terminal: f.dep_terminal || null,
            gate: f.dep_gate || null,
            nodeId: depNodeId,
            scheduledTime: depScheduled,
            estimatedTime: depEstimated,
            actualTime: depActual,
          },
          arrival: {
            terminal: f.arr_terminal || null,
            gate: f.arr_gate || null,
            nodeId: arrNodeId,
            scheduledTime: arrScheduled,
            estimatedTime: arrEstimated,
            actualTime: arrActual,
          },
          status: mapStatus(f, direction),
        });
        synced++;
      }
    }

    // ─── STALE FLIGHT CANCELLATION ───────────────────────────────────────
    // AirLabs silently drops cancelled flights from the schedules response.
    // Any upcoming flight in our DB that wasn't in this batch is now stale
    // → auto-cancel it and log the change.
    const now = new Date();
    const staleFlights = await Flight.find({
      direction,
      status: { $nin: ["CANCELLED", "LANDED", "IN_FLIGHT"] },
      "departure.scheduledTime": { $gte: now, $lte: sevenDaysFromNow },
    }).lean();

    for (const stale of staleFlights) {
      const key = `${stale.flightNumber}|${stale.departure.scheduledTime.toISOString()}`;
      if (!seenFlightKeys.has(key)) {
        await Flight.findByIdAndUpdate(stale._id, { status: "CANCELLED" });
        await FlightUpdate.create({
          flight: stale._id,
          updateType: "STATUS",
          field: "status",
          before: stale.status,
          after: "CANCELLED",
        });
        cancelled++;
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    console.log(`✅ ${label}: ${synced} new, ${updated} updated, ${cancelled} auto-cancelled (${data.response.length} total from API)`);
    return { synced, updated, cancelled };
  } catch (err) {
    console.error(`❌ Failed to sync ${label}:`, err.message);
    return { synced: 0, updated: 0, cancelled: 0 };
  }
};

/**
 * Full sync: departures + arrivals
 */
const runFullSync = async () => {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`🛫 FLIGHT SYNC STARTED — ${new Date().toISOString()}`);
  console.log(`${"=".repeat(50)}`);

  const depResult = await syncFlights("departure");
  const arrResult = await syncFlights("arrival");

  console.log(`📊 Sync Complete: DEP(${depResult.synced} new, ${depResult.updated} upd, ${depResult.cancelled} cancelled) | ARR(${arrResult.synced} new, ${arrResult.updated} upd, ${arrResult.cancelled} cancelled)`);
  console.log(`${"=".repeat(50)}\n`);
};

/**
 * Start the sync job:
 * 1. Load airlines once
 * 2. Run initial sync immediately
 * 3. Schedule cron every 2 hours
 */
const startFlightSyncJob = async () => {
  if (!API_KEY) {
    console.warn("⚠️  AIRLABS_API_KEY not set — flight sync disabled.");
    return;
  }

  // Step 1: Load airline database
  await loadAirlines();

  // Step 2: Initial sync on startup
  await runFullSync();

  // Step 3: Schedule every 2 hours
  cron.schedule("0 */2 * * *", runFullSync);
  console.log("📅 Flight Sync Job scheduled (runs every 2 hours).");
};

module.exports = startFlightSyncJob;
