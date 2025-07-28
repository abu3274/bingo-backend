require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const User = require('./models/User'); // ✅ Import Mongoose model
const Player = require('./models/Player'); // ✅ adjust path if needed
const { generateCard } = require('./utils/bingoLogic'); // Import card generation function
const { MockPlayerModel } = require('./mockData'); // Import mock data for development

const token = process.env.TELEGRAM_BOT_TOKEN;
// Update the FRONTEND_URL to point to your deployed frontend
const FRONTEND_URL = 'https://frontend-nu-two-64.vercel.app';
const SHARED_GAME_ID = '688295a92553cb2b59293ba5'; // Same shared game ID as in gameEngine.js

if (!token) throw new Error("❌ TELEGRAM_BOT_TOKEN not found in .env");

// ✅ Connect to MongoDB if connection string exists, otherwise use mock data
const useMockData = !process.env.MONGODB_URI;

if (!useMockData) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => {
      console.error('❌ MongoDB error:', err);
      console.log('📝 Using mock data instead');
    });
} else {
  console.log('📝 Using mock data (no MongoDB URI provided)');
}

const bot = new TelegramBot(token, { polling: true });

// ✅ Set Commands
bot.setMyCommands([
  { command: 'register', description: 'Register your phone number' },
  { command: 'play', description: 'Open Bingo Game' },
  { command: 'balance', description: 'Check your balance' },
  { command: 'deposit', description: 'Deposit funds' },
  { command: 'withdraw', description: 'Withdraw funds' },
  { command: 'transfer', description: 'Transfer to another player' },
  { command: 'instruction', description: 'How to play' },
  { command: 'support', description: 'Contact support' },
  { command: 'invite', description: 'Invite friends' },
  { command: 'agent', description: 'Register as agent' },
  { command: 'invitesubagent', description: 'Invite sub-agent' },
  { command: 'sale', description: 'View sales info' }
]);

// ✅ Main Menu Keyboard
const mainMenu = {
  reply_markup: {
    keyboard: [
      ['📝 Register', '🎮 Play'],
      ['💰 Deposit', '💵 Withdraw'],
      ['💳 Balance', '🔄 Transfer'],
      ['📖 Instruction', '🛠 Support'],
      ['📩 Invite', '🧑‍💼 Register As Agent'],
      ['👥 Invite Sub-Agent', '📊 Sale']
    ],
    resize_keyboard: true
  }
};

// ✅ Create or get player - handles both MongoDB and mock data
async function getOrCreatePlayer(telegramId, name, phoneNumber = null) {
  try {
    if (useMockData) {
      // Use mock data
      const playerId = `player_${telegramId}`;
      const existingPlayer = MockPlayerModel.findById(playerId);
      
      if (existingPlayer) {
        return existingPlayer;
      }
      
      // Create new player with mock data
      const playerData = {
        telegramId,
        name,
        phoneNumber,
        card: generateCard(),
        wallet: 100,
        marked: [],
        gameId: SHARED_GAME_ID
      };
      
      return MockPlayerModel.registerPlayer(playerId, playerData);
    } else {
      // Use MongoDB
      let player = await Player.findOne({ telegramId });
      
      if (!player) {
        player = new Player({
          telegramId,
          name,
          phoneNumber,
          card: generateCard(),
          wallet: 100,
          gameId: SHARED_GAME_ID
        });
        await player.save();
      }
      
      return player;
    }
  } catch (err) {
    console.error('❌ Error getting/creating player:', err);
    return null;
  }
}

// ✅ /play command - Join the continuous game
bot.onText(/\/play/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  const name = msg.from.first_name;
  
  // Ensure player exists in the system
  const player = await getOrCreatePlayer(telegramId, name);
  
  if (!player) {
    return bot.sendMessage(chatId, "❌ Failed to create player profile. Please try again later.");
  }
  
  // Send welcome message with main menu
  bot.sendMessage(chatId, "🎉 Welcome to Bingo Betty! Use the menu to begin:", mainMenu);
  
  // Add game parameters to the URL to auto-join the continuous game
  const gameUrl = `${FRONTEND_URL}?telegramId=${telegramId}&gameId=${SHARED_GAME_ID}`;
  
  // Send play button that opens the web app with parameters
  bot.sendMessage(chatId, "Click below to join the ongoing Bingo game:", {
    reply_markup: {
      inline_keyboard: [[
        { text: "🎲 Join Ongoing Game", web_app: { url: gameUrl } }
      ]]
    }
  });
});

// ✅ /register or 📝 Register
bot.onText(/\/register/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "📲 Please share your contact to register:", {
    reply_markup: {
      keyboard: [
        [{
          text: "📞 Share Contact",
          request_contact: true
        }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});

bot.on('contact', async (msg) => {
  const contact = msg.contact;
  const chatId = msg.chat.id;

  try {
    const player = await getOrCreatePlayer(
      contact.user_id.toString(),
      contact.first_name,
      contact.phone_number
    );
    
    if (player) {
      bot.sendMessage(chatId, "✅ You are successfully registered!");
      
      // Prompt to play immediately
      bot.sendMessage(chatId, "Would you like to join the ongoing game now?", {
        reply_markup: {
          inline_keyboard: [[
            { 
              text: "🎮 Join Now", 
              web_app: { 
                url: `${FRONTEND_URL}?telegramId=${contact.user_id}&gameId=${SHARED_GAME_ID}` 
              } 
            }
          ]]
        }
      });
    }
  } catch (err) {
    console.error('❌ Contact save error:', err);
    bot.sendMessage(chatId, "❌ Failed to register. Try again later.");
  }
});

// ✅ /balance
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  try {
    const player = useMockData
      ? MockPlayerModel.findById(`player_${telegramId}`)
      : await Player.findOne({ telegramId });

    if (!player) {
      return bot.sendMessage(chatId, "❌ You are not registered. Please use /register first.");
    }

    bot.sendMessage(chatId, `💰 Your current wallet balance is: ${player.wallet} coins.`);
  } catch (err) {
    console.error('❌ Balance check error:', err);
    bot.sendMessage(chatId, "⚠️ Failed to retrieve balance.");
  }
});

// ✅ Handle text messages
bot.on('message', async (msg) => {
  if (!msg.text) return;
  
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  // 🎮 Play
  if (msg.text === '🎮 Play') {
    // Ensure player exists
    const player = await getOrCreatePlayer(telegramId, msg.from.first_name);
    
    if (!player) {
      return bot.sendMessage(chatId, "❌ Failed to retrieve player profile. Please register first.");
    }
    
    bot.sendMessage(chatId, "🚀 Opening Bingo game...", {
      reply_markup: { remove_keyboard: true }
    });

    // Add game parameters to URL
    const gameUrl = `${FRONTEND_URL}?telegramId=${telegramId}&gameId=${SHARED_GAME_ID}`;
    
    bot.sendMessage(chatId, "Click below to join the ongoing game:", {
      reply_markup: {
        inline_keyboard: [[
          { text: "🎲 Join Ongoing Game", web_app: { url: gameUrl } }
        ]]
      }
    });
  }

  // 📝 Register
  if (msg.text === '📝 Register') {
    bot.sendMessage(chatId, "📞 Share your phone number:", {
      reply_markup: {
        keyboard: [[{ text: "📱 Share Contact", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  }
  
  // 💳 Balance
  if (msg.text === '💳 Balance') {
    try {
      const player = useMockData
        ? MockPlayerModel.findById(`player_${telegramId}`)
        : await Player.findOne({ telegramId });

      if (!player) {
        return bot.sendMessage(chatId, "❌ You are not registered. Please use 📝 Register first.");
      }

      bot.sendMessage(chatId, `💰 Your current wallet balance is: ${player.wallet} coins.`);
    } catch (err) {
      console.error('❌ Balance check error:', err);
      bot.sendMessage(chatId, "⚠️ Failed to retrieve balance.");
    }
  }
});

console.log('✅ Telegram bot started');