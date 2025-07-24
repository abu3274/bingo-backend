require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("❌ TELEGRAM_BOT_TOKEN not found in .env");

const bot = new TelegramBot(token, { polling: true });

// Shared game ID (MUST match backend database)
const SHARED_GAME_ID = "688295a92553cb2b59293ba5"; // Replace with your actual shared game ID

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  const frontendUrl = `https://frontend-nu-two-64.vercel.app/?gameId=${SHARED_GAME_ID}&telegramId=${telegramId}`;

  bot.sendMessage(chatId, "🎉 Welcome to Bingo! Press the button below to play:", {
    reply_markup: {
      keyboard: [[
        {
          text: "🎮 Open Game",
          web_app: {
            url: frontendUrl
          }
        }
      ]],
      resize_keyboard: true
    }
  });
});
