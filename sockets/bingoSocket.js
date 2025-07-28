const GameEngine = require('../gameEngine');
const { MockPlayerModel } = require('../mockData');
let gameEngine = null;

module.exports = (io) => {
  // Initialize the game engine once for the whole server
  if (!gameEngine) {
    gameEngine = new GameEngine(io);
    gameEngine.initialize().catch(err => {
      console.error("Failed to initialize game engine:", err);
    });
  }

  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // Send current game state to new connections
    if (gameEngine.gameState) {
      socket.emit('game_state_update', {
        status: gameEngine.gameState.status,
        calledNumbers: [...gameEngine.gameState.calledNumbers],
        currentNumber: gameEngine.gameState.currentNumber
      });
    }

    // Register a player with Telegram data
    socket.on('register_player', async ({ telegramId, name }) => {
      // Create mock player if not exists
      console.log(`Registering player: ${name} (${telegramId})`);
      
      // Generate a unique ID based on telegramId
      const playerId = `player_${telegramId}`;
      
      // Register the player with a random bingo card
      const playerData = {
        telegramId,
        name,
        card: generateCard(),
        wallet: 30,
        marked: [],
        gameId: "688295a92553cb2b59293ba5"
      };
      
      MockPlayerModel.registerPlayer(playerId, playerData);
      
      // Return the player ID and card to the client
      socket.emit('player_registered', {
        playerId,
        playerCard: playerData.card
      });
    });

    // 🔗 Player joins the shared game
    socket.on('join_game', async (data) => {
      await gameEngine.playerJoined(socket, data);
    });

    // ✅ Player marks a number on their card
    socket.on('mark_number', async (data) => {
      await gameEngine.playerMarkedNumber(socket, data);
    });

    // 🎱 Call next number manually (for admin/testing)
    socket.on('call_number', async () => {
      await gameEngine.callNextNumber();
    });

    // ❌ Cleanup on disconnect
    socket.on('disconnect', () => {
      gameEngine.playerDisconnected(socket);
    });
  });
};