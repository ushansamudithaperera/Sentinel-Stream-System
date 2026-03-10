const mongoose = require('mongoose');

const trafficLogSchema = new mongoose.Schema({
  timestamp:      { type: Date,   default: Date.now },
  ip:             { type: String },
  protocol:       { type: String },
  packetSize:     { type: Number },  // bytes per packet (B)
  rate:           { type: Number },  // packets per second (pkt/s)
  bandwidth:      { type: Number },  // Kbps  = rate × packetSize × 8 / 1000
  connectionRate: { type: Number },  // TCP connections per second from this IP
});

module.exports = mongoose.model('TrafficLog', trafficLogSchema);