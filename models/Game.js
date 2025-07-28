const mongoose = require('mongoose');

const PlayerSubSchema = new mongoose.Schema({
  telegramId: String,
  card: [Number],
}, { _id: false });

const GameSchema = new mongoose.Schema({
  players: [PlayerSubSchema],
  calledNumbers: [Number],
  currentNumber: Number,
  status: { type: String, enum: ['waiting', 'shuffling', 'started', 'completed'], default: 'waiting' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', GameSchema);
