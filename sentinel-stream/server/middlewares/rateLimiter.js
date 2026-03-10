const AuthAttempt = require('../models/AuthAttempt');
const Alert = require('../models/Alert');

const checkBruteForce = async (req, res, next) => {
  const ip = req.ip;
  try {
    const attempts = await AuthAttempt.find({
      ip,
      success: false,
      timestamp: { $gt: new Date(Date.now() - 30 * 1000) },
    });

    if (attempts.length >= 10) {
      // Save BruteForce alert to MongoDB (cybersec: permanent audit trail)
      await new Alert({
        type: 'BruteForce',
        severity: 'High',
        details: `${attempts.length} failed login attempts from IP ${ip} in the last 30 seconds`,
      }).save().catch(() => {});

      return res.status(429).json({ msg: 'Too many failed attempts. IP blocked.' });
    }
  } catch (err) {
    console.error('checkBruteForce error:', err);
  }
  next();
};

module.exports = checkBruteForce;