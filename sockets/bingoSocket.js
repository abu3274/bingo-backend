const { generateCard, checkWin } = require('../utils/bingoLogic');
const Game = require('../models/Game');
const Player = require('../models/Player');

const activeGames = {}; // In-memory storage to track active game states (call history etc.)

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // Join game
    socket.on('join_game', async ({ gameId, playerId }) => {
      try {
        const game = await Game.findById(gameId);
        const player = await Player.findById(playerId);
        if (!game || !player) return;

        socket.join(gameId);
        console.log(`🧑 Player ${player.name} joined game ${gameId}`);

        // Add player to active memory game state
        if (!activeGames[gameId]) {
          activeGames[gameId] = {
            calledNumbers: new Set(),
            players: {},
            status: 'waiting',
          };
        }

        activeGames[gameId].players[playerId] = {
          socketId: socket.id,
          card: player.card,
          marks: [],
          hasWon: false,
        };

        io.to(gameId).emit('player_joined', { playerId, playerName: player.name });
      } catch (err) {
        console.error('❌ join_game error:', err);
      }
    });

    // Mark a number on player card
    socket.on('mark_number', ({ gameId, playerId, number }) => {
      const game = activeGames[gameId];
      if (!game || !game.players[playerId]) return;

      const player = game.players[playerId];
      if (player.hasWon) return;

      if (!player.marks.includes(number)) {
        player.marks.push(number);
      }

      // Check win
      const result = checkWin(player.card, new Set([...game.calledNumbers, ...player.marks]));
      if (result.isWin) {
        player.hasWon = true;
        io.to(gameId).emit('player_won', { playerId, winningLine: result.winningLine });
      }

      io.to(gameId).emit('player_marked', { playerId, number });
    });

    // Host calls next number
    socket.on('call_number', ({ gameId }) => {
      const game = activeGames[gameId];
      if (!game) return;

      let newNumber;
      do {
        newNumber = Math.floor(Math.random() * 75) + 1;
      } while (game.calledNumbers.has(newNumber));

      game.calledNumbers.add(newNumber);
      io.to(gameId).emit('number_called', { number: newNumber });
    });

    // Player leaves
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      // You can loop through activeGames to remove player if needed
    });
  });
};
