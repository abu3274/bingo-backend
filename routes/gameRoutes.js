const express = require('express'); 
const router = express.Router();
const Game = require('../models/Game');
const Player = require('../models/Player');

// Create a new game (SHARED)
// ✅ WORKING /create route using real MongoDB logic
router.post('/create', async (req, res) => {
  const SHARED_GAME_ID = "688295a92553cb2b59293ba5"; // Hardcoded shared ID

  try {
    let game = await Game.findById(SHARED_GAME_ID);

    if (!game) {
      game = new Game({
        _id: SHARED_GAME_ID,
        players: [],
        calledNumbers: [],
        currentNumber: null,
        status: 'waiting'
      });

      await game.save();
      console.log("✅ Created shared game");
    } else {
      console.log("♻️ Shared game already exists");
    }

    res.json({ success: true, gameId: game._id });
  } catch (error) {
    console.error('[Create Shared Game] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔐 All players join the same shared game
router.post('/join', async (req, res) => {
  const { telegramId, card } = req.body;
  const SHARED_GAME_ID = "688295a92553cb2b59293ba5";

  if (!telegramId || !card) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const game = await Game.findById(SHARED_GAME_ID);
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

// 🔐 Join shared game with real Player model
router.post('/join', async (req, res) => {
  const { telegramId, name, card } = req.body;
  const SHARED_GAME_ID = "688295a92553cb2b59293ba5";

  if (!telegramId || !card || !name) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    let player = await Player.findOne({ telegramId });

    if (!player) {
      player = new Player({
        telegramId,
        name,
        card,
        marked: [],
        wallet: 30,
        gameId: SHARED_GAME_ID
      });
      await player.save();
    }

    let game = await Game.findById(SHARED_GAME_ID);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const alreadyJoined = game.players.some(p => p.toString() === player._id.toString());

    if (!alreadyJoined) {
      game.players.push(player._id);
      await game.save();
    }

    res.json({ success: true, game });
  } catch (error) {
    console.error('[Game Join] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
