const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
let isFirebaseInitialized = false;

if (!admin.apps.length) {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        }),
      });
      isFirebaseInitialized = true;
      console.log("🔥 Firebase Admin initialized successfully");
    } catch (err) {
      console.error("❌ Failed to initialize Firebase Admin:", err.message);
    }
  } else {
    console.warn("⚠️ Firebase environment variables missing. Push notifications disabled.");
  }
} else {
  isFirebaseInitialized = true;
}

/**
 * Send notification to one or many device tokens.
 * - tokens: string or array of strings
 * - title/body: strings
 * - data: optional object (string values recommended)
 */
// Export for direct use
// Main notification sending function
const sendToTokens = async (tokens, title, body, data = {}) => {
  if (!isFirebaseInitialized) {
    console.warn("Skipping push - Firebase not initialized");
    return null;
  }
  if (!tokens) return null;

  // Normalize tokens to array
  if (!Array.isArray(tokens)) tokens = [tokens];

  // Filter out falsy tokens
  const validTokens = tokens.filter(Boolean);
  if (validTokens.length === 0) return null;

  const messagePayload = {
    notification: {
      title,
      body,
    },
    data: {
      ...Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [k, String(v)])
      ),
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
  };

  try {
    if (validTokens.length === 1) {
      const msg = { ...messagePayload, token: validTokens[0] };
      const resp = await admin.messaging().send(msg);
      console.log("Push sent (single):", resp);
      return resp;
    } else {
      const multicast = { ...messagePayload, tokens: validTokens };
      const resp = await admin.messaging().sendMulticast(multicast);
      console.log(
        `Push sent (multicast): success=${resp.successCount}, failure=${resp.failureCount}`
      );
      if (resp.failureCount > 0) {
        resp.responses.forEach((r, i) => {
          if (!r.success) {
            console.warn("Token failed:", validTokens[i], r.error);
          }
        });
      }
      return resp;
    }
  } catch (err) {
    console.error("Error sending push notification:", err);
    throw err;
  }
};

/**
 * Application-specific wrappers used by the notification job.
 * They format the message and call sendToTokens.
 */
const sendFlightReminder = async (tokens, flight, extra = {}) => {
  const title = "Flight Reminder";
  const body = `Your flight ${flight.flightNumber} is coming up. Gate ${
    flight.gate || "TBD"
  }.`;
  return sendToTokens(tokens, title, body, {
    flightId: String(flight._id),
    ...extra,
  });
};

const sendGateChange = async (tokens, flight, extra = {}) => {
  const title = "Gate Change";
  const body = `Gate change for ${flight.flightNumber}. New gate: ${
    flight.gate || "TBD"
  }.`;
  return sendToTokens(tokens, title, body, {
    flightId: String(flight._id),
    type: "gate-change",
    ...extra,
  });
};

const sendDelayAlert = async (tokens, flight, extra = {}) => {
  const title = "Flight Delayed";
  const body = `Flight ${flight.flightNumber} has been delayed. Check updated departure time.`;
  return sendToTokens(tokens, title, body, {
    flightId: String(flight._id),
    type: "delay",
    ...extra,
  });
};

module.exports = {
  sendToTokens,
  sendFlightReminder,
  sendGateChange,
  sendDelayAlert,
};
