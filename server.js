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
  "https://your-frontend-domain.com", // Replace with your production frontend URL
  "https://t.me", // Allow Telegram WebApp connections
  "https://web.telegram.org"
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed or if it starts with Telegram domains
    if (allowedOrigins.includes(origin) || 
        origin.startsWith("https://t.me") || 
        origin.startsWith("https://web.telegram.org")) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// Setup HTTP server
const server = http.createServer(app);

// Setup Socket.IO server with CORS
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Same CORS policy as Express
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || 
          origin.startsWith("https://t.me") || 
          origin.startsWith("https://web.telegram.org")) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Skip MongoDB connection and use mock data instead
console.log('📝 Using mock data instead of MongoDB');

// Setup routes
app.use('/api/player', playerRoutes);
app.use('/api/game', gameRoutes);

// Setup socket handlers - pass io to the bingoSocket module
bingoSocket(io);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
