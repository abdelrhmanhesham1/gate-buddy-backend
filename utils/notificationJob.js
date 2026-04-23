const cron = require("node-cron");
const FlightTrack = require("../models/flightTrackModel");
const Device = require("../models/deviceModel");
const Notification = require("../models/notificationModel");
const pushService = require("./sendPushNotification");

// Setup the reminder thresholds in minutes (e.g. notify at 120 mins and 60 mins before departure)
const REMINDER_THRESHOLDS = [120, 60];

const checkUpcomingFlights = async () => {
  try {
    console.log("⏰ Running flight notification job...");
    
    // Find active tracks and populate the flight
    const activeTracks = await FlightTrack.find({ isActive: true }).populate("flight");
    const now = new Date();

    for (const track of activeTracks) {
      if (!track.flight || !track.flight.departure || !track.flight.departure.scheduledTime) continue;

      const departureTime = new Date(track.flight.departure.scheduledTime);
      const minutesUntilDeparture = Math.floor((departureTime - now) / 60000);

      // Only care if the flight is actually in the future
      if (minutesUntilDeparture < 0) continue;

      // Instead of fixed thresholds, use track.reminderMinutes (default is 25 if not set)
      const threshold = track.reminderMinutes || 25;
      
      if (minutesUntilDeparture <= threshold && minutesUntilDeparture > threshold - 5) {
        
        // Check if already notified for this threshold
        const alreadyNotified = track.notificationsSent.some(n => n.minutesBefore === threshold);
        if (alreadyNotified) continue;

        console.log(`🔔 Triggering ${threshold}m reminder for flight ${track.flight.flightNumber}`);

        // 1. Get user devices
        const devices = await Device.find({ user: track.user });
        const tokens = devices.map(d => d.fcmToken).filter(Boolean);

        // 2. Send Push Notification via Firebase (if tokens exist)
        if (tokens.length > 0) {
          await pushService.sendFlightReminder(tokens, track.flight, { minutesBefore: threshold });
        }

        // 3. Create In-App Notification Record
        await Notification.create({
          user: track.user,
          title: "Upcoming Flight Reminder",
          message: `Your flight ${track.flight.flightNumber} departs in approximately ${threshold} minutes. Gate: ${track.flight.departure.gate || 'TBA'}.`,
          type: "FLIGHT_UPDATE",
          priority: "high"
        });

        // 4. Mark as sent on the track to prevent duplicate sends
        track.notificationsSent.push({ minutesBefore: threshold, sentAt: new Date() });
        await track.save();
      }
    }
  } catch (error) {
    console.error("❌ Error running flight notification job:", error);
  }
};

const startJob = () => {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", checkUpcomingFlights);
  console.log("📅 Flight Notification Job scheduled (runs every 5 minutes).");
};

module.exports = startJob;
