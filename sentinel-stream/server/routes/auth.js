const express = require('express');
const { register, login, refresh } = require('../controllers/authController');
const rateLimit = require('express-rate-limit');
const checkBruteForce = require('../middlewares/rateLimiter');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Rate limit auth routes (cybersec: prevent brute-force)
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, checkBruteForce, login);
router.post('/refresh', refresh);
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ msg: 'Logged out' });
});

// GET /api/auth/me — returns current user role for frontend RBAC
router.get('/me', protect, (req, res) => {
  res.json({ id: req.user.id, role: req.user.role });
});

module.exports = router;