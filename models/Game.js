const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameCode: String,
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  calledNumbers: [Number],
  status: { type: String, enum: ['waiting', 'shuffling', 'started', 'completed'], default: 'waiting' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', GameSchema);
