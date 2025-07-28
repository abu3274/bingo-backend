/**
 * Mock data for development without MongoDB
 */

// Mock Game data
const mockGame = {
  _id: '688295a92553cb2b59293ba5',
  players: [],
  calledNumbers: [],
  currentNumber: null,
  status: 'waiting',
  createdAt: new Date()
};

// Mock Player data store
const mockPlayers = {};

// Mock Game model
class MockGameModel {
  static async findById(id) {
    if (id === mockGame._id) {
      return { 
        ...mockGame,
        save: async () => {
          console.log("Mock save game:", mockGame);
          return mockGame;
        }
      };
    }
    return null;
  }
}

// Mock Player model
class MockPlayerModel {
  static async findById(id) {
    return mockPlayers[id] ? { ...mockPlayers[id] } : null;
  }
  
  static async findOne(query) {
    const { telegramId } = query;
    for (const id in mockPlayers) {
      if (mockPlayers[id].telegramId === telegramId) {
        return { ...mockPlayers[id] };
      }
    }
    return null;
  }
  
  static async findByIdAndUpdate(id, update) {
    if (!mockPlayers[id]) return null;
    
    // Handle $addToSet for marked numbers
    if (update.$addToSet && update.$addToSet.marked) {
      if (!mockPlayers[id].marked) mockPlayers[id].marked = [];
      if (!mockPlayers[id].marked.includes(update.$addToSet.marked)) {
        mockPlayers[id].marked.push(update.$addToSet.marked);
      }
    }
    
    return { ...mockPlayers[id] };
  }
  
  // Create or update a player
  static registerPlayer(id, data) {
    mockPlayers[id] = {
      _id: id,
      ...data,
      marked: data.marked || []
    };
    return mockPlayers[id];
  }
}

// Generate Bingo card function from bingoLogic
function generateCard() {
  const card = [];
  const ranges = {
    B: [1, 15],
    I: [16, 30],
    N: [31, 45],
    G: [46, 60],
    O: [61, 75]
  };

  Object.values(ranges).forEach((range) => {
    const [min, max] = range;
    const col = [];
    const used = new Set();
    while (col.length < 5) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!used.has(num)) {
        used.add(num);
        col.push(num);
      }
    }
    card.push(col);
  });

  // Transpose to row-major and set center free space
  const finalCard = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => (row === 2 && col === 2 ? 'F' : card[col][row]))
  );

  return finalCard;
}

module.exports = {
  MockGameModel,
  MockPlayerModel,
  generateCard
};