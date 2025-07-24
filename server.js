const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require("cors");
const playerRoutes = require('./routes/playerRoutes');
const gameRoutes = require('./routes/gameRoutes');
const bingoSocket = require('./sockets/bingoSocket');

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://your-frontend-domain.com" // Replace with your production frontend URL
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// Setup HTTP server
const server = http.createServer(app);

// Setup Socket.IO server with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bingo')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// Setup routes
app.use('/api/player', playerRoutes);
app.use('/api/game', gameRoutes);

// Setup socket handlers
io.on('connection', (socket) => {
  bingoSocket(io, socket);
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
