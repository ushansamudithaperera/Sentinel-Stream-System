const Alert = require('../models/Alert');

// ─── Configuration ────────────────────────────────────────────────────────────
const LEARNING_DURATION = 5 * 60 * 1000; // 5-minute baseline learning phase
const WINDOW_SIZE = 300;                  // up to 300 samples (~5 min at 1/sec)
const EWMA_ALPHA = 0.05;                  // slow smoothing for a stable baseline
const DDOS_MULTIPLIER = 5;               // 500% above baseline triggers DDoS alert

// ─── State ────────────────────────────────────────────────────────────────────
const rateWindow = [];
let learningStartTime = null;
let ewma = null;

// Dynamic thresholds — nudged by admin feedback to tune model sensitivity
let dynamicDDoSMultiplier     = DDOS_MULTIPLIER;
let dynamicZScoreThreshold    = 3.0;
let dynamicDeviationThreshold = 0.8;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isLearning() {
  if (!learningStartTime) return true;
  return (Date.now() - learningStartTime) < LEARNING_DURATION;
}

function getMode() {
  return isLearning() ? 'learning' : 'active';
}

function calculateRollingStats(dataWindow) {
  if (dataWindow.length === 0) return { avg: 0, stdDev: 0 };
  const sum = dataWindow.reduce((a, b) => a + b, 0);
  const avg = sum / dataWindow.length;
  const variance = dataWindow.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / dataWindow.length;
  return { avg, stdDev: Math.sqrt(variance) };
}

function updateEWMA(rate) {
  ewma = ewma === null ? rate : EWMA_ALPHA * rate + (1 - EWMA_ALPHA) * ewma;
}

function clampProb(val) {
  return Math.min(99, Math.max(1, Math.round(val)));
}

// ─── Main detection ───────────────────────────────────────────────────────────
async function detect(traffic) {
  if (!learningStartTime) learningStartTime = Date.now();

  rateWindow.push(traffic.rate);
  if (rateWindow.length > WINDOW_SIZE) rateWindow.shift();
  updateEWMA(traffic.rate);

  const mode = getMode();

  // During learning mode: collect baseline only, never alert
  if (mode === 'learning') {
    return { status: 'Learning', alertId: null, probability: 0, mode };
  }

  const { avg, stdDev } = calculateRollingStats(rateWindow);

  // 1. DDoS: rate spikes above dynamically-tuned multiplier (admin-adjustable)
  if (avg > 0 && traffic.rate > avg * dynamicDDoSMultiplier) {
    const ratio = traffic.rate / avg;
    const probability = clampProb((ratio / dynamicDDoSMultiplier) * 85 + 14);
    const saved = await new Alert({
      type: 'DDoS',
      severity: 'High',
      details: `Rate ${traffic.rate} is ${ratio.toFixed(1)}x above baseline avg ${avg.toFixed(0)} — ${probability}% certain: DDoS Attack`,
    }).save();
    return { status: 'Malicious', alertId: saved._id, probability, mode };
  }

  // 2. Statistical Z-score anomaly (needs ≥30 samples for reliability)
  if (rateWindow.length >= 30 && stdDev > 0) {
    const zScore = (traffic.rate - avg) / stdDev;
    if (zScore > dynamicZScoreThreshold) {
      const probability = clampProb(Math.min(zScore / 6, 1) * 85 + 14);
      const saved = await new Alert({
        type: 'Anomaly',
        severity: 'Medium',
        details: `Z-score ${zScore.toFixed(2)} — ${probability}% certain: Statistical Anomaly`,
      }).save();
      return { status: 'Suspicious', alertId: saved._id, probability, mode };
    }
  }

  // 3. EWMA zero-day: unseen pattern deviates from learned baseline
  if (ewma !== null) {
    const deviation = Math.abs(traffic.rate - ewma);
    const deviationRatio = deviation / Math.max(ewma, 1);
    if (deviationRatio > dynamicDeviationThreshold) {
      const probability = clampProb(Math.min(deviationRatio, 1) * 85 + 14);
      const saved = await new Alert({
        type: 'Anomaly',
        severity: 'High',
        details: `Pattern deviation ${(deviationRatio * 100).toFixed(0)}% above EWMA baseline — ${probability}% certain: Zero-Day Anomaly`,
      }).save();
      return { status: 'Malicious', alertId: saved._id, probability, mode };
    }
  }

  return { status: 'Safe', alertId: null, probability: 0, mode };
}

// Admin feedback — tightens or relaxes thresholds based on confirmed/false-positive actions
function applyFeedback(action, type) {
  if (action === 'block') {
    // Confirmed real threat → tighten sensitivity (lower thresholds)
    if (type === 'DDoS') {
      dynamicDDoSMultiplier = parseFloat(Math.max(2.0, dynamicDDoSMultiplier - 0.2).toFixed(2));
    } else {
      dynamicZScoreThreshold    = parseFloat(Math.max(1.5, dynamicZScoreThreshold - 0.1).toFixed(2));
      dynamicDeviationThreshold = parseFloat(Math.max(0.3, dynamicDeviationThreshold - 0.05).toFixed(2));
    }
  } else {
    // False positive → relax sensitivity (raise thresholds)
    if (type === 'DDoS') {
      dynamicDDoSMultiplier = parseFloat(Math.min(12.0, dynamicDDoSMultiplier + 0.2).toFixed(2));
    } else {
      dynamicZScoreThreshold    = parseFloat(Math.min(8.0, dynamicZScoreThreshold + 0.1).toFixed(2));
      dynamicDeviationThreshold = parseFloat(Math.min(2.0, dynamicDeviationThreshold + 0.05).toFixed(2));
    }
  }
}

function getModelStats() {
  return {
    ddosMultiplier: dynamicDDoSMultiplier,
    zScoreThreshold: dynamicZScoreThreshold,
    deviationThreshold: dynamicDeviationThreshold,
    mode: getMode(),
  };
}

module.exports = { detect, getMode, applyFeedback, getModelStats };