# ✈️ GateBuddy - Intelligent Airport Companion Ecosystem

**GateBuddy** is a production-ready, distributed backend platform designed to enhance the airport experience for mobile and web app users. It provides a digital travel companion that guides passengers seamlessly from check-in to boarding while delivering real-time updates, personalized recommendations, and AI-powered assistance.

---

## 🎯 Project Overview

GateBuddy is built as a **microservices architecture** with a **Node.js core backend** and a **Python recommendation microservice**. It seamlessly integrates with mobile apps (iOS/Android) and web applications to create an intelligent airport ecosystem.

### 🏗️ Architecture

- **Primary Service**: Node.js + Express + MongoDB (Port 3001)
- **Recommendation Service**: Python Flask (Port 8000)
- **Real-Time Updates**: Flight tracking via scheduled jobs
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Authentication**: JWT + OAuth 2.0 (Google, GitHub, Facebook)
- **Database**: MongoDB with geospatial indexing

---

## ⭐ Key Features & What GateBuddy Provides

### 1. **Intelligent Boarding Pass Scanning** 🎫

- Parses IATA 791 (BCBP) standard barcoded boarding passes
- Extracts flight details: flight number, seat, gate, destination in real-time
- Automatically tracks flights with weather and recommendations
- Supports both manual upload and barcode scanning from mobile cameras

### 2. **Personalized Home Dashboard** 🏠

- Real-time active flight status
- Nearby airport services filtered by location
- Passenger ratings and reviews
- Featured services and dining recommendations
- Live flight updates (delays, gate changes)
- User-tracked flights prioritized display
- Engagement metrics and KPIs

### 3. **Smart Airport Navigation** 🗺️

- Geospatially-indexed services and POIs
- Service categories: VIP Lounges, Counters, Shops, Restaurants, Medical, Accessibility
- Nearby services finder (distance-based search)
- Service availability status and operating hours

### 4. **AI-Powered Airport Assistant** 🤖

- Google Gemini-powered chatbot
- Context-aware responses based on current flight
- Answers questions about airport services, flights, and facilities
- Real-time data grounding to prevent hallucinations

### 5. **Real-Time Flight Tracking** ✈️

- Track multiple flights simultaneously
- Automatic status updates (On-time, Delayed, Cancelled, Boarding)
- Gate change notifications
- Scheduled reminder notifications
- Flight history and past trips

### 6. **Live Destination Intelligence** 🌍

- Wikipedia and Wikimedia scraping for destination insights
- Destination photos via Pexels API
- Local weather at arrival
- Time zone information
- Travel recommendations and attractions
- Cached recommendations for performance

### 7. **Smart Notifications & Alerts** 🔔

- Push notifications via Firebase Cloud Messaging
- Device registration and management
- Notification categories: Flight Updates, Services, Recommendations, System
- Mark as read functionality for notification history
- Real-time alert delivery to mobile and web

### 8. **Enterprise-Grade Security** 🔐

- JWT token-based authentication with refresh tokens
- OAuth 2.0 social login (Google, GitHub, Facebook)
- Password reset with email verification
- Account lockout after failed login attempts
- Token rotation and revocation
- Session management with MongoDB session store
- XSS and Mongo Sanitization protection
- Rate limiting on sensitive endpoints

### 9. **User Preferences & Profile Management** 👤

- Profile customization (name, photo, bio)
- UI preferences (dark mode, language)
- Push notification settings
- Privacy controls
- Account deactivation

### 10. **Analytics & Ratings** 📊

- Service and airport ratings by users
- Global statistics on app usage
- Tracked flights count
- Delayed flights monitoring
- Active user count
- Average rating aggregation

---

## 🛠️ Technology Stack

| Layer                  | Technology         | Purpose                        |
| :--------------------- | :----------------- | :----------------------------- |
| **Backend Framework**  | Express.js         | REST API server                |
| **Runtime**            | Node.js 16+        | JavaScript runtime             |
| **Database**           | MongoDB            | NoSQL document store           |
| **Authentication**     | JWT + OAuth 2.0    | Identity & authorization       |
| **Real-Time**          | Node-Cron          | Scheduled jobs                 |
| **AI/ML**              | Google Gemini API  | Chatbot intelligence           |
| **Recommendations**    | Python Flask       | Microservice for suggestions   |
| **Push Notifications** | Firebase Admin SDK | Mobile push delivery           |
| **Geolocation**        | MongoDB Geospatial | Location-based queries         |
| **Email**              | Nodemailer         | Password reset & transactional |
| **Caching**            | Node-Cache         | In-memory caching              |
| **Security**           | Helmet, XSS-Clean  | HTTP headers & sanitization    |
| **Validation**         | Express-Validator  | Input validation               |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 16.0.0 or higher
- npm 8.0.0 or higher
- MongoDB instance (local or Atlas)
- Python 3.8+ (for recommendation service)
- Firebase Admin credentials (for push notifications)
- Google Gemini API key
- OAuth credentials (Google, GitHub, Facebook)

### Installation & Setup

#### 1. **Clone & Install Core Backend**

```bash
# Navigate to project directory
cd gateBuddy

# Install Node dependencies
npm install

# Create environment file
cp .env.example .env

# Fill in required credentials in .env:
# - DATABASE_URL
# - GEMINI_API_KEY
# - Firebase admin credentials
# - OAuth keys (Google, GitHub, Facebook)
# - JWT secrets
```

#### 2. **Start Core Backend (Node.js)**

```bash
# Development mode with auto-reload
npm run start:dev

# Production mode
npm run start:prod

# Server runs on http://localhost:3001
```

#### 3. **Start Recommendation Service (Python)**

```bash
# Navigate to recommendation service
cd recommendation-service

# Install Python dependencies
pip install -r requirements.txt

# Start Flask server
python app.py

# Service runs on http://localhost:8000
```

#### 4. **Seed Database (Optional)**

```bash
# Populate with sample data
npm run seed
```

#### 5. **Run Tests**

```bash
npm test
```

---

## 📡 API Quick Reference

### Base URL

```
http://localhost:3001/api/v1
```

### Authentication

- **Type**: Bearer Token or HttpOnly Cookie
- **Header**: `Authorization: Bearer <jwt_token>`
- **Cookie**: `jwt=<token>` (automatically set after login)

### Response Format

```json
{
  "status": "success",
  "data": { ... },
  "results": 10
}
```

### Error Format

```json
{
  "status": "fail",
  "message": "Error description"
}
```

---

## 📚 Complete Endpoint Summary

### 🔐 **Authentication** (`/api/v1/users`)

- `POST /signup` - Register new user
- `POST /login` - Login with email/password
- `POST /logout` - Logout and clear session
- `POST /google` - Google OAuth login
- `POST /github` - GitHub OAuth login
- `POST /facebook` - Facebook OAuth login
- `POST /forgotPassword` - Request password reset
- `POST /verifyResetCode` - Verify reset code
- `PATCH /resetPassword` - Reset password
- `POST /refresh` - Refresh access token

### 👤 **User Profile** (`/api/v1/users`)

- `GET /me` - Get current user profile
- `PATCH /updateMe` - Update profile (name, photo)
- `DELETE /deleteMe` - Deactivate account
- `PATCH /updateMyPassword` - Change password

### ✈️ **Flights** (`/api/v1/flights`)

- `GET /updated` - Get flights with status changes
- `GET /:id` - Get single flight details
- `POST /scan` - Scan and parse boarding pass
- `GET /my-flight` - Get active tracked flight
- `POST /:id/track` - Start tracking a flight
- `PATCH /:id/cancel-track` - Stop tracking a flight

### 🗺️ **Services** (`/api/v1/services`)

- `GET /` - Get all airport services
- `GET /search` - Search services by keyword
- `GET /nearby` - Find nearby services by coordinates
- `GET /counters/stats` - Get counter availability stats
- `GET /:id` - Get service details
- `POST /` - Create service (admin)
- `PATCH /:id` - Update service (admin)
- `DELETE /:id` - Delete service (admin)

### 🏠 **Home Dashboard** (`/api/v1/home`)

- `GET /` - Get personalized dashboard data

### 🤖 **Chat Assistant** (`/api/v1/chat`)

- `POST /query` - Send message to AI assistant

### 🔔 **Notifications** (`/api/v1/notifications`)

- `GET /` - Get user notifications
- `PATCH /read-all` - Mark all as read
- `PATCH /:id/read` - Mark single notification as read

### 📱 **Devices** (`/api/v1/devices`)

- `POST /register` - Register device for push notifications
- `POST /unregister` - Unregister device

### 📋 **FAQ** (`/api/v1/faqs`)

- `GET /` - Get all FAQs
- `GET /:id` - Get single FAQ

### 📊 **Stats & Analytics** (`/api/v1/stats`)

- `GET /` - Get global statistics
- `POST /rate` - Submit service/airport rating

---

## 🎯 Mobile & Web App Integration

### For Mobile Apps (iOS/Android)

- **Authentication**: Use OAuth or JWT token-based auth
- **Push Notifications**: Register device via `/devices/register` with FCM token
- **Boarding Pass**: Send barcode scan to `/flights/scan`
- **Flight Tracking**: Track flights and receive push notifications
- **Location Services**: Send coordinates to `/services/nearby` for location-based results
- **Chat**: Use `/chat/query` for AI assistant

### For Web Applications

- **Session Management**: JWT tokens with refresh mechanism
- **Real-Time Updates**: Poll `/flights/updated` for live status
- **Dashboard**: Fetch `/home` for aggregated user data
- **Search**: Use `/services/search` for filtering
- **Map Integration**: GeoJSON data available from service endpoints

---

## 🔧 Configuration

### Environment Variables (`.env`)

```
# Server
NODE_ENV=development
PORT=3001
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/gatebuddy

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=90d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...

# APIs
GEMINI_API_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Email
EMAIL_HOST=...
EMAIL_PORT=...
EMAIL_USER=...
EMAIL_PASSWORD=...

# Recommendation Service
RECOMMENDATION_SERVICE_URL=http://localhost:8000
```

---

## 📈 Performance & Scaling

- **Caching**: Home dashboard cached for 5 minutes
- **Pagination**: Large datasets paginated with limit/skip
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Compression**: Gzip compression on responses
- **Database Indexing**: Text indexes on services, geospatial on locations
- **Connection Pooling**: MongoDB connection pooling enabled

---

## 🛡️ Security Features

✅ Password hashing with bcrypt (10 salt rounds)
✅ JWT token-based authentication
✅ Token refresh rotation
✅ Account lockout after 5 failed login attempts
✅ CORS protection
✅ XSS prevention
✅ Mongo injection prevention
✅ Rate limiting on auth endpoints
✅ Helmet.js for HTTP headers
✅ HTTPS enforced in production
✅ Session security with HttpOnly cookies
✅ Audit logging for sensitive operations

---

## 📝 API Documentation

For detailed endpoint documentation including request/response examples, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

---

## 📞 Support & Contact

For issues, feature requests, or technical support, please refer to the project documentation or contact the development team.

---

**Last Updated**: April 2026
**Version**: 1.0.0

### 🚗 Parking & Dashboard

| Endpoint              | Method | Body / Params (Required)                                            | Description                 |
| :-------------------- | :----- | :------------------------------------------------------------------ | :-------------------------- |
| `/api/v1/parking`     | POST   | `{ name, location, floor?, spotNumber?, coordinates: [long, lat] }` | Save parking spot           |
| `/api/v1/parking/:id` | PATCH  | `{ name, note, spotNumber... }`                                     | Update parking info         |
| `/api/v1/home`        | GET    | `-`                                                                 | Orchestrated Dashboard data |

### 🤖 AI, Devices & Notifications

| Endpoint                         | Method | Body / Params (Required)                   | Description                |
| :------------------------------- | :----- | :----------------------------------------- | :------------------------- |
| `/api/v1/chat`                   | POST   | `{ message }`                              | Chat with Gemini Assistant |
| `/api/v1/users/devices`          | POST   | `{ deviceToken, deviceType, deviceName? }` | Register for Push          |
| `/api/v1/notifications`          | GET    | `-`                                        | User alert history         |
| `/api/v1/notifications/:id/read` | PATCH  | `(id in URL)`                              | Mark alert as read         |

---

---

## 🏗️ Core Technology Stack

- **Languages**: Node.js (Express), Python (FastAPI)
- **AI**: Google Generative AI (Gemini 2.5)
- **Database**: MongoDB Atlas (GeoJSON indexing)
- **Real-time**: Firebase Cloud Messaging (FCM)
- **Weather**: Open-Meteo (Keyless Integration)
#   g a t e - b u d d y - b a c k e n d  
 