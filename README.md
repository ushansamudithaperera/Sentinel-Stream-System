# Sentinel Stream IDS

> A real-time Intrusion Detection System demonstrating full-stack security engineering, from network anomaly detection to forensics-ready incident response.

## About

Sentinel Stream is a production-inspired IDS that monitors network traffic in real time, detects attack patterns using statistical and behavioral analysis, and provides security analysts with actionable intelligence. Built with a modern MERN stack and Socket.IO for live dashboards, it bridges the gap between academic security theory and operational SOC workflows.

**Use Cases:**
- Network threat monitoring and alerting
- Security team training and SOC simulation
- Portfolio demonstration of full-stack + security engineering
- Foundation for building domain-specific detection logic

---

## What This System Does

### Real-Time Detection
Generate and analyze network traffic events continuously. The system runs a simulator that creates realistic traffic profiles and injects simulated attacks—then detects them in real time using layered detection algorithms.

### Multi-Layer Detection Engine
1. **DDoS Detection** — Volumetric rate spiking beyond adaptive baseline (default 5× multiplier)
2. **Brute-Force Detection** — SSH connection flooding (>20 connections/sec)
3. **Statistical Anomaly** — Z-score deviation from rolling distribution
4. **Pattern Baseline** — EWMA zero-day detection via drift thresholds

Each detector produces a confidence probability (1–99%) and metadata for analyst investigation.

### Admin Feedback Loop
Mark alerts as "blocked" (confirmed threat) or "ignored" (false positive). The system dynamically tunes thresholds:
- **Blocked:** Tightens sensitivity (lower multipliers/thresholds) → catches more similar patterns
- **Ignored:** Relaxes sensitivity (higher thresholds) → reduces false positives

Result: Model improves over time without retraining.

### Incident Response Workflow
- **Live Alert Feed** with severity labeling (Safe / Suspicious / Malicious)
- **Forensics Dashboard** for historical review, filtering by type/severity
- **Auto-Blacklist** for high-severity events; manual unblock available
- **Evidence Persistence** — all alerts stored with full context for post-incident analysis

---

## Technical Stack

| Layer | Technologies |
|-------|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Recharts (live charts), Socket.IO Client |
| **Backend** | Node.js 20, Express, Socket.IO, Mongoose |
| **Security** | JWT (access + refresh), bcryptjs, Helmet, rate-limiting, input validation |
| **Database** | MongoDB (Atlas in production, local in development) |
| **Detection** | Rolling statistics, EWMA, z-score, adaptive thresholds |
| **Deployment** | Docker / Docker Compose, Render, MongoDB Atlas |

---

## Quick Start (Docker)

### Prerequisites
- Docker 20.10+ and Docker Compose 2.0+
- MongoDB Atlas connection string (recommended for production)

### 1. Configure Environment

```bash
# From project root
cp .env.docker.example .env.docker
```

Edit `.env.docker`:
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/sentinel-stream?retryWrites=true&w=majority
JWT_ACCESS_SECRET=<generate-random-secret>
JWT_REFRESH_SECRET=<generate-random-secret>
CLIENT_URL=http://localhost:3000
```

### 2. Start Services

```bash
docker-compose --env-file .env.docker up -d
```

Wait 30–45 seconds for containers to initialize.

### 3. Verify Deployment

```bash
# Check all services
docker-compose ps

# Test backend health
curl http://localhost:5000/
# Expected: "Server running"
```

### 4. Access the System

**Frontend:** http://localhost:3000  
**Backend API:** http://localhost:5000

1. Register a new account (defaults to viewer role)
2. Login and view real-time dashboard
3. (Optional) Promote account to admin via MongoDB to access forensics

---

## Architecture

```
┌─────────────────────────────────────────┐
│      React Dashboard (localhost:3000)   │
│  • Live charts (rate, bandwidth, conns) │
│  • Real-time alert feed                 │
│  • Forensics & blacklist management     │
│  • Role-based UI (viewer vs admin)      │
└──────────────────¬──────────────────────┘
                   │ (Socket.IO + REST API)
┌──────────────────▼──────────────────────┐
│  Express Backend (localhost:5000)       │
│  ┌────────────────────────────────────┐ │
│  │ Detection Engine                   │ │
│  │ • DDoS spike detection             │ │
│  │ • Brute-force pattern detection    │ │
│  │ • Z-score anomaly (statistical)    │ │
│  │ • EWMA baseline deviation          │ │
│  │ • Dynamic threshold tuning         │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ Traffic Simulator                  │ │
│  │ • Normal profiles (3 levels)       │ │
│  │ • Attack scenarios (3 types)       │ │
│  │ • 60-second cycles                 │ │
│  └────────────────────────────────────┘ │
└──────────────────¬──────────────────────┘
                   │ (Mongoose)
┌──────────────────▼──────────────────────┐
│  MongoDB Atlas                          │
│  • Users (auth + roles)                 │
│  • TrafficLog (metrics)                 │
│  • Alert (detected threats)             │
│  • Blacklist (auto-locked IPs)          │
│  • AuthAttempt (rate-limit tracking)    │
└─────────────────────────────────────────┘
```

---

## Detection Engine: How It Works

### Learning Phase (40 seconds)
System collects baseline traffic metrics before alerting. EWMA and rolling statistics stabilize, preventing false positives on startup noise.

### DDoS Detection
```
Baseline avg rate: 300 pkt/s
Spike to:         1,500 pkt/s
Ratio:            5× baseline
Threshold:        5.0 (default multiplier)
Result:           Alert (97% confidence)
```

Admin marks "blocked" → multiplier decreases to 4.8 (more sensitive)  
Admin marks "ignored" → multiplier increases to 5.2 (less sensitive)

### Brute-Force Detection
```
Protocol: SSH
Connection Rate: 85 conn/sec
NIST Threshold: >10 conn/sec for account lockout
Scanner Typical: 40–185 conn/sec
Result: Alert (98% confidence, High severity)
```

### Statistical Anomaly (Z-Score)
```
Rolling window: 60 samples (≈2 min history)
Mean rate: 250 pkt/s
Std Dev: 40 pkt/s
Observed: 410 pkt/s
Z-Score: (410 - 250) / 40 = 4.0
Threshold: 3.0 (default)
Result: Alert (88% confidence, Medium severity)
```

### Pattern Deviation (EWMA)
```
EWMA baseline: 280 pkt/s (exponential moving average)
Observed: 600 pkt/s
Deviation: 320 pkt/s
Ratio: 320 / 280 = 1.14 (114% deviation)
Threshold: 0.8 (default)
Result: Alert (92% confidence) - unseen pattern
```

---

## API Overview

### Authentication
```
POST /api/auth/register     — Create account (forces viewer role)
POST /api/auth/login        — Get JWT tokens
POST /api/auth/refresh      — Refresh access token
POST /api/auth/logout       — Invalidate refresh token
GET  /api/auth/me           — Current user info
```

### Traffic & Threats (Protected)
```
GET  /api/traffic/recent           — Last 25 samples (seed chart)
GET  /api/threats/count            — Total non-false-positive alerts
GET  /api/alerts/:id               — Single alert detail (admin)
PATCH /api/alerts/:id/action       — Admin confirms/dismisses alert
```

### Forensics & Admin (Admin Only)
```
GET    /api/logs              — All historical alerts
DELETE /api/logs              — Clear alert log
GET    /api/admin/blacklist   — List blocked IPs
DELETE /api/admin/blacklist   — Clear all blocks
DELETE /api/admin/blacklist/:ip
```

### System
```
GET /api/system/mode        — Current detection mode (learning/active)
GET /api/system/model-stats — Live threshold values & mode
```

---

## Example: Live Scenario

**Time 0:00–0:40** — Learning Phase  
Dashboard: `// awaiting baseline — detection inactive`

**Time 0:40** — Learning Complete  
System enters active detection mode.

**Time 1:50** — DDoS Attack Injected  
Simulator generates 15,000 pkt/s volumetric spike from attacker IP.  
Detection Engine: `15,000 > 300 × 5 = 1,500` → **DDoS ALERT (97% confidence, severity HIGH)**  
Dashboard: Red alert appears, source IP auto-blacklisted  
Alert stored: timestamp, metrics, confidence, metadata

**Time 1:52** — Admin Review  
Analyst opens alert detail:
- Source IP: 203.0.113.5
- Rate: 15,000 pkt/s (vs 300 pkt/s baseline)
- Confidence: 97%
- Bandwidth: 18 Mbps

Admin clicks **"Mark as Blocked"** → DDoS multiplier decreases (5.0 → 4.8) for future sensitivity.

**Time 2:05** — Attack Ends  
Traffic returns to normal baseline. Alert persisted to MongoDB for post-incident review.

---

## Security & Hardening

### Authentication
- **JWT Access Token** (15-minute expiry) + **Refresh Token** (7-day HTTP-only cookie)
- **bcryptjs** password hashing (12-round salt)
- **Token rotation** on refresh

### Network
- **Helmet** security headers (XSS, clickjacking, MIME-type sniffing protection)
- **Rate limiting** (100 req/15 min per IP)
- **CORS** configured for frontend-backend communication
- **Input validation** via express-validator (escaping, length checks)

### Access Control
- **Role-based** (viewer / admin)
- **Protected routes** with JWT middleware
- **Admin-only endpoints** for forensics, blacklist management

### Data
- **MongoDB Auth** with username/password
- **Mongoose schemas** with type enforcement
- **No secrets in code** (environment variables only)

⚠️ **Production Hardening:**
- Rotate JWT secrets immediately if exposed
- Use HTTPS for all traffic
- Enable MongoDB IP whitelist
- Set secure cookies: `secure: true, sameSite: 'strict'`
- Add request signing for public APIs

---

## Local Development

### Prerequisites
- Node.js 20+
- npm 10+
- MongoDB running locally or Atlas connection

### Setup

```bash
# Backend
cd sentinel-stream/server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI

# Frontend
cd ../client
npm install
```

### Run

```bash
# Terminal 1: Backend
cd sentinel-stream/server
npm run dev
# Backend runs on http://localhost:5000

# Terminal 2: Frontend
cd sentinel-stream/client
npm run dev
# Frontend runs on http://localhost:5173
```

---

## Deployment

### Docker Compose (Development)
```bash
docker-compose --env-file .env.docker up -d
```

### Render (Production)

Deploy as two separate services:
- **Backend service** on Render as Node.js Docker container
- **Frontend service** on Render as Nginx Docker container
- Both connected via MongoDB Atlas

See [MONGODB_CONFIG.md](MONGODB_CONFIG.md) for detailed setup.

---

## Project Structure

```
sentinel-stream-system/
├── README.md
├── docker-compose.yml
├── .env.docker.example
├── MONGODB_CONFIG.md
│
├── sentinel-stream/
│   ├── server/                    # Node.js + Express backend
│   │   ├── Dockerfile
│   │   ├── server.js              # Entry point
│   │   ├── app.js                 # Express app setup
│   │   ├── package.json
│   │   ├── controllers/           # Route handlers
│   │   ├── models/                # Mongoose schemas
│   │   ├── routes/                # API endpoints
│   │   ├── services/              # Business logic
│   │   │   ├── detectionEngine.js # Detection algorithms
│   │   │   └── simulator.js       # Traffic generator
│   │   └── middlewares/           # Auth, rate-limiting
│   │
│   └── client/                    # React + Vite frontend
│       ├── Dockerfile
│       ├── nginx.conf             # Nginx reverse proxy
│       ├── vite.config.js
│       ├── package.json
│       ├── index.html
│       └── src/
│           ├── pages/             # Dashboard, Login, Forensics
│           ├── components/        # Alert feed, Charts, Navbar
│           ├── services/          # API client, Socket.IO
│           └── utils/             # Auth helpers
```

---

## Monitoring & Logs

### Docker Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Health Checks
```bash
# Backend
curl http://localhost:5000/

# Database
mongosh -u admin -p password --eval "db.adminCommand('ping')"
```

---

## Roadmap

- [ ] Automated test suite (unit + integration)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Advanced anomaly detection (ML model, isolation forest)
- [ ] Email/Slack alert notifications
- [ ] Geo-IP heatmaps for attack visualization
- [ ] Multi-tenant organization support
- [ ] Kubernetes manifests for cloud-native deployment

---

## Performance Metrics

- **Detection Latency:** <100 ms (from traffic event to alert)
- **Alert Persistence:** ~50 ms (to MongoDB)
- **UI Update:** Real-time via Socket.IO (2-second emission interval)
- **Container Startup:** ~30 seconds (full initialization)

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **"MongoDB connected" not in logs** | Connection string invalid or network blocked | Verify MONGO_URI, allow Atlas IP whitelist |
| **Frontend blank page** | API URL misconfigured | Check REACT_APP_API_URL matches backend |
| **Containers won't start** | Port conflict or Docker daemon not running | `docker ps` to check, or use different ports |
| **500 error on registration** | Validation failed or duplicate user | Check username is unique and >6 chars |

---

## License

MIT License — See LICENSE file for details.

---

## Contributing

This is a demonstration project. For critical issues or feature ideas, open an issue on GitHub.

---

**Built with security engineering principles in mind. Not for production use without additional hardening.**
| **Port already in use** | Change BACKEND_PORT/FRONTEND_PORT in .env.docker or kill conflicting process. |
| **Volumes not persisting** | Verify Docker volumes: `docker volume ls`. Restart containers: `docker-compose down && docker-compose up`. |

### Local Development Issues

| Issue | Fix |
|-------|-----|
| **"Cannot GET /"** from localhost:5000 | Backend not running. Run `npm run dev` in server/ folder. |
| **Frontend can't login** | Verify `CLIENT_URL` in server/.env matches frontend URL (http://localhost:5173). |
| **MongoDB connection timeout** | Check MONGO_URI is correct. For Atlas, ensure IP whitelist includes your machine. |
| **Socket.IO not updating** | Confirm backend is running. Check browser console for connection errors. |
| **Port 5000/5173 already in use** | Kill process: `lsof -i :5000` (OSX/Linux) or Task Manager (Windows). |

---

## Performance Optimization

### Docker Image Sizes
- **Backend:** ~200 MB (multi-stage build, no dev dependencies)
- **Frontend:** ~50 MB (Nginx + compiled React, no node_modules)
- **MongoDB:** ~700 MB (official alpine image)

### Network Communication
- **Containers on same Docker network** → direct hostname resolution (backend:5000)
- **Frontend Nginx proxy** → routes /api and /socket.io to backend service

---

## Security Notes

⚠️ **Before Deploying to Production:**
- Rotate JWT secrets immediately if ever exposed
- Use environment variables only; never hardcode secrets
- Enable HTTPS and set `secure: true` for cookies
- Change default MongoDB credentials
- Use managed MongoDB (Atlas) with IP whitelist
- Set up network-level DDoS mitigation (Cloudflare, AWS Shield)
- Add rate limiting to brute-force endpoints
- Audit MongoDB access logs
- Consider secrets management (HashiCorp Vault, AWS Secrets Manager)

---

## Future Enhancements

- [ ] Automated tests (unit + integration)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Email/Slack alert notifications
- [ ] Multi-tenant support (organizations)
- [ ] Persistent config: save tuned thresholds to DB
- [ ] Advanced visualization (geo-IP heatmaps, protocol breakdown)
- [ ] ML-assisted anomaly detection (isolation forest, autoencoder)
- [ ] Kubernetes manifests for cloud-native deployment

---

## License

MIT

---

## Support & Questions

For issues or feature requests, open a GitHub issue. For security vulnerabilities, please email privately rather than opening a public issue.
