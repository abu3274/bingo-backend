const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  telegramId: String,
  name: String,
  card: [[mongoose.Schema.Types.Mixed]],
  wallet: { type: Number, default: 30 },
  marked: [Number],
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
});

module.exports = mongoose.model('Player', PlayerSchema);
