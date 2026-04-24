# ✈️ GateBuddy: The Intelligent Airport Companion Ecosystem

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/database-MongoDB-green)](https://www.mongodb.com/)
[![AI Assistant](https://img.shields.io/badge/AI-Google%20Gemini-blue)](https://deepmind.google/technologies/gemini/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**GateBuddy** is a state-of-the-art, distributed backend ecosystem designed to revolutionize the airport experience. It serves as a digital travel concierge, guiding passengers from the terminal entrance to their boarding gate with real-time intelligence, AI assistance, and indoor navigation.

---

## 🌟 Core Ecosystem Features

### 🎫 Smart Boarding Pass Intelligence
*   **IATA 792 (BCBP) Parser**: Instantly extracts seat, gate, flight, and destination data from barcode strings.
*   **Automated Tracking**: Scanned flights are automatically tracked for live status changes.
*   **Weather & Context**: Real-time arrival weather and destination recommendations delivered upon scanning.

### 🤖 AI-Powered Concierge
*   **Gemini Integration**: Powered by Google Gemini AI for context-aware, terminal-specific assistance.
*   **Live Grounding**: Answers queries about gate locations, flight delays, and airport amenities with zero-hallucination logic.

### 🗺️ Advanced Terminal Navigation
*   **Dijkstra Pathfinding**: Intelligent routing between terminal waypoints (gates, lounges, elevators).
*   **Geospatial Search**: Find nearby Duty-Free shops, VIP lounges, or restaurants using MongoDB 2dsphere indexing.
*   **Floor Awareness**: Navigation logic supports multi-level terminal transitions via elevators and escalators.

### 🔔 Real-Time Alert System
*   **FCM Push Notifications**: Instant delivery of gate changes, boarding reminders, and delay alerts.
*   **Scheduled Reminders**: User-configurable tracking alerts (e.g., "Remind me 30 mins before boarding").

---

## 🏗️ Technical Architecture

GateBuddy follows a modern microservices-inspired architecture:

-   **Primary Engine**: Node.js / Express / MongoDB (REST API & Real-time orchestration).
-   **Intelligence Service**: Python Flask (Personalized recommendation engine).
-   **Persistence**: MongoDB Atlas with Geospatial and Text Search capabilities.
-   **Security**: Unified OAuth 2.0 (Google, GitHub, Facebook) + JWT with Refresh Rotation.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Node.js, Express, Python Flask |
| **Database** | MongoDB (Geospatial Indexing) |
| **AI/ML** | Google Gemini 1.5 Pro |
| **Auth** | OAuth 2.0, JWT, Bcrypt |
| **Real-time** | Firebase Cloud Messaging (FCM), Node-Cron |
| **External APIs** | Open-Meteo, Wikipedia, Pexels, AirLabs |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ & npm 8+
- MongoDB instance (Local or Atlas)
- Python 3.8+ (for recommendation microservice)
- Firebase Admin SDK key
- Google Gemini API Key

### Installation

1.  **Clone & Install Dependencies**
    ```bash
    git clone https://github.com/your-username/gateBuddy.git
    cd gateBuddy
    npm install
    ```

2.  **Environment Setup**
    ```bash
    cp .env.example .env
    # Fill in your DATABASE_URL, GEMINI_API_KEY, and Firebase credentials
    ```

3.  **Run the Engines**
    ```bash
    # Start Node.js Server (Port 3001)
    npm run start:dev

    # Start Recommendation Microservice (Port 8000)
    cd recommendation-service
    pip install -r requirements.txt
    python app.py
    ```

---

## 📮 API Documentation & Testing

GateBuddy comes with a **highly detailed Postman Collection** designed for rapid testing and integration.

### [gateBuddy_API.postman_collection.json](./gateBuddy_API.postman_collection.json)

**Features of the Collection:**
*   **Markdown Descriptions**: Every endpoint includes a full technical breakdown of fields and responses.
*   **Automated Variable Capturing**: Scripts automatically save tokens, flight IDs, and user IDs for seamless testing.
*   **Body Templates**: Pre-filled "TestJSON" for all signup, login, and tracking routes.

For a full endpoint reference in Markdown, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

---

## 🛡️ Enterprise Security

- ✅ **JWT Refresh Rotation**: 90-day access / 7-day refresh lifecycle.
- ✅ **Brute Force Protection**: Account locking after 5 failed attempts.
- ✅ **Data Sanitization**: Built-in protection against NoSQL injection and XSS.
- ✅ **HttpOnly Cookies**: Secure session management for web clients.

---

## 📊 Analytics & Metrics

GateBuddy tracks system health and user engagement:
- Live flight delay monitoring.
- Aggregate service ratings and reviews.
- Active user tracking and engagement KPIs.

---

**Version**: 1.0.0
**Project Status**: Production Ready
**Maintained by**: The GateBuddy Development Team