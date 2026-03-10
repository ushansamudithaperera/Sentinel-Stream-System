const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['DDoS', 'BruteForce', 'Anomaly'] },
  severity: { type: String, enum: ['Low', 'Medium', 'High'] },
  details: { type: String },
});

module.exports = mongoose.model('Alert', alertSchema);