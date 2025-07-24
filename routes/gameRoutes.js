const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const Player = require('../models/Player');

// Create a new game
router.post('/create', async (req, res) => {
  try {
const SHARED_GAME_ID = "64a9bc3f2e123abc456def78";
res.json({ success: true, gameId: SHARED_GAME_ID });
// Join an existing game
router.post('/join', async (req, res) => {
  const { gameId, telegramId, card } = req.body;

  if (!gameId || !telegramId || !card) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const game = await Game.findById(gameId);
    const player = await Player.findOne({ telegramId });

    if (!game || !player) {
      return res.status(404).json({ error: 'Game or Player not found' });
    }

    const alreadyJoined = game.players.some(p => p.telegramId === telegramId);

    if (!alreadyJoined) {
      game.players.push({ telegramId, card });
      await game.save();
    }

    res.json({ success: true, game });
  } catch (error) {
    console.error('[Game Join] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get game status
router.get('/:gameId/status', async (req, res) => {
  const { gameId } = req.params;

  try {
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      success: true,
      status: game.status,
      currentNumber: game.currentNumber,
      calledNumbers: game.calledNumbers,
      players: game.players.length,
    });
  } catch (error) {
    console.error('[Game Status] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Call the next number
router.post('/:gameId/call', async (req, res) => {
  const { gameId } = req.params;

  try {
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.calledNumbers.length >= 75) {
      return res.status(400).json({ error: 'All numbers have been called' });
    }

    let nextNumber;
    const usedNumbers = new Set(game.calledNumbers);

    do {
      nextNumber = Math.floor(Math.random() * 75) + 1;
    } while (usedNumbers.has(nextNumber));

    game.calledNumbers.push(nextNumber);
    game.currentNumber = nextNumber;
    await game.save();

    res.json({ success: true, nextNumber });
  } catch (error) {
    console.error('[Game Call] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
