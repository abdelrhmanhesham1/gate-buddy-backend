const express = require("express");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);

const AppError = require("./utils/AppError");
const globalErrorHandler = require("./controllers/errorController");

// Routers
const usersRouter = require("./routes/usersRoutes");
const flightRouter = require("./routes/flightRoutes");
const serviceRouter = require("./routes/serviceRoutes");
const homeRouter = require("./routes/homeRoutes");
const notificationsRouter = require("./routes/notificationRoutes");
const chatRouter = require("./routes/chatRoutes");
const deviceRouter = require("./routes/deviceRoutes");

const faqRouter = require("./routes/faqRoutes");
const statsRouter = require("./routes/statsRoutes");
const navigationRouter = require("./routes/navigation");

const app = express();

const store = new MongoDBStore({
  uri: process.env.DATABASE_URL,
  collection: "sessions",
});

store.on("error", (error) => console.log("SESSION STORE ERROR:", error));

app.enable("trust proxy");

// 1. GLOBAL MIDDLEWARES
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? process.env.ALLOWED_ORIGINS?.split(",") : true,
  credentials: true
}));

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(compression());

const limiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000,
  message: "Too many requests from this IP. Please try again later.",
});
app.use("/api", limiter);

// 2. FAIL-FAST SESSION SECURITY
app.use(session({
  secret: process.env.SESSION_SECRET || 
    (process.env.NODE_ENV === "production" 
      ? (() => { throw new Error("SESSION_SECRET must be set!") })()
      : "dev-session-key"),
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: { 
    secure: process.env.NODE_ENV === "production", 
    httpOnly: true, 
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
  }
}));

// 3. HEALTH & LOGGING
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// 4. ROUTES
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/flights", flightRouter);
app.use("/api/v1/services", serviceRouter);
app.use("/api/v1/home", homeRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/devices", deviceRouter);

app.use("/api/v1/faqs", faqRouter);
app.use("/api/v1/stats", statsRouter);
app.use("/api/v1/navigation", navigationRouter);

app.all("*", (req, res, next) => {

  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
