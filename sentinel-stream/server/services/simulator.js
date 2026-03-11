const TrafficLog = require('../models/TrafficLog');
const { detect } = require('./detectionEngine');

// ─── Metric units (NOC / RFC standard) ──────────────────────────────────────
//   rate           pkt/s   packets per second           (IDS industry standard)
//   packetSize     B       bytes per packet             (Ethernet MTU = 1500 B)
//   bandwidth      Kbps    = rate × packetSize × 8 / 1000  (telco/NOC standard)
//   connectionRate conn/s  TCP connections per second from one IP
//                          NIST SP 800-63B: >10 auth fails/sec = lockout trigger

// ─── IP pools ────────────────────────────────────────────────────────────────
const ATTACKER_IPS = [
  '45.33.32.156', '198.51.100.42', '203.0.113.99',  '185.220.101.56',
  '104.21.14.80', '89.248.167.131','196.52.43.27',  '193.32.162.55',
];
const LEGIT_IPS = [
  ...Array.from({ length: 12 }, (_, i) => `10.0.1.${10 + i}`),  // internal LAN
  '151.101.1.1', '151.101.65.1', '104.16.0.1', '104.17.0.1',    // CDN edge
  '172.217.0.0', '142.250.0.0',                                  // external legit
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/** Central-limit jitter — more natural bell-curve noise than flat uniform */
function jitter(base, noise) {
  return base + (Math.random() + Math.random() - 1) * base * noise;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(v))); }

// ─── Scenario state machine ──────────────────────────────────────────────────
//
//  Real-world server benchmarks (Cloudflare / Arbor / CAIDA sources):
//  QUIET      off-peak / night:       20–80   pkt/s,  avg 580 B,  ~9–37   Kbps
//  MODERATE   business hours normal: 150–420  pkt/s,  avg 520 B,  ~62–175 Kbps
//  PEAK       traffic spike:         380–720  pkt/s,  avg 490 B,  ~149–282 Kbps
//  DDOS       Mirai-class botnet:   5000–18000 pkt/s, avg  84 B,  ~3–12 Mbps
//  BRUTEFORCE SSH dict attack:        80–230  pkt/s,  avg 260 B,  ~17–48  Kbps
//             but 40–185 conn/sec from single IP on port 22
//  ANOMALY    insider / misconfig:  gradual 1→4× normal over 60–120 s
//  RECOVERY   post-attack decay:   ramps back to baseline over 15–35 s

const DURATIONS = {
  QUIET:      [90,  240],  // 1.5 – 4 min of calm baseline
  MODERATE:   [120, 360], // 2 – 6 min of normal business traffic
  PEAK:       [45,  120], // short legitimate traffic burst
  DDOS:       [20,  50 ], // attack itself is brief but intense
  BRUTEFORCE: [25,  70 ], // SSH scan window
  ANOMALY:    [60,  150], // gradual insider drift
  RECOVERY:   [30,  60 ], // ramp back down to baseline
};

// Weighted transition table — attacks are rare; long calm stretches are the norm
// Total attack weight from QUIET = 9 / 100, from MODERATE = 12 / 100
const TRANSITIONS = {
  QUIET:      [['QUIET',25],['MODERATE',66],['DDOS',2],['BRUTEFORCE',4],['ANOMALY',3]],
  MODERATE:   [['MODERATE',35],['QUIET',22],['PEAK',26],['DDOS',5],['BRUTEFORCE',7],['ANOMALY',5]],
  PEAK:       [['PEAK',15],['MODERATE',52],['DDOS',14],['BRUTEFORCE',10],['ANOMALY',9]],
  DDOS:       [['RECOVERY',100]],
  BRUTEFORCE: [['RECOVERY',100]],
  ANOMALY:    [['RECOVERY',100]],
  RECOVERY:   [['QUIET',55],['MODERATE',45]],
};

function nextScenario(current) {
  const opts = TRANSITIONS[current];
  let r = Math.random() * opts.reduce((s, [, w]) => s + w, 0);
  for (const [name, w] of opts) { r -= w; if (r <= 0) return name; }
  return opts[opts.length - 1][0];
}
function dur(name) {
  const [lo, hi] = DURATIONS[name];
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

// ─── Simulator ───────────────────────────────────────────────────────────────
function startSimulator(io) {
  let scenario    = 'MODERATE';
  let ttl         = dur(scenario);   // seconds remaining in current scenario
  let tick        = 0;               // ticks elapsed in current scenario
  let scenLen     = ttl;             // total length for progress calc
  let attackerIp  = pick(ATTACKER_IPS);
  let recoverRate = 260;             // pkt/s to recover from after attack

  setInterval(async () => {
    ttl--; tick++;

    // ── Scenario transition ───────────────────────────────────────────────
    if (ttl <= 0) {
      if (['DDOS','BRUTEFORCE','ANOMALY'].includes(scenario)) {
        recoverRate = scenario === 'DDOS' ? 9000 : scenario === 'ANOMALY' ? 800 : 145;
        scenario = 'RECOVERY';
      } else {
        scenario = nextScenario(scenario);
        if (['DDOS','BRUTEFORCE'].includes(scenario)) attackerIp = pick(ATTACKER_IPS);
      }
      ttl = dur(scenario); scenLen = ttl; tick = 0;
    }

    const progress = Math.min(tick / Math.max(scenLen, 1), 1); // 0 → 1 within scenario

    // ── Traffic values per scenario ───────────────────────────────────────
    let rate, packetSize, connectionRate, ip, protocol;

    if (scenario === 'QUIET') {
      rate           = clamp(jitter(45,   0.35), 20,  85);
      packetSize     = clamp(jitter(580,  0.25), 300, 1400);
      connectionRate = clamp(jitter(2,    0.50), 0,   6);
      ip             = pick(LEGIT_IPS);
      protocol       = pick(['HTTPS','HTTPS','HTTP','DNS']);

    } else if (scenario === 'MODERATE') {
      rate           = clamp(jitter(265,  0.28), 140, 420);
      packetSize     = clamp(jitter(520,  0.22), 250, 1200);
      connectionRate = clamp(jitter(8,    0.38), 3,   18);
      ip             = pick(LEGIT_IPS);
      protocol       = pick(['HTTPS','HTTPS','HTTP','HTTP','DNS','FTP']);

    } else if (scenario === 'PEAK') {
      rate           = clamp(jitter(530,  0.22), 370, 720);
      packetSize     = clamp(jitter(490,  0.22), 250, 1200);
      connectionRate = clamp(jitter(19,   0.32), 10,  38);
      ip             = pick(LEGIT_IPS);
      protocol       = pick(['HTTPS','HTTPS','HTTP','DNS']);

    } else if (scenario === 'DDOS') {
      // SYN/UDP flood — tiny packets, massive pkt/s (Arbor WISR data)
      rate           = clamp(jitter(10000, 0.38), 5000, 18000);
      packetSize     = clamp(jitter(84,    0.25), 64,   128);
      connectionRate = clamp(jitter(380,   0.30), 180,  750);
      ip             = attackerIp;
      protocol       = pick(['UDP','TCP-SYN','TCP-SYN','ICMP']);

    } else if (scenario === 'BRUTEFORCE') {
      // SSH dictionary attack — moderate pkt/s, very high conn/sec from one IP
      rate           = clamp(jitter(145,  0.22), 80,  230);
      packetSize     = clamp(jitter(260,  0.18), 180, 360);
      connectionRate = clamp(jitter(90,   0.28), 40,  185);
      ip             = attackerIp;
      protocol       = 'SSH';

    } else if (scenario === 'ANOMALY') {
      // Insider threat / misconfiguration — gradual 1→3.5× drift
      const drift    = 1 + progress * 2.5;
      rate           = clamp(jitter(265 * drift,       0.12), 265,  1100);
      packetSize     = clamp(jitter(480 + progress*320, 0.12), 300, 1514);
      connectionRate = clamp(jitter(8   + progress*22,  0.20), 6,    40);
      ip             = pick(LEGIT_IPS.slice(0, 12));  // internal origin
      protocol       = pick(['HTTPS','FTP','FTP','UNKNOWN']);

    } else { // RECOVERY
      const decay    = 1 - progress;
      rate           = clamp(jitter(recoverRate * decay + 220 * (1 - decay), 0.12), 60, recoverRate);
      packetSize     = clamp(jitter(520, 0.20), 250, 1200);
      connectionRate = clamp(jitter(6,   0.40), 1,   14);
      ip             = pick(LEGIT_IPS);
      protocol       = pick(['HTTPS','HTTP','DNS']);
    }

    // bandwidth (Kbps) = pkt/s × bytes/pkt × 8 bits/byte ÷ 1000
    const bandwidth = Math.round((rate * packetSize * 8) / 1000);

    const log = new TrafficLog({ ip, protocol, packetSize, rate, bandwidth, connectionRate });
    await log.save();

    const { status, alertId, probability, mode } = await detect({ ...log.toObject(), scenario });

    io.emit('trafficUpdate',  { timestamp: new Date(), ip, protocol, packetSize, rate, bandwidth, connectionRate, scenario, mode });
    io.emit('detectionUpdate',{ ...log.toObject(), status, alertId, probability, mode, scenario });
  }, 1000);
}

module.exports = startSimulator;