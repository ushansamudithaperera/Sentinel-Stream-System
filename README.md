# Sentinel Stream System IDS

Real-time Intrusion Detection System built with a MERN-style stack (React + Node.js + MongoDB + Socket.IO), focused on cyber defense workflows.

The platform simulates live network traffic, detects suspicious behavior, persists incidents, and provides analyst-facing investigation tools.

## Highlights

- Live traffic stream with Socket.IO updates every 2 seconds
- Detection engine with:
  - learning warm-up phase
  - DDoS spike detection
  - brute-force login pattern detection
  - statistical anomaly detection (z-score)
  - EWMA deviation checks
- Auto-blacklisting for high-severity events
- Admin feedback loop to tune model sensitivity dynamically
- JWT auth with HTTP-only cookies and role-based access control
- Forensics dashboard with severity/type distributions and historical log review

## Tech Stack

Frontend
- React 19
- Vite
- Tailwind CSS
- Recharts
- Axios
- Socket.IO Client

Backend
- Node.js + Express
- Socket.IO
- MongoDB + Mongoose
- JWT + bcryptjs
- Helmet + express-rate-limit + express-validator

## Repository Structure

```text
sentinel-stream/
  client/    # React dashboard and analyst UI
  server/    # API, simulator, detection engine, MongoDB models
```

## Core Features

1. Real-time Security Monitoring
- Traffic telemetry is generated continuously by a simulator
- Live charting of packet rate, bandwidth, and connection rate
- Live threat feed with scenario-aware labeling

2. Detection and Classification
- Learning mode to establish baseline before alerts
- DDoS detection using adaptive multiplier over rolling average
- Brute-force detection via SSH/auth pattern thresholds
- Statistical anomaly detection using z-score
- Zero-day style deviation check using EWMA drift

3. Incident Response Workflow
- Threat logs persisted to MongoDB
- Admin actions per alert: block or ignore
- False positives excluded from key threat counters
- Blacklist operations: view, remove one IP, clear all

4. Access Control and Security
- Register/login flow
- Role model: viewer and admin
- Protected endpoints with token validation
- Auth route hardening with rate limiting and brute-force middleware

## API Overview

Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me

Traffic and Threats
- GET /api/traffic/recent
- GET /api/threats/count
- GET /api/threats/severity-distribution
- GET /api/alerts/:id
- PATCH /api/alerts/:id/action

Admin and Forensics
- GET /api/logs
- DELETE /api/logs
- GET /api/admin/blacklist
- DELETE /api/admin/blacklist
- DELETE /api/admin/blacklist/:ip
- GET /api/system/model-stats

## Getting Started

### 1. Prerequisites

- Node.js 20+ recommended
- npm 10+
- MongoDB Atlas or local MongoDB instance

### 2. Install Dependencies

```bash
# from repository root
cd sentinel-stream/server
npm install

cd ../client
npm install
```

### 3. Configure Environment Variables

Create this file:

```text
sentinel-stream/server/.env
```

Suggested variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
JWT_ACCESS_SECRET=replace_with_strong_secret
JWT_REFRESH_SECRET=replace_with_strong_secret
NODE_ENV=development
```

Important
- Keep real secrets only in server/.env
- Commit only templates like .env.example, never real credentials

### 4. Run the App

Start backend:

```bash
cd sentinel-stream/server
npm start
```

Start frontend:

```bash
cd sentinel-stream/client
npm run dev
```

Default URLs
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## User Roles

Viewer
- Can access dashboard and non-admin protected data

Admin
- Can access forensic logs
- Can clear logs
- Can manage blacklist
- Can mark threat outcomes for model feedback

Note: Registration currently creates viewer accounts by default.

## Detection Engine Notes

- Starts in learning mode for a short warm-up period
- Stores one primary alert document per attack event cycle
- Adjusts sensitivity over time using admin feedback:
  - block lowers thresholds (more sensitive)
  - ignore raises thresholds (less sensitive)

## Troubleshooting

If npm run dev fails in either app:

1. Confirm dependencies are installed in both folders.
2. Ensure server/.env exists and contains valid values.
3. Confirm MongoDB is reachable from MONGO_URI.
4. Use Node.js 20+.
5. Check port conflicts on 5000 and 5173.

Quick health checks:

```bash
# backend base route
curl http://localhost:5000/
```

If frontend cannot authenticate:

- Verify CLIENT_URL in server/.env matches frontend URL
- Ensure backend is running before logging in

## Security Recommendations

- Rotate any exposed credentials immediately
- Use long random JWT secrets
- Keep production cookies secure with HTTPS
- Add CI checks (lint, test, npm audit) before deployment

## Future Improvements

- Docker and docker-compose for one-command local startup
- Automated tests (unit + integration)
- CI/CD pipeline with quality gates
- Alert notification channels (email/Slack)
- Multi-tenant org/user support

## License

MIT (or update this section with your preferred license).
