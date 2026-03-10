require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const startSimulator = require('./services/simulator');
const socketio = require('socket.io');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] }
});

// Start traffic simulator once Socket.io is initialized
startSimulator(io);

connectDB();

// Socket.io placeholder
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

server.listen(PORT, () => console.log(`Server on port ${PORT}`));