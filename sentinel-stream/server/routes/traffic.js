const express = require('express');
const { protect, admin } = require('../middlewares/auth');
const Alert = require('../models/Alert');
const { getMode } = require('../services/detectionEngine');

const router = express.Router();

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

module.exports = router;