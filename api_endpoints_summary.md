# 🚀 GateBuddy API Contract (Frontend Integration Guide)

This document provides the **exact** JSON payloads required by the backend and the **exact** JSON responses. The GateBuddy API follows the **JSend** specification (`{ "status": "success", "data": { ... } }`).

---

## 🌐 Environment & Base URLs

- **Development:** `http://localhost:3001/api/v1`
- **Production (Railway):** `https://gate-buddy-backend-production.up.railway.app/api/v1`

**Authentication:** Most endpoints require a JWT token in the `Authorization: Bearer <token>` header or `jwt` HttpOnly cookie.

---

## 🔐 Authentication & Users (`/users`)

### 1. User Signup
- **Method & Endpoint:** `POST /users/signup`
- **Expected Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!"
}
```
- **Requirements:** Name (2-50 chars), Password (8+ chars, uppercase, lowercase, number).
- **Exact Response:** Returns `token` and `user` object.

### 2. User Login
- **Method & Endpoint:** `POST /users/login`
- **Expected Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```
- **Exact Response:** Returns `token` and `user` object. Sets `jwt` and `refreshToken` cookies.

### 3. Forgot Password (Mobile Flow)
- **Method & Endpoint:** `POST /users/forgotPassword`
- **Required Header:** `x-client-type: mobile`
- **Expected Request Body:**
```json
{
  "email": "john@example.com"
}
```
- **Result:** Sends a 6-digit verification code via email.

### 4. Verify Reset Code
- **Method & Endpoint:** `POST /users/verifyResetCode`
- **Expected Request Body:**
```json
{
  "email": "john@example.com",
  "code": "123456"
}
```
- **Exact Response:** Returns a `resetToken` for the final reset step.

### 5. Reset Password
- **Method & Endpoint:** `PATCH /users/resetPassword`
- **Expected Request Body:**
```json
{
  "resetToken": "...",
  "password": "NewSecurePass123!",
  "passwordConfirm": "NewSecurePass123!"
}
```

---

## ✈️ Flight Management (`/flights`)

### 1. Live Flight Status Updates
- **Method & Endpoint:** `GET /flights/updated`
- **Exact Response:** Returns up to 30 flights with recent status changes (DELAYED, BOARDING, etc.).

### 2. Scan Boarding Pass
- **Method & Endpoint:** `POST /flights/scan`
- **Expected Request Body:**
```json
{
  "barcodeData": "M1AAL123..."
}
```
- **Exact Response:**
```json
{
  "status": "success",
  "data": {
    "flight": { ... },
    "weather": { ... },
    "recommendations": [ ... ],
    "arrivalTime": "2026-04-26T..."
  }
}
```

### 3. Get My Tracked Flight
- **Method & Endpoint:** `GET /flights/my-flight`
- **Auth Required:** Returns current user's active tracked flight with destination details.

### 4. Track Flight Manual
- **Method & Endpoint:** `POST /flights/:id/track`
- **Expected Request Body:**
```json
{
  "reminderMinutes": 30
}
```

---

## 🛍️ Airport Services (`/services`)

### 1. Search Services
- **Method & Endpoint:** `GET /services/search?q=lounge`
- **Expected Request Body:** None (Query param `q` required).

### 2. Nearby Services (Geospatial)
- **Method & Endpoint:** `GET /services/nearby?lng=4.76&lat=52.31&distance=500`

---

## 🗺️ Indoor Navigation (`/navigation`)

### 1. Find Navigation Nodes
- **Method & Endpoint:** `GET /navigation/nodes?level=1`

### 2. Find Path (Routing)
- **Method & Endpoint:** `POST /navigation/find-path`
- **Expected Request Body:**
```json
{
  "fromNodeId": "gate_A1",
  "toNodeId": "duty_free_shop"
}
```

---

## 🤖 AI Assistant (`/chat`)

### 1. Send Query
- **Method & Endpoint:** `POST /chat/query`
- **Expected Request Body:**
```json
{
  "message": "Where can I find vegetarian food?"
}
```

---

## 📊 Stats & Analytics (`/stats`)

### 1. Get Dynamic Global Stats
- **Method & Endpoint:** `GET /stats`
- **Exact Response:**
```json
{
  "status": "success",
  "data": {
    "metrics": {
      "activeUsers": 1250,      // Dynamic: Total active users
      "flightsTracked": 450,    // Dynamic: Flights currently being tracked
      "delays": 12,              // Dynamic: Current delayed flights count
      "airportsCovered": 1,      // Static/Config: Currently Schiphol (AMS)
      "userRating": "4.8/5"      // Dynamic: Calculated average app rating
    }
  }
}
```

---

## 🔔 Notifications (`/notifications`)

### 1. Register Device
- **Method & Endpoint:** `POST /devices/register`
- **Expected Request Body:**
```json
{
  "deviceToken": "APA91bE...",
  "deviceType": "ios" 
}
```

### 2. Mark All as Read
- **Method & Endpoint:** `PATCH /notifications/read-all`

### 3. Mark Single as Read
- **Method & Endpoint:** `PATCH /notifications/:id/read`
