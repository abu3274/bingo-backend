const { checkWin } = require('./utils/bingoLogic');
// Use mock data instead of MongoDB models
const { MockGameModel: Game, MockPlayerModel: Player, generateCard } = require('./mockData');
const sessionManager = require('./utils/sessionManager');

const SHARED_GAME_ID = '688295a92553cb2b59293ba5'; // Same shared game ID
const CALL_INTERVAL = 5000; // 5 seconds between number calls
const GAME_RESTART_DELAY = 10000; // 10 seconds between game cycles

class GameEngine {
  constructor(io) {
    this.io = io;
    this.gameState = {
      calledNumbers: new Set(),
      players: {},
      status: 'waiting',
      currentNumber: null,
      callTimer: null,
      isRunning: false
    };
  }

  async initialize() {
    try {
      // Load or create the shared game from DB
      let game = await Game.findById(SHARED_GAME_ID);
      
      if (!game) {
        game = new Game({
          _id: SHARED_GAME_ID,
          players: [],
          calledNumbers: [],
          currentNumber: null,
          status: 'waiting',
        });
        await game.save();
        console.log("✅ Created new shared game");
      } else {
        console.log("✅ Loaded existing shared game");
        
        // Initialize game state from database
        this.gameState.calledNumbers = new Set(game.calledNumbers);
        this.gameState.status = game.status;
        this.gameState.currentNumber = game.currentNumber;
      }

      // Always ensure game is in the correct state for continuous play
      if (this.gameState.status !== 'started') {
        await this.startNewGameCycle();
      } else {
        this.continueRunningGame();
      }

    } catch (err) {
      console.error("❌ Failed to initialize game engine:", err);
    }
  }

  async startNewGameCycle() {
    try {
      // Reset game state
      this.gameState.calledNumbers = new Set();
      this.gameState.currentNumber = null;
      
      // Update database
      const dbGame = await Game.findById(SHARED_GAME_ID);
      dbGame.calledNumbers = [];
      dbGame.currentNumber = null;
      dbGame.status = 'shuffling';
      await dbGame.save();
      
      this.gameState.status = 'shuffling';
      
      // Broadcast shuffling state
      this.io.emit('game_status_change', { status: 'shuffling' });
      
      console.log("🎲 Game entering shuffling phase");
      
      // Start the game after shuffling delay
      setTimeout(async () => {
        this.gameState.status = 'started';
        
        // Update database
        const dbGame = await Game.findById(SHARED_GAME_ID);
        dbGame.status = 'started';
        await dbGame.save();
        
        this.io.emit('game_status_change', { status: 'started' });
        console.log("▶️ Game started");
        
        // Start calling numbers
        this.startCallingNumbers();
      }, 9000); // 9-second shuffling phase
    } catch (err) {
      console.error("❌ Failed to start new game cycle:", err);
    }
  }

  continueRunningGame() {
    console.log("▶️ Continuing existing game with", this.gameState.calledNumbers.size, "called numbers");
    this.startCallingNumbers();
  }

  startCallingNumbers() {
    if (this.gameState.callTimer) {
      clearInterval(this.gameState.callTimer);
      this.gameState.callTimer = null;
    }
    
    // Ensure the game is marked as running
    this.gameState.isRunning = true;
    
    // Verify we're in the right state
    if (this.gameState.status !== 'started') {
      console.error(`Cannot start calling numbers when game status is ${this.gameState.status}`);
      return;
    }
    
    console.log("⏱️ Starting automatic number calling");
    
    // Call first number immediately if no numbers have been called
    if (this.gameState.calledNumbers.size === 0) {
      this.callNextNumber();
    }
    
    // Set interval for continued number calling
    this.gameState.callTimer = setInterval(() => {
      // Double check we're still in started state
      if (this.gameState.status === 'started') {
        this.callNextNumber();
      } else {
        console.log(`Pausing number calls - game status is ${this.gameState.status}`);
        // If game state has changed, clear interval
        if (this.gameState.callTimer) {
          clearInterval(this.gameState.callTimer);
          this.gameState.callTimer = null;
        }
      }
    }, CALL_INTERVAL);
    
    console.log(`🔄 Number calling timer set for every ${CALL_INTERVAL/1000} seconds`);
  }

  async callNextNumber() {
    try {
      // First verify the game is in 'started' state
      if (this.gameState.status !== 'started') {
        console.log(`Cannot call number when game status is ${this.gameState.status}, should be 'started'`);
        return;
      }
      
      // Check if we've called all 75 numbers
      if (this.gameState.calledNumbers.size >= 75) {
        this.completeGame();
        return;
      }
      
      // Generate a number that hasn't been called yet
      let newNumber;
      do {
        newNumber = Math.floor(Math.random() * 75) + 1;
      } while (this.gameState.calledNumbers.has(newNumber));
      
      // Add to called numbers
      this.gameState.calledNumbers.add(newNumber);
      this.gameState.currentNumber = newNumber;
      
      console.log(`🎱 Called number: ${newNumber} (Total: ${this.gameState.calledNumbers.size})`);
      
      // Broadcast to all clients
      this.io.emit('number_called', { 
        number: newNumber,
        totalCalled: this.gameState.calledNumbers.size 
      });
      
      // Save to database
      const dbGame = await Game.findById(SHARED_GAME_ID);
      dbGame.calledNumbers = [...this.gameState.calledNumbers];
      dbGame.currentNumber = newNumber;
      await dbGame.save();
    } catch (err) {
      console.error("❌ Failed to call next number:", err);
    }
  }

  async completeGame() {
    if (!this.gameState.isRunning) return;
    
    this.gameState.isRunning = false;
    
    if (this.gameState.callTimer) {
      clearInterval(this.gameState.callTimer);
      this.gameState.callTimer = null;
    }
    
    this.gameState.status = 'completed';
    
    // Update database
    try {
      const dbGame = await Game.findById(SHARED_GAME_ID);
      dbGame.status = 'completed';
      await dbGame.save();
    } catch (err) {
      console.error("❌ Failed to update game completion status:", err);
    }
    
    this.io.emit('game_status_change', { status: 'completed' });
    console.log("🏁 Game completed");
    
    // Schedule the next game after a delay
    setTimeout(() => {
      this.startNewGameCycle();
    }, GAME_RESTART_DELAY);
  }

  async playerJoined(socket, { playerId }) {
    try {
      const game = await Game.findById(SHARED_GAME_ID);
      const player = await Player.findById(playerId);
      
      if (!game || !player) {
        console.warn('🚫 Game or Player not found');
        return;
      }
      
      // Register this player session
      const isNewSession = sessionManager.registerSession(playerId, socket.id);
      
      socket.join(SHARED_GAME_ID);
      console.log(`🧑 Player ${player.name} ${isNewSession ? 'joined' : 'rejoined'} game ${SHARED_GAME_ID}`);
      
      // Track player in game state, preserving any existing marks
      const existingPlayer = this.gameState.players[playerId];
      this.gameState.players[playerId] = {
        socketId: socket.id,
        card: player.card,
        marks: existingPlayer?.marks || player.marked || [],
        hasWon: existingPlayer?.hasWon || false
      };
      
      // Send current game state to the player
      socket.emit('game_state_update', {
        status: this.gameState.status,
        calledNumbers: [...this.gameState.calledNumbers],
        currentNumber: this.gameState.currentNumber
      });
      
      // Notify all players only if this is a new join, not a reconnect
      if (isNewSession) {
        this.io.to(SHARED_GAME_ID).emit('player_joined', { 
          playerId, 
          playerName: player.name 
        });
      }
    } catch (err) {
      console.error('❌ player_join error:', err);
    }
  }

  async playerMarkedNumber(socket, { playerId, number }) {
    try {
      const player = this.gameState.players[playerId];
      if (!player || player.hasWon || player.marks.includes(number)) return;
      
      player.marks.push(number);
      
      // Update DB
      try {
        await Player.findByIdAndUpdate(playerId, {
          $addToSet: { marked: number }
        });
      } catch (err) {
        console.error("❌ Error updating marked numbers:", err);
      }
      
      // Check for win
      const result = checkWin(player.card, new Set([...this.gameState.calledNumbers, ...player.marks]));
      if (result && result.length > 0) {
        player.hasWon = true;
        this.io.to(SHARED_GAME_ID).emit('player_won', { 
          playerId, 
          winningLine: result[0]  // Send the first winning pattern
        });
        
        // Note: We don't stop the game when a player wins, it continues
        // This allows multiple winners in a single game
      }
      
      this.io.to(SHARED_GAME_ID).emit('player_marked', { playerId, number });
    } catch (err) {
      console.error('❌ mark_number error:', err);
    }
  }

  playerDisconnected(socket) {
    // Mark the player session as disconnected but keep their game data
    const disconnectedPlayerId = sessionManager.handleDisconnect(socket.id);
    
    if (disconnectedPlayerId) {
      console.log(`❌ Player ${disconnectedPlayerId} disconnected`);
      
      // Note: we don't remove player data from gameState because they might rejoin
      // Their marks and card selections are preserved in memory
    }
    
    // Update connected player count
    const connectedCount = sessionManager.getConnectedCount();
    console.log(`🧑 ${connectedCount} players currently connected`);
  }
}

module.exports = GameEngine;