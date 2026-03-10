const TrafficLog = require('../models/TrafficLog');
const { detect } = require('./detectionEngine');

// Generate realistic traffic every second
function startSimulator(io) {
  setInterval(async () => {
    const isAttack = Math.random() < 0.1; // 10% chance of attack
    const packetSize = isAttack
      ? Math.floor(Math.random() * (100 - 80) + 80)
      : Math.floor(Math.random() * (20 - 10) + 10);
    const rate = isAttack ? packetSize * 10 : packetSize; // Amplify for DDoS sim
    const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const protocol = ['HTTP', 'FTP', 'SSH'][Math.floor(Math.random() * 3)];

    const log = new TrafficLog({ ip, protocol, packetSize, rate });
    await log.save();

    const { status, alertId, probability, mode } = await detect(log);
    // trafficUpdate → chart data only (no duplication with detectionUpdate)
    io.emit('trafficUpdate', { timestamp: new Date(), ip, protocol, packetSize, rate, mode });
    // detectionUpdate → alerts + probability (only consumed for non-Safe statuses)
    io.emit('detectionUpdate', { ...log.toObject(), status, alertId, probability, mode });
  }, 1000);
}

module.exports = startSimulator;