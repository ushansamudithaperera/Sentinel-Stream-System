const mongoose = require('mongoose');

const trafficLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ip: { type: String },
  protocol: { type: String },
  packetSize: { type: Number },
  rate: { type: Number },
});

module.exports = mongoose.model('TrafficLog', trafficLogSchema);