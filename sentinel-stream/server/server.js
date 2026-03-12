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

// Socket.io connection logging
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// Connect to DB first, then start simulator so all DB writes are safe
connectDB().then(() => {
  startSimulator(io);
});

server.listen(PORT, () => console.log(`Server on port ${PORT}`));