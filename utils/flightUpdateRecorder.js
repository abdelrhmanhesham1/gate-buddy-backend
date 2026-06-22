const FlightUpdate = require("../models/flightUpdateModel");

/**
 * Records flight updates to the FlightUpdate collection
 * Tracks changes to delays, gate assignments, and times
 * @param {Object} flight - The flight document
 * @param {Object} updates - The update fields to apply
 * @returns {Promise<Array>} Array of recorded updates
 */
const recordFlightUpdates = async (flight, updates) => {
  const changes = [];

  // ── Status change (includes DELAYED detection) ──────────────────────────────────────
  if (updates.status !== undefined && flight.status !== updates.status) {
    changes.push({
      updateType: "STATUS",
      field: "status",
      before: flight.status,
      after: updates.status,
    });
  }

  // ── Departure gate change ──────────────────────────────────────
  if (
    updates["departure.gate"] !== undefined &&
    flight.departure.gate !== updates["departure.gate"]
  ) {
    changes.push({
      updateType: "GATE",
      field: "departure.gate",
      before: flight.departure.gate || "TBA",
      after: updates["departure.gate"],
    });
  }

  // ── Arrival gate change ────────────────────────────────────────
  if (
    updates["arrival.gate"] !== undefined &&
    flight.arrival.gate !== updates["arrival.gate"]
  ) {
    changes.push({
      updateType: "GATE",
      field: "arrival.gate",
      before: flight.arrival.gate || "TBA",
      after: updates["arrival.gate"],
    });
  }

  // ── Departure estimated time (delay detection) ──────────────────
  if (
    updates["departure.estimatedTime"] !== undefined &&
    (!flight.departure.estimatedTime ||
      flight.departure.estimatedTime.getTime() !==
        new Date(updates["departure.estimatedTime"]).getTime())
  ) {
    const timeLabel = "departure.estimatedTime";
    changes.push({
      updateType: "TIME",
      field: timeLabel,
      before: flight.departure.estimatedTime?.toISOString() || "N/A",
      after: new Date(
        updates["departure.estimatedTime"]
      ).toISOString(),
    });
  }

  // ── Arrival estimated time (delay detection) ────────────────────
  if (
    updates["arrival.estimatedTime"] !== undefined &&
    (!flight.arrival.estimatedTime ||
      flight.arrival.estimatedTime.getTime() !==
        new Date(updates["arrival.estimatedTime"]).getTime())
  ) {
    const timeLabel = "arrival.estimatedTime";
    changes.push({
      updateType: "TIME",
      field: timeLabel,
      before: flight.arrival.estimatedTime?.toISOString() || "N/A",
      after: new Date(updates["arrival.estimatedTime"]).toISOString(),
    });
  }

  // ── Departure actual time ──────────────────────────────────────
  if (
    updates["departure.actualTime"] !== undefined &&
    (!flight.departure.actualTime ||
      flight.departure.actualTime.getTime() !==
        new Date(updates["departure.actualTime"]).getTime())
  ) {
    changes.push({
      updateType: "TIME",
      field: "departure.actualTime",
      before: flight.departure.actualTime?.toISOString() || "N/A",
      after: new Date(updates["departure.actualTime"]).toISOString(),
    });
  }

  // ── Arrival actual time ────────────────────────────────────────
  if (
    updates["arrival.actualTime"] !== undefined &&
    (!flight.arrival.actualTime ||
      flight.arrival.actualTime.getTime() !==
        new Date(updates["arrival.actualTime"]).getTime())
  ) {
    changes.push({
      updateType: "TIME",
      field: "arrival.actualTime",
      before: flight.arrival.actualTime?.toISOString() || "N/A",
      after: new Date(updates["arrival.actualTime"]).toISOString(),
    });
  }

  // ── Scheduled departure time change (delay due to earlier schedule change) ────────
  if (
    updates["departure.scheduledTime"] !== undefined &&
    flight.departure.scheduledTime.getTime() !==
      new Date(updates["departure.scheduledTime"]).getTime()
  ) {
    changes.push({
      updateType: "TIME",
      field: "departure.scheduledTime",
      before: flight.departure.scheduledTime.toISOString(),
      after: new Date(
        updates["departure.scheduledTime"]
      ).toISOString(),
    });
  }

  // ── Scheduled arrival time change ────────────────────────────────
  if (
    updates["arrival.scheduledTime"] !== undefined &&
    flight.arrival.scheduledTime.getTime() !==
      new Date(updates["arrival.scheduledTime"]).getTime()
  ) {
    changes.push({
      updateType: "TIME",
      field: "arrival.scheduledTime",
      before: flight.arrival.scheduledTime.toISOString(),
      after: new Date(updates["arrival.scheduledTime"]).toISOString(),
    });
  }

  // If there are changes, save them to FlightUpdate collection
  if (changes.length > 0) {
    await FlightUpdate.insertMany(
      changes.map((c) => ({
        flight: flight._id,
        ...c,
      }))
    );
  }

  return changes;
};

module.exports = recordFlightUpdates;
