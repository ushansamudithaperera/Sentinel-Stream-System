🛡️ Sentinel Stream IDSA real-time Intrusion Detection System demonstrating full-stack security engineering, from network anomaly detection to forensics-ready incident response.🌐 AboutSentinel Stream is a production-inspired IDS that monitors network traffic in real-time, detects attack patterns using statistical and behavioral analysis, and provides security analysts with actionable intelligence. Built with a modern MERN stack and Socket.IO for live dashboards, it bridges the gap between academic security theory and operational SOC workflows.🚀 Use Cases:🔍 Network Threat Monitoring and real-time alerting.🎓 Security Team Training and SOC simulation.💼 Portfolio Piece for full-stack + security engineering.🏗️ Foundation for building domain-specific detection logic.🛠️ What This System Does📡 Real-Time DetectionGenerate and analyze network traffic events continuously. The system runs a simulator that creates realistic traffic profiles and injects simulated attacks—then detects them in real-time using layered detection algorithms.🧠 Multi-Layer Detection EngineDDoS Detection 🌊 — Volumetric rate spiking beyond adaptive baseline (default 5× multiplier).Brute-Force Detection 🔨 — Auth connection flooding (>20 connections/sec).Statistical Anomaly 📈 — Z-score deviation from rolling distribution.Pattern Baseline 📉 — EWMA zero-day detection via drift thresholds.Each detector produces a confidence probability (1–99%) and metadata for analyst investigation.🕹️ Admin Feedback LoopMark alerts as "Blocked" (confirmed threat) or "Ignored" (false positive). The system dynamically tunes thresholds:✅ Blocked: Tightens sensitivity (lower thresholds) → catches more similar patterns.❌ Ignored: Relaxes sensitivity (higher thresholds) → reduces false positives.💻 Technical StackLayerTechnologies🎨 FrontendReact 19, Vite, Tailwind CSS, Recharts, Socket.IO Client⚙️ BackendNode.js 20, Express, Socket.IO, Mongoose🔐 SecurityJWT (Access + Refresh), bcryptjs, Helmet, Rate-limiting📊 DatabaseMongoDB (Atlas in Cloud, Local in Docker)🧠 DetectionRolling statistics, EWMA, Z-score, Adaptive thresholds🐳 DeploymentDocker, Docker Compose, Render⚡ Quick Start (Docker)📋 PrerequisitesDocker 20.10+ and Docker Compose 2.0+MongoDB Atlas connection string (recommended)1️⃣ Configure EnvironmentBash# From project root
cp .env.docker.example .env.docker
Edit .env.docker with your MONGO_URI and JWT_SECRETS.2️⃣ Start ServicesBashdocker-compose --env-file .env.docker up -d
3️⃣ Access the SystemFrontend: http://localhost:3000Backend API: http://localhost:5000🏗️ ArchitecturePlaintext┌─────────────────────────────────────────┐
│      React Dashboard (localhost:3000)   │
│  • Live charts (rate, bandwidth, conns) │
│  • Real-time alert feed                 │
│  • Forensics & IP Blacklist mgmt        │
└──────────────────┬──────────────────────┘
                   │ (Socket.IO + REST)
┌──────────────────▼──────────────────────┐
│      Express Backend (localhost:5000)   │
│  ┌────────────────────────────────────┐ │
│  │ 🧠 Detection Engine                │ │
│  │ • DDoS & Brute-force logic         │ │
│  │ • Z-score & EWMA Baseline          │ │
│  └────────────────────────────────────┘ │
└──────────────────┬──────────────────────┘
                   │ (Mongoose)
┌──────────────────▼──────────────────────┐
│      MongoDB Atlas / Local Docker       │
│  • Users, TrafficLogs, Alerts, Blocks   │
└─────────────────────────────────────────┘
🔍 Detection Engine: How It Works📏 DDoS DetectionPlaintextBaseline avg rate: 300 pkt/s
Spike to:         1,500 pkt/s
Ratio:            5× baseline
Result:           🚨 ALERT (High Severity)
🔨 Brute-Force Detection (Login Security)Rule: 10 failed JWT logins from the same IP in 30 seconds.Action: IP auto-blacklisted and logged to MongoDB.Admin Control: Manual "Unblock" available via Security Ops modal.🛡️ Security & HardeningJWT Auth: Access Token (15m) + HTTP-only Refresh Token (7d).Hardening: Helmet headers, Rate-limiting, and Input Validation.Role-Based Access (RBAC): Admin-only forensics and IP management.🚀 Roadmap[ ] 📧 Email/Slack alert notifications.[ ] 🗺️ Geo-IP heatmaps for attack visualization.[ ] 🤖 Advanced ML models (Isolation Forest).[ ] 🏗️ Kubernetes manifests for scaling.
