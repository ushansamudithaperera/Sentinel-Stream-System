const mongoose    = require('mongoose');
const TrafficLog  = require('../models/TrafficLog');
const Alert       = require('../models/Alert');
const AuthAttempt = require('../models/AuthAttempt');
const Blacklist   = require('../models/Blacklist');
const { detect }  = require('./detectionEngine');

// ─── Timing ───────────────────────────────────────────────────────────────────
const INTERVAL_MS     = 2000;   // emit every 2 s
const CYCLE_MS        = 60000;  // full loop: 60 s
const NORMAL_PHASE_MS = 50000;  // 0–50 s → Normal  |  50–60 s → Attack

// ─── IP Pools ─────────────────────────────────────────────────────────────────
const ATTACKER_IPS = [
  '45.33.32.156', '198.51.100.42', '203.0.113.99',  '185.220.101.56',
  '104.21.14.80', '89.248.167.131','196.52.43.27',  '193.32.162.55',
];
const LEGIT_IPS = [
  ...Array.from({ length: 12 }, (_, i) => `10.0.1.${10 + i}`),
  '151.101.1.1', '151.101.65.1', '104.16.0.1', '104.17.0.1',
  '172.217.0.0', '142.250.0.0',
];

// ─── Brute-force injection constants ──────────────────────────────────────────
const BRUTE_IP         = '192.168.1.100';
const BRUTE_TOTAL      = 13;     // failed attempts per attack window
const BRUTE_LOCKOUT_AT = 10;     // lockout triggers at this attempt number
const BRUTE_USERNAMES  = ['admin', 'root', 'deploy', 'sysadmin', 'operator'];

// ─── Normal Profiles (time-of-day) ───────────────────────────────────────────
//   QUIET    : Off-peak hours  — 20–80   pkt/s,  <1 Mbps
//   MODERATE : Business hours  — 150–450 pkt/s, 1–2 Mbps
const NORMAL_PROFILES = {
  QUIET: {
    label: 'QUIET',
    rateMin: 20,  rateMax: 80,
    bwMin:  100,  bwMax:  900,
    connMin: 2,   connMax: 8,
    protocols: ['HTTPS', 'DNS', 'HTTP'],
  },
  MODERATE: {
    label: 'MODERATE',
    rateMin: 150, rateMax: 450,
    bwMin:  1000, bwMax:  2000,
    connMin: 5,   connMax: 20,
    protocols: ['HTTPS', 'HTTPS', 'HTTP', 'DNS'],
  },
};

// ─── Attack Scenarios (one randomly selected each 10 s attack window) ────────
//   BRUTEFORCE : 600–900   pkt/s, 1–2 Mbps,   high conn/sec (60–100), SSH
//   ANOMALY    : 1500–3000 pkt/s, 4–6 Mbps,   unknown protocol
//   DDOS       : 10k–20k   pkt/s, 15–25 Mbps, volumetric flood
const ATTACK_SCENARIOS = [
  {
    label:       'BRUTEFORCE',
    alertType:   'BruteForce',
    rateMin:     600,   rateMax:  900,
    bwMin:      1000,   bwMax:   2000,
    connMin:      60,   connMax:  100,
    pktMin:      100,   pktMax:   350,
    protocols:   ['SSH', 'SSH', 'SSH', 'TCP'],
    probability: 94,
  },
  {
    label:       'ANOMALY',
    alertType:   'Anomaly',
    rateMin:    1500,   rateMax:  3000,
    bwMin:      4000,   bwMax:   6000,
    connMin:      30,   connMax:    80,
    pktMin:      150,   pktMax:   500,
    protocols:   ['Unknown', 'Unknown', 'Unknown'],
    probability: 91,
  },
  {
    label:       'DDOS',
    alertType:   'DDoS',
    rateMin:   10000,   rateMax: 20000,
    bwMin:     15000,   bwMax:  25000,
    connMin:     400,   connMax:  1400,
    pktMin:       64,   pktMax:   512,
    protocols:   ['UDP', 'TCP-SYN', 'TCP-SYN', 'ICMP', 'UDP'],
    probability: 99,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pick(arr)        { return arr[Math.floor(Math.random() * arr.length)]; }
function jitter(base, n)  { return base + (Math.random() + Math.random() - 1) * base * n; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(v))); }
function rand(lo, hi)     { return clamp(jitter((lo + hi) / 2, 0.18), lo, hi); }
function isDbReady()      { return mongoose.connection.readyState === 1; }

// Dynamic severity based on where the generated rate falls within [rateMin, rateMax]
//   Bottom third → Low  |  Middle third → Medium  |  Top third → High
function computeSeverity(rate, atk) {
  const range = atk.rateMax - atk.rateMin;
  const pct   = (rate - atk.rateMin) / (range || 1);
  if (pct < 0.33) return 'Low';
  if (pct < 0.66) return 'Medium';
  return 'High';
}

// ─── Time-of-day normal profile ───────────────────────────────────────────────
function getNormalProfile() {
  const hour = new Date().getHours();
  return (hour >= 8 && hour < 18) ? NORMAL_PROFILES.MODERATE : NORMAL_PROFILES.QUIET;
}

// ─── Simulator ────────────────────────────────────────────────────────────────
function startSimulator(io) {
  let lastAttackCycleId = -1;   // which 60 s cycle last wrote an Alert to DB
  let currentAttack     = null; // attack scenario locked in for the active 10 s window
  let attackerIp        = pick(ATTACKER_IPS);

  // Brute-force injection state (reset each cycle)
  let bfAttemptCount = 0;
  let bfLockoutFired = false;
  let lastBfCycleId  = -1;

  setInterval(async () => {
    const now        = Date.now();
    const cycleId    = Math.floor(now / CYCLE_MS);
    const cyclePos   = now % CYCLE_MS;
    const isAttack   = cyclePos >= NORMAL_PHASE_MS;
    const isNewCycle = isAttack && (cycleId !== lastAttackCycleId);

    // ── Attack Phase (10 s) ──────────────────────────────────────────────────
    if (isAttack) {
      // On the FIRST tick of a new attack window: lock in scenario + attacker
      if (isNewCycle) {
        currentAttack     = pick(ATTACK_SCENARIOS);
        lastAttackCycleId = cycleId;
        attackerIp        = pick(ATTACKER_IPS);
      }

      const atk            = currentAttack;
      const rate           = rand(atk.rateMin, atk.rateMax);
      const severity       = computeSeverity(rate, atk);
      const bandwidth      = rand(atk.bwMin,   atk.bwMax);
      const packetSize     = rand(atk.pktMin,  atk.pktMax);
      const connectionRate = rand(atk.connMin, atk.connMax);
      const protocol       = pick(atk.protocols);
      const ip             = attackerIp;
      const bwLabel        = bandwidth >= 1000
        ? `${(bandwidth / 1000).toFixed(1)} Mbps`
        : `${bandwidth} Kbps`;

      // Save TrafficLog every tick so the chart has continuous data points
      if (isDbReady()) {
        try {
          await new TrafficLog({ ip, protocol, packetSize, rate, bandwidth, connectionRate }).save();
        } catch (e) {
          console.error('[simulator] TrafficLog save error:', e.message);
        }
      }

      // Save ONE Alert and emit detectionUpdate ONLY on the first tick of this cycle
      // This ensures MongoDB gets exactly 1 document per attack event, not 5.
      if (isNewCycle && isDbReady()) {
        try {
          const alert = await new Alert({
            type:     atk.alertType,
            severity,
            details:  `[${atk.label}] ${rate.toLocaleString()} pkt/s / ${bwLabel} from ${ip} — ${atk.probability}% certain`,
          }).save();

          // ── Auto-blacklist high-severity attacks ────────────────────────────
          if (severity === 'High') {
            try {
              await new Blacklist({
                ip,
                reason:     `Auto-blacklisted: ${atk.label} attack — ${severity} severity, ${rate.toLocaleString()} pkt/s`,
                attackType: atk.alertType,
                severity,
                alertId:    alert._id,
              }).save();
            } catch (blErr) {
              console.error('[simulator] Blacklist save error:', blErr.message);
            }
          }

          io.emit('detectionUpdate', {
            ip, protocol, packetSize, rate, bandwidth, connectionRate,
            status:      'Malicious',
            alertId:     alert._id,
            probability: atk.probability,
            mode:        'active',
            scenario:    atk.label,
            attackType:  atk.label,
            severity,
          });
        } catch (e) {
          console.error('[simulator] Alert save error:', e.message);
        }
      }

      // ── Brute-force injection during BRUTEFORCE phase ──────────────────────
      if (atk.label === 'BRUTEFORCE' && isDbReady()) {
        // Reset brute-force state on cycle change
        if (cycleId !== lastBfCycleId) {
          bfAttemptCount = 0;
          bfLockoutFired = false;
          lastBfCycleId  = cycleId;
        }

        // Inject 2-3 failed JWT login attempts per tick (up to BRUTE_TOTAL)
        const batch = Math.min(2 + Math.floor(Math.random() * 2), BRUTE_TOTAL - bfAttemptCount);
        for (let i = 0; i < batch; i++) {
          bfAttemptCount++;
          try {
            await new AuthAttempt({
              ip:        BRUTE_IP,
              email:     `${pick(BRUTE_USERNAMES)}@target.local`,
              success:   false,
              timestamp: new Date(),
            }).save();
          } catch (e) {
            console.error('[simulator] AuthAttempt save error:', e.message);
          }

          // Lockout trigger
          if (bfAttemptCount >= BRUTE_LOCKOUT_AT && !bfLockoutFired) {
            bfLockoutFired = true;
            try {
              const lockoutAlert = await new Alert({
                type:     'BruteForce',
                severity: 'High',
                details:  `[LOCKOUT] ${bfAttemptCount} failed logins from ${BRUTE_IP} — account locked`,
              }).save();

              await new Blacklist({
                ip:        BRUTE_IP,
                reason:    `Brute-force lockout: ${bfAttemptCount} failed login attempts`,
                attackType:'BruteForce',
                severity:  'High',
                alertId:   lockoutAlert._id,
              }).save();

              io.emit('securityAlert', {
                type:      'BRUTE_FORCE_LOCKOUT',
                ip:        BRUTE_IP,
                attempts:  bfAttemptCount,
                alertId:   lockoutAlert._id,
                timestamp: new Date(),
              });
            } catch (e) {
              console.error('[simulator] Lockout save error:', e.message);
            }
          }
        }
      }

      // trafficUpdate every tick for live chart continuity
      io.emit('trafficUpdate', {
        timestamp: new Date(),
        ip, protocol, packetSize, rate, bandwidth, connectionRate,
        scenario:   atk.label,
        attackType: atk.label,
        mode:       'active',
        severity,
      });

    // ── Normal Phase (50 s) ──────────────────────────────────────────────────
    } else {
      const profile        = getNormalProfile();
      const rate           = rand(profile.rateMin, profile.rateMax);
      const bandwidth      = rand(profile.bwMin,   profile.bwMax);
      const packetSize     = clamp(jitter(700, 0.20), 400, 1200);
      const connectionRate = rand(profile.connMin,  profile.connMax);
      const protocol       = pick(profile.protocols);
      const ip             = pick(LEGIT_IPS);

      if (isDbReady()) {
        try {
          await new TrafficLog({ ip, protocol, packetSize, rate, bandwidth, connectionRate }).save();
        } catch (e) {
          console.error('[simulator] TrafficLog save error:', e.message);
        }
      }

      // Run EWMA/Z-score detection on normal traffic — may fire for real anomalies
      const { status, alertId, probability, mode } = isDbReady()
        ? await detect({ ip, protocol, packetSize, rate, bandwidth, connectionRate, scenario: profile.label })
        : { status: 'Safe', alertId: null, probability: 0, mode: 'learning' };

      io.emit('trafficUpdate', {
        timestamp: new Date(), ip, protocol, packetSize, rate, bandwidth, connectionRate,
        scenario: profile.label, mode,
      });
      io.emit('detectionUpdate', {
        ip, protocol, packetSize, rate, bandwidth, connectionRate,
        status, alertId, probability, mode, scenario: profile.label,
      });
    }
  }, INTERVAL_MS);
}

module.exports = startSimulator;
