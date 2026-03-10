const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { validationResult } = require('express-validator');

const authRoutes = require('./routes/auth');
const trafficRoutes = require('./routes/traffic');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // allow cookies to be sent cross-origin
}));
app.use(express.json());
app.use(cookieParser()); // parse HTTP-Only cookies from requests

app.use('/api/auth', authRoutes);
app.use('/api', trafficRoutes);

// Rate limiting (cybersec: prevent brute-force)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
});
app.use(limiter);

// Error handler for validation
app.use((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
});

// Routes placeholder
app.get('/', (req, res) => res.send('Server running'));

module.exports = app;