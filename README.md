# Sentinel Stream IDS

**Real-time Intrusion Detection System** built with MERN stack (React + Node.js + MongoDB + Socket.IO).

A practical, production-inspired security monitoring platform that simulates live network traffic, detects attack patterns in real time, and provides operationally relevant forensics dashboards for security analysts.

---

## Quick Start

### Prerequisites
- Docker 20.10+ and Docker Compose 2.0+
- OR: Node.js 20+, npm 10+, MongoDB

### Option 1: Docker (Recommended) ⭐

**1. Clone & Configure:**
```bash
cd sentinel-stream-system
cp .env.docker.example .env.docker
# Edit .env.docker and change JWT secrets and MONGO_PASSWORD
```

**2. Start All Services (one command):**
```bash
docker-compose --env-file .env.docker up -d
```

**3. Verify Services:**
```bash
docker-compose ps
# All should show "Up" status
```

**4. Access the App:**
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **MongoDB:** mongodb://admin:password@localhost:27017 (if exposed)

**5. Login:**
Register a new account (role defaults to viewer) or authenticate.

---

### Option 2: Local Development (Node + npm)

**1. Install Dependencies:**
```bash
cd sentinel-stream/server
npm install

cd ../client
npm install
```

**2. Configure Environment:**
```bash
cd ../server
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets
```

**3. Start Backend:**
```bash
cd sentinel-stream/server
npm run dev
```

**4. Start Frontend (new terminal):**
```bash
cd sentinel-stream/client
npm run dev
```

**5. Access the App:**
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

---

## Docker Usage Guide

### Build Images Manually
```bash
# Build backend
docker build -t sentinel-backend ./sentinel-stream/server

# Build frontend
docker build -t sentinel-frontend ./sentinel-stream/client

# Or let docker-compose build automatically on first up
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Stop & Clean
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (warning: deletes MongoDB data)
docker-compose down -v
```

### Environment Variables (Docker)
Create `.env.docker` based on `.env.docker.example`:

```env
NODE_ENV=production
BACKEND_PORT=5000
FRONTEND_PORT=3000
MONGO_USER=admin
MONGO_PASSWORD=change-this-secure-password
JWT_ACCESS_SECRET=your-random-secret-min-32-chars
JWT_REFRESH_SECRET=your-random-secret-min-32-chars
CLIENT_URL=http://localhost:3000
```

### Production Deployment Notes

**Before deploying:**
1. Generate strong JWT secrets: `openssl rand -base64 32`
2. Set `NODE_ENV=production`
3. Use HTTPS with valid certificates
4. Change default MongoDB credentials
5. Use managed MongoDB (Atlas) instead of container in production
6. Configure Nginx reverse proxy with rate limiting + DDoS mitigation
7. Set up automated backups for MongoDB

**Example production docker-compose** (use managed MongoDB):
```yaml
services:
  backend:
    environment:
      MONGO_URI: mongodb+srv://user:pass@cluster.mongodb.net/sentinel-stream
```

---

## Project Overview

### What This Does

1. **Simulates realistic network traffic** — generates packet rate, bandwidth, connection rate, and protocol data
2. **Detects four threat types** via multi-layer detection engine:
   - **DDoS** — volumetric flood spikes (rate × baseline multiplier)
   - **BruteForce** — SSH high connection rate from single IP
   - **Anomaly** — statistical outliers (z-score, EWMA pattern deviation)
   - **Recovery** — traffic returning to normal after attack
3. **Stores incident records** — persists all alerts with probability scores and forensic metadata
4. **Provides analyst UX** — real-time dashboard, forensics log, blacklist management
5. **Learns and adapts** — admin feedback ("block"/"ignore") tunes model sensitivity dynamically

### Use Case

Think **SOC (Security Operations Center) lite**:
- **Blue team analyst** logs in, sees live alert feed
- **DDoS spike appears** → 94% confidence, 10k–20k pkt/s detected
- **Admin marks it "blocked"** → system tightens DDoS threshold for future (more sensitive)
- **False positive on DNS query** → admin marks "ignore" → system relaxes threshold (less sensitive)
- **Forensics team reviews** stored logs by date, severity, type; blacklists repeat offenders

---

## Tech Stack

| Layer | Technologies |
|-------|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Recharts (live charts), Axios, Socket.IO Client |
| **Backend** | Node.js, Express, Socket.IO, MongoDB + Mongoose |
| **Security** | JWT (access + refresh tokens), bcryptjs, Helmet, rate-limiter, input validation |
| **Detection** | Rolling statistics, EWMA baseline tracking, z-score, adaptive thresholds |
| **Deployment** | Docker, Docker Compose, Nginx |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                          │
│              (handles /api, /socket.io, static)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      Browser / Dashboard                        │
│  • Real-time line charts (rate, bandwidth, connections)         │
│  • Live alert feed (Safe / Suspicious / Malicious)              │
│  • Forensics page (filter, export, blacklist mgmt)              │
│  • Role gating (viewer vs admin)                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (Socket.IO + REST API)
┌──────────────────────────▼──────────────────────────────────────┐
│                   Backend (Node.js + Express)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ API Routes                                                 │ │
│  │ • /api/auth/{register,login,refresh,logout,me}            │ │
│  │ • /api/traffic/recent (seed live chart)                   │ │
│  │ • /api/alerts/:id/action (admin: block/ignore)            │ │
│  │ • /api/logs, /api/admin/blacklist/*                       │ │
│  │ • /api/system/{mode,model-stats}                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Real-time Services (Socket.IO)                            │  │
│  │ • Simulator — generates traffic every 2 sec               │  │
│  │ • Detection Engine — analyzes & classifies                │  │
│  │ • Broadcast: trafficUpdate, detectionUpdate, securityAlert│  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (Mongoose)
┌──────────────────────────▼──────────────────────────────────────┐
│                    MongoDB (Container/Atlas)                    │
│  • User (authentication + roles)                                │
│  • TrafficLog (packet rate, bandwidth, IP, protocol samples)    │
│  • Alert (threat type, severity, details, admin action)         │
│  • Blacklist (auto-locked IPs)                                  │
│  • AuthAttempt (rate-limit tracking)                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Detection Engine Deep Dive

The detection system runs **every 2 seconds** on incoming traffic and employs **four independent checks**, each producing a confidence probability (1–99%):

### 1. **DDoS Detection** (Volumetric Spike)

**Algorithm:**
```
if traffic.rate > avg_rate × dynamicDDoSMultiplier:
  probability = clamp((ratio / multiplier) × 85 + 14)
  alert("DDoS", probability, severity="High")
```

**Tuning:** Admin feedback adjusts `dynamicDDoSMultiplier` (default 5.0, range 2–12):
- **"block" reduces by 0.2** → more sensitive (catches subtle spikes sooner)
- **"ignore" increases by 0.2** → less sensitive (dismisses false positives)

**Real scenario:** Normal ≈200 pkt/s → spike to 10,000 pkt/s → blocked as 95%+ certain DDoS.

---

### 2. **Brute-Force Detection** (SSH High Connection Rate)

**Algorithm:**
```
if protocol === "SSH" && connectionRate > 20 conn/sec:
  probability = clamp(min(connRate / 120) × 85 + 14)
  severity = "High" if connRate > 80 else "Medium"
  alert("BruteForce", probability, severity)
```

**Basis:** NIST SP 800-63B flags >10 login attempts/sec; typical SSH scanners use 40–185 conn/sec.

**Example:** Attacker spawns 90 SSH connections/sec from 192.168.1.100 → 98%+ certain BruteForce.

---

### 3. **Statistical Anomaly** (Z-Score)

**Algorithm:**
```
rateWindow = rolling 60 samples (≈2 min history)
if len(rateWindow) ≥ 10 and stdDev > 0:
  zScore = (traffic.rate − avg) / stdDev
  if zScore > dynamicZScoreThreshold (default 3.0):
    probability = clamp(min(zScore / 6) × 85 + 14)
    alert("Anomaly", probability, severity="Medium")
```

**Tuning:** Admin feedback adjusts `dynamicZScoreThreshold` (default 3.0, range 1.5–8.0):
- **"block" decreases by 0.1** → catches subtler deviations
- **"ignore" increases by 0.1** → permits more variance

**Use case:** Detects unusual patterns that don't spike sharply (e.g., unusual protocol mix, bandwidth without rate spike).

---

### 4. **EWMA Zero-Day Deviation** (Pattern Baseline)

**Algorithm:**
```
ewma = exponentially weighted moving average (α=0.08)
deviation = |traffic.rate − ewma|
deviationRatio = deviation / max(ewma, 1)

if deviationRatio > dynamicDeviationThreshold (default 0.8):
  probability = clamp(min(deviationRatio) × 85 + 14)
  alert("Anomaly", probability, severity="High")
```

**Sensitivity tuning:** Admin "block" decreases by 0.05; "ignore" increases by 0.05.

**Strength:** Captures unseen attack patterns that EWMA learns are abnormal—good for zero-days.

---

### Learning Phase

**Duration:** 40 seconds  
**Behavior:** System silently collects ~20 baseline samples before first alert. This stabilizes EWMA and rolling stats so early spikes don't trigger false positives.

**Display:** Dashboard shows `// awaiting baseline — detection inactive` until learning ends.

---

## Attack Simulator

Runs a **60-second cycle** with 10-second periods of **normal traffic** interspersed with **random 5–15 sec attack windows**.

### **NORMAL Traffic** (3 profiles)
| Profile | Rate (pkt/s) | Bandwidth | ConnRate | Protocol |
|---------|---|---|---|---|
| LOW | 10–50 | 100–500 Kbps | 1–3 | HTTPS, DNS |
| MODERATE | 150–450 | 1–2 Mbps | 5–20 | HTTPS, HTTP, DNS |
| HIGH | 400–800 | 2–4 Mbps | 15–35 | HTTPS, HTTP |

### **Attack Scenarios** (randomly selected per cycle)

| Type | Rate | Bandwidth | ConnRate | Protocol | Confidence |
|------|---|---|---|---|---|
| **BruteForce** | 600–900 | 1–2 Mbps | **60–100** | **SSH** | 94% |
| **Anomaly** | 1500–3000 | 4–6 Mbps | 30–80 | Unknown | 91% |
| **DDoS** | 10k–20k | 15–25 Mbps | 40–100 | Mixed | 97% |

---

## API Reference

### **Authentication**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### **Traffic & Alerts** (Protected)
```
GET  /api/traffic/recent              # Last 25 samples (seed chart)
GET  /api/threats/count               # Total non-false-positive alerts
GET  /api/alerts/:id                  # Single alert detail (admin)
PATCH /api/alerts/:id/action          # Admin: { action: "block" | "ignore" }
```

### **Forensics** (Admin Only)
```
GET  /api/logs                        # All alerts (newest first)
DELETE /api/logs                      # Clear all alerts
GET  /api/admin/blacklist             # List blocked IPs
DELETE /api/admin/blacklist           # Clear blacklist
DELETE /api/admin/blacklist/:ip       # Unblock single IP
```

### **System**
```
GET  /api/system/mode                 # { mode: "learning" | "active" }
GET  /api/system/model-stats          # {
                                       #   ddosMultiplier: 5.0,
                                       #   zScoreThreshold: 3.0,
                                       #   deviationThreshold: 0.8,
                                       #   mode: "active"
                                       # }
```

---

## Key Features

### 1. **Real-Time Monitoring**
- Socket.IO emits every 2 seconds
- Live line charts (packet rate, bandwidth, connection rate)
- Alert feed updates instantly

### 2. **Admin Feedback Loop**
- Confirm threat: `action: "block"` → tightens thresholds (more sensitive)
- Dismiss false positive: `action: "ignore"` → relaxes thresholds (less sensitive)
- View current model sensitivity via `/api/system/model-stats`

### 3. **Auto-Blacklist**
- High-severity alerts auto-lock source IP
- Admin can view and manually unblock via forensics panel

### 4. **Role-Based Access**
- **Viewer** — dashboard, recent threat feed
- **Admin** — full logs, blacklist management, model tuning, clear alerts

### 5. **Security Hardening**
- JWT access/refresh token split (15 min + 7 day expiry)
- HTTP-only, Secure, SameSite cookies
- Helmet security headers
- Rate limiting: 100 req/15 min per IP
- Input validation via express-validator

---

## Docker File Structure

```
sentinel-stream-system/
├── docker-compose.yml         # Orchestrates all 3 services
├── .env.docker.example        # Docker environment template
├── .dockerignore               # Root-level Docker ignore
│
├── sentinel-stream/
│   ├── server/
│   │   ├── Dockerfile         # Multi-stage Node.js build
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   ├── server.js
│   │   └── ... (other API code)
│   │
│   └── client/
│       ├── Dockerfile         # Multi-stage React + Nginx
│       ├── nginx.conf         # SPA routing + API proxy
│       ├── .dockerignore
│       ├── package.json
│       ├── vite.config.js
│       └── src/
│           └── ... (React code)
```

---

## File Structure (Overall)

```
sentinel-stream/
├── server/
│   ├── app.js                 # Express app setup
│   ├── server.js              # Entry point (dotenv + HTTP/Socket.IO)
│   ├── package.json
│   ├── .env                   # Environment variables (DO NOT COMMIT)
│   ├── .env.example
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js  # Login, register, token refresh
│   │   └── trafficController.js
│   ├── middlewares/
│   │   ├── auth.js            # JWT verify, role gating
│   │   └── rateLimiter.js     # Per-IP throttle
│   ├── models/
│   │   ├── User.js
│   │   ├── TrafficLog.js
│   │   ├── Alert.js
│   │   ├── Blacklist.js
│   │   └── AuthAttempt.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── traffic.js         # All detection, forensics, admin endpoints
│   └── services/
│       ├── detectionEngine.js # Core detection logic + feedback tuning
│       └── simulator.js        # Traffic generation + attack injection
└── client/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.jsx           # Entry
        ├── App.jsx
        ├── components/
        │   ├── Navbar.jsx     # Login/profile/logout
        │   ├── AlertFeed.jsx  # Live threat list
        │   └── Chart.jsx      # Recharts graphs
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx  # Main UI (chart + alert feed)
        │   ├── AlertDetail.jsx
        │   └── Forensics.jsx  # Logs, blacklist, forensics
        ├── services/
        │   ├── api.js         # Axios instance
        │   └── socket.js      # Socket.IO client
        └── utils/
            └── auth.js        # Token storage/retrieval
```

---

## Troubleshooting

### Docker Issues

| Issue | Fix |
|-------|-----|
| **"Connection refused" on localhost:3000** | Run `docker-compose logs frontend` to check Nginx/build errors. |
| **MongoDB connection timeout** | Verify `mongodb` service is running: `docker-compose ps`. Check MONGO_URI. |
| **Frontend can't connect to backend API** | Ensure backend service name is `backend` in docker-compose. Check Nginx proxy_pass. |
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
