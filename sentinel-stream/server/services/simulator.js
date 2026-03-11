const TrafficLog = require('../models/TrafficLog');
const { detect } = require('./detectionEngine');

// ─── Rhythm ───────────────────────────────────────────────────────────────────
const INTERVAL_MS     = 2000;   // emit every 2 s
const CYCLE_MS        = 60000;  // full loop: 60 s wallclock
const NORMAL_PHASE_MS = 50000;  // 0–50 s → Normal phase  |  50–60 s → Attack phase

// ─── Metric notes ─────────────────────────────────────────────────────────────
//   Business hours (08:00–18:00) MODERATE : 140–420  pkt/s, ~1.0–2.5 Mbps
//   Off-peak        (all other)   QUIET   :  20–85   pkt/s, ~0.1–0.5 Mbps
//   Mirai-class DDoS attack       DDOS    : 5000–10000 pkt/s, 8.0–12.0 Mbps
//   AI detection                          : probability → 99 during attack (>90%)

const ATTACKER_IPS = [
  '45.33.32.156', '198.51.100.42', '203.0.113.99',  '185.220.101.56',
  '104.21.14.80', '89.248.167.131','196.52.43.27',  '193.32.162.55',
];
const LEGIT_IPS = [
  ...Array.from({ length: 12 }, (_, i) => `10.0.1.${10 + i}`),
  '151.101.1.1', '151.101.65.1', '104.16.0.1', '104.17.0.1',
  '172.217.0.0', '142.250.0.0',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function jitter(base, noise) {
  return base + (Math.random() + Math.random() - 1) * base * noise;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(v))); }

// ─── Time-of-day profile ──────────────────────────────────────────────────────
//   Returns the normal-phase traffic envelope based on current system hour.
function getTimeProfile() {
  const hour = new Date().getHours();
  if (hour >= 8 && hour < 18) {
    // Business hours: typical webserver/enterprise load
    return { label: 'MODERATE', rateMin: 140, rateMax: 420, bwMin: 1000, bwMax: 2500 };
  }
  // Off-peak: minimal background traffic
  return { label: 'QUIET', rateMin: 20, rateMax: 85, bwMin: 100, bwMax: 500 };
}

// ─── Simulator ───────────────────────────────────────────────────────────────
function startSimulator(io) {
  let attackerIp = pick(ATTACKER_IPS);

  setInterval(async () => {
    // Rhythmic 25-second cycle driven by wall-clock time (no tickIndex drift)
    const cyclePos = Date.now() % CYCLE_MS;
    const isAttack = cyclePos >= NORMAL_PHASE_MS;
    const profile  = getTimeProfile();

    let rate, packetSize, bandwidth, connectionRate, ip, protocol, scenario;

    if (isAttack) {
      // ── Mirai-class DDoS spike (10 s window) ──────────────────────────────
      //    Small fragmented packets maximise connection-table exhaustion;
      //    flood volume in the 8–12 Mbps range matches observed Mirai campaigns.
      rate           = clamp(jitter(7500,  0.15), 5000, 10000);
      bandwidth      = clamp(jitter(10000, 0.12), 8000, 12000); // Kbps → 8–12 Mbps
      packetSize     = clamp(jitter(250,   0.20), 64,   512);   // small fragmented pkts
      connectionRate = clamp(jitter(850,   0.20), 400,  1400);
      ip             = attackerIp;
      protocol       = pick(['UDP', 'TCP-SYN', 'TCP-SYN', 'ICMP', 'UDP']);
      scenario       = 'DDOS';
      attackerIp     = pick(ATTACKER_IPS); // rotate attacker each tick
    } else {
      // ── Normal baseline (15 s window) — envelope comes from time profile ──
      const midRate  = (profile.rateMin + profile.rateMax) / 2;
      const midBw    = (profile.bwMin   + profile.bwMax)   / 2;
      rate           = clamp(jitter(midRate, 0.18), profile.rateMin, profile.rateMax);
      bandwidth      = clamp(jitter(midBw,   0.18), profile.bwMin,   profile.bwMax);
      packetSize     = clamp(jitter(700,     0.20), 400,  1200);
      connectionRate = clamp(jitter(8,       0.35), 3,    16);
      ip             = pick(LEGIT_IPS);
      protocol       = pick(['HTTPS', 'HTTPS', 'HTTP', 'DNS']);
      scenario       = profile.label; // 'MODERATE' or 'QUIET'
    }

    const log = new TrafficLog({ ip, protocol, packetSize, rate, bandwidth, connectionRate });
    await log.save();

    // AI detection: during attack phase the rate is 12–70× above baseline avg,
    // far exceeding the DDoS multiplier (5×) → probability locked to 99 (>90%).
    const { status, alertId, probability, mode } = await detect({ ...log.toObject(), scenario });

    io.emit('trafficUpdate',   { timestamp: new Date(), ip, protocol, packetSize, rate, bandwidth, connectionRate, scenario, mode });
    io.emit('detectionUpdate', { ...log.toObject(), status, alertId, probability, mode, scenario });
  }, INTERVAL_MS);
}

module.exports = startSimulator;
