const User = require('../models/User');
const AuthAttempt = require('../models/AuthAttempt');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');

exports.register = [
  body('username').trim().escape(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const { username, password, role } = req.body;
    try {
      let user = await User.findOne({ username });
      if (user) return res.status(400).json({ msg: 'User exists' });

      user = new User({ username, password, role });
      await user.save();

      res.status(201).json({ msg: 'User created' });
    } catch (err) {
      console.error('Register error:', err);
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          msg: 'Validation error',
          errors: err.errors,
        });
      }
      if (err.code === 11000) {
        return res.status(400).json({ msg: 'User exists' });
      }
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
];

exports.login = [
  body('username').trim().escape(),
  body('password').exists(),
  async (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip;

    try {
      const user = await User.findOne({ username });
      if (!user || !(await user.matchPassword(password))) {
        await new AuthAttempt({ ip, success: false }).save();
        return res.status(401).json({ msg: 'Invalid credentials' });
      }

      await new AuthAttempt({ ip, success: true }).save();

      // JWT Access (short-lived)
      const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

      // Refresh (long-lived, HTTP-only cookie)
      const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });

      res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
      res.json({ msg: 'Logged in' });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
];

exports.refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ msg: 'No refresh token' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign({ id: decoded.id, role: decoded.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.json({ msg: 'Token refreshed' });
  } catch (err) {
    res.status(401).json({ msg: 'Invalid refresh token' });
  }
};