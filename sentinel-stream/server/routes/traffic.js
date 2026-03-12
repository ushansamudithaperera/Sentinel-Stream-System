const express = require('express');
const { protect, admin } = require('../middlewares/auth');
const Alert      = require('../models/Alert');
const TrafficLog = require('../models/TrafficLog');
const Blacklist  = require('../models/Blacklist');
const { getMode, applyFeedback, getModelStats } = require('../services/detectionEngine');

const router = express.Router();

// GET /api/threats/count — total unique threat records in the DB (auth required)
router.get('/threats/count', protect, async (req, res) => {
  try {
    const count = await Alert.countDocuments({});
    res.json({ count });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch threat count' });
  }
});

// GET /api/traffic/recent — last 25 traffic records to seed the live chart
router.get('/traffic/recent', protect, async (req, res) => {
  try {
    const records = await TrafficLog.find({}).sort({ timestamp: -1 }).limit(25).lean();
    res.json(records.reverse()); // oldest-first so the chart renders left-to-right
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch recent traffic' });
  }
});

// GET /api/logs — all alerts newest-first (admin only)
router.get('/logs', protect, admin, async (req, res) => {
  try {
    const logs = await Alert.find({}).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch logs' });
  }
});

// DELETE /api/logs — clear all alert logs (admin only)
router.delete('/logs', protect, admin, async (req, res) => {
  try {
    await Alert.deleteMany({});
    res.json({ msg: 'Logs cleared' });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to clear logs' });
  }
});

// GET /api/alerts/:id — single alert detail (admin only)
router.get('/alerts/:id', protect, admin, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ msg: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch alert' });
  }
});

// GET /api/system/mode — current detection mode (learning/active)
router.get('/system/mode', (req, res) => {
  res.json({ mode: getMode() });
});

// PATCH /api/alerts/:id/action — admin marks a threat as blocked or false positive
router.patch('/alerts/:id/action', protect, admin, async (req, res) => {
  const { action } = req.body;
  if (!['block', 'ignore'].includes(action)) {
    return res.status(400).json({ msg: 'Invalid action. Use "block" or "ignore".' });
  }
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ msg: 'Alert not found' });
    if (alert.adminAction !== 'pending') {
      return res.status(409).json({ msg: 'Action already taken on this alert.' });
    }
    alert.adminAction = action === 'block' ? 'blocked' : 'false_positive';
    await alert.save();
    applyFeedback(action, alert.type);
    res.json({ msg: `Alert marked as ${alert.adminAction}`, adminAction: alert.adminAction });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/system/model-stats — live AI sensitivity thresholds (admin only)
router.get('/system/model-stats', protect, admin, (req, res) => {
  res.json(getModelStats());
});

// GET /api/admin/blacklist — all blacklisted IPs (admin only)
router.get('/admin/blacklist', protect, admin, async (req, res) => {
  try {
    const entries = await Blacklist.find({}).sort({ timestamp: -1 }).lean();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch blacklist' });
  }
});

// GET /api/blocked-ips — IPs blocked via admin action (admin only)
router.get('/blocked-ips', protect, admin, async (req, res) => {
  try {
    const blocked = await Alert.find({ adminAction: 'blocked' }).sort({ timestamp: -1 }).lean();
    res.json(blocked);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch blocked IPs' });
  }
});

module.exports = router;