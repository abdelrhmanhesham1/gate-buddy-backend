const dotenv = require("dotenv");
dotenv.config();

const notificationJob = require("./utils/notificationJob");
const flightSyncJob = require("./utils/flightSyncJob");


const connectDB = require("./config/database");
const app = require("./app");

// Connect to Database
connectDB();

// Start Background Jobs
notificationJob();
flightSyncJob();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`GateBuddy Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

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
