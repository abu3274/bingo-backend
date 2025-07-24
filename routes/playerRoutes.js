const express = require('express');
const { verifyTelegramInitData } = require('../utils/verifyTelegramInitData.js');
const Player = require('../models/Player.js');

const router = express.Router();

router.post('/create', async (req, res) => {
  const { telegramId, name } = req.body;

  if (!telegramId || !name) {
    return res.status(400).json({ error: 'Missing telegramId or name' });
  }

  try {
    let player = await Player.findOne({ telegramId });

    if (!player) {
      player = new Player({
        telegramId,
        username: '',
        firstName: name,
        wallet: 100,
      });
      await player.save();
    }

    res.json({ playerId: player._id, wallet: player.wallet });
  } catch (err) {
    console.error("[Player Create] Error:", err);
    res.status(500).json({ error: 'Player creation failed' });
  }
});


module.exports = router;
