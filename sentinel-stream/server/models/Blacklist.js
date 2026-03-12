const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  ip:        { type: String, required: true },
  reason:    { type: String },
  attackType:{ type: String, enum: ['DDoS', 'BruteForce', 'Anomaly'] },
  severity:  { type: String, enum: ['Low', 'Medium', 'High'] },
  alertId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Alert' },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Blacklist', blacklistSchema);
