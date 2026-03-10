const mongoose = require('mongoose');

const authAttemptSchema = new mongoose.Schema({
  ip: { type: String },
  timestamp: { type: Date, default: Date.now },
  success: { type: Boolean },
});

module.exports = mongoose.model('AuthAttempt', authAttemptSchema);