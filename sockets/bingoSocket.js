const { checkWin } = require('../utils/bingoLogic');
const Game = require('../models/Game');
const Player = require('../models/Player');

const SHARED_GAME_ID = '688295a92553cb2b59293ba5'; // 🔒 Always use this shared room
const activeGames = {}; // In-memory session cache

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // 🔗 Player joins the shared game
    socket.on('join_game', async ({ playerId }) => {
      try {
        const gameId = SHARED_GAME_ID;
        const game = await Game.findById(gameId);
        const player = await Player.findById(playerId);

        if (!game || !player) {
          console.warn('🚫 Game or Player not found');
          return;
        }

        socket.join(gameId);
        console.log(`🧑 Player ${player.name} joined game ${gameId}`);

        // ✅ Initialize game state in memory from MongoDB once
        if (!activeGames[gameId]) {
          activeGames[gameId] = {
            calledNumbers: new Set(game.calledNumbers),
            players: {},
            status: game.status,
          };
        }

        // 💾 Track player session
        activeGames[gameId].players[playerId] = {
          socketId: socket.id,
          card: player.card,
          marks: player.marked || [],
          hasWon: false,
        };

        io.to(gameId).emit('player_joined', { playerId, playerName: player.name });
      } catch (err) {
        console.error('❌ join_game error:', err);
      }
    });

    // ✅ Player marks a number on their card
    socket.on('mark_number', async ({ playerId, number }) => {
      const gameId = SHARED_GAME_ID;
      const game = activeGames[gameId];
      if (!game || !game.players[playerId]) return;

      const player = game.players[playerId];
      if (player.hasWon || player.marks.includes(number)) return;

      player.marks.push(number);

      // Optional: update DB marked numbers
      try {
        await Player.findByIdAndUpdate(playerId, {
          $addToSet: { marked: number }
        });
      } catch (err) {
        console.error("❌ Error updating marked numbers:", err);
      }

      // 🏆 Check for win
      const result = checkWin(player.card, new Set([...game.calledNumbers, ...player.marks]));
      if (result.isWin) {
        player.hasWon = true;
        io.to(gameId).emit('player_won', { playerId, winningLine: result.winningLine });
      }

      io.to(gameId).emit('player_marked', { playerId, number });
    });

    // 🎱 Host calls the next number
    socket.on('call_number', async () => {
      const gameId = SHARED_GAME_ID;
      const game = activeGames[gameId];
      if (!game) return;

      let newNumber;
      do {
        newNumber = Math.floor(Math.random() * 75) + 1;
      } while (game.calledNumbers.has(newNumber));

      game.calledNumbers.add(newNumber);
      io.to(gameId).emit('number_called', { number: newNumber });

      // 💾 Save to MongoDB
      try {
        const dbGame = await Game.findById(gameId);
        dbGame.calledNumbers = [...game.calledNumbers];
        dbGame.currentNumber = newNumber;
        await dbGame.save();
      } catch (err) {
        console.error("❌ Failed to persist called number:", err);
      }
    });

    // ❌ Cleanup on disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      // Optional: remove player socket mapping if needed
    });
  });
};
