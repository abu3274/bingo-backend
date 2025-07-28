require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const User = require('./models/User'); // ✅ Import Mongoose model
const Player = require('./models/Player'); // ✅ adjust path if needed

const token = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = 'https://your-bingo-frontend.vercel.app';

if (!token) throw new Error("❌ TELEGRAM_BOT_TOKEN not found in .env");

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bingo')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB error:', err));

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
      ['📝 Register', '🎮 Play']
      ['💰 Deposit', '💵 Withdraw'],
      ['💳 Balance', '🔄 Transfer'],
      ['📖 Instruction', '🛠 Support'],
      ['📩 Invite', '🧑‍💼 Register As Agent'],
      ['👥 Invite Sub-Agent', '📊 Sale']
    ],
    resize_keyboard: true
  }
};

// ✅ /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🎉 Welcome! Use the menu to begin:", mainMenu);
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
    const Player = require('./models/Player'); // adjust path if needed

    const existing = await Player.findOne({ telegramId: contact.user_id });
    if (!existing) {
      const newPlayer = new Player({
        telegramId: contact.user_id,
        name: contact.first_name,
        phoneNumber: contact.phone_number,
        wallet: 100 // default
      });
      await newPlayer.save();
      bot.sendMessage(chatId, "✅ You are successfully registered!");
    } else {
      bot.sendMessage(chatId, "✅ You are already registered.");
    }
  } catch (err) {
    console.error('❌ Contact save error:', err);
    bot.sendMessage(chatId, "❌ Failed to register. Try again later.");
  }
});

// top of file


// Add inside bot.onText
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const player = await Player.findOne({ telegramId });

    if (!player) {
      return bot.sendMessage(chatId, "❌ You are not registered. Please use /register first.");
    }

    bot.sendMessage(chatId, `💰 Your current wallet balance is: ${player.wallet} coins.`);
  } catch (err) {
    console.error('❌ Balance check error:', err);
    bot.sendMessage(chatId, "⚠️ Failed to retrieve balance.");
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // 🎮 Play
  if (msg.text === '🎮 Play') {
    bot.sendMessage(chatId, "🚀 Opening Bingo game...", {
      reply_markup: { remove_keyboard: true }
    });

    bot.sendMessage(chatId, "Click below to start:", {
      reply_markup: {
        inline_keyboard: [[
          { text: "🎲 Play Bingo", web_app: { url: FRONTEND_URL } }
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

  // 📱 Save Contact
  if (msg.contact) {
    try {
      const telegramId = msg.from.id.toString();
      const phoneNumber = msg.contact.phone_number;
      const name = msg.contact.first_name;

      const existingUser = await User.findOne({ telegramId });

      if (existingUser) {
        existingUser.phoneNumber = phoneNumber;
        existingUser.name = name;
        await existingUser.save();
        bot.sendMessage(chatId, "✅ Your contact has been updated.");
      } else {
        const newUser = new User({ telegramId, phoneNumber, name });
        await newUser.save();
        bot.sendMessage(chatId, `✅ Thanks ${name}, you are registered!`);
      }

    } catch (err) {
      console.error("❌ Failed to save contact:", err);
      bot.sendMessage(chatId, "❌ Error saving your contact. Please try again.");
    }
  }
});
