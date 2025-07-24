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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bingo')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

app.use(cors());
app.use(express.json());

// ✅ Route usage (these must be routers)
app.use('/api/player', playerRoutes);
app.use('/api/game', gameRoutes);

// ✅ Pass socket.io to bingoSocket handler
io.on('connection', (socket) => {
  bingoSocket(io, socket);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
