const dotenv = require("dotenv");
dotenv.config({ path: "./variables.env" });


const notificationJob = require("./utils/notificationJob");
const flightSyncJob = require("./utils/flightSyncJob");


const connectDB = require("./config/database");
const app = require("./app");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`GateBuddy Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Startup: Connect to DB first, THEN start background jobs
(async () => {
  try {
    await connectDB();

    // Start Background Jobs only after DB is ready
    notificationJob();
    await flightSyncJob();
  } catch (err) {
    console.error("❌ Startup failed:", err.message);
    server.close(() => process.exit(1));
  }
})();

// Resilience: Unhandled Rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥", err.name, err.message);
  server.close(() => process.exit(1));
});

// Resilience: Uncaught Exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥", err.name, err.message);
  process.exit(1);
});
