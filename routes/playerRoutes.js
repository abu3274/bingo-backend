const express = require('express');
const { verifyTelegramInitData } = require('../utils/verifyTelegramInitData.js');
const Player = require('../models/Player.js');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { initData } = req.body;

  const user = verifyTelegramInitData(initData);

  if (!user) {
    return res.status(401).json({ error: 'Invalid Telegram initData' });
  }

  try {
    let player = await Player.findOne({ telegramId: user.id });

    if (!player) {
      player = new Player({
        telegramId: user.id,
        username: user.username || '',
        firstName: user.first_name || '',
        wallet: 100,
      });
      await player.save();
    }

    res.json({ playerId: player._id, wallet: player.wallet, username: player.username });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

module.exports = router;
