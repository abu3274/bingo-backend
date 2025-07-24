require('dotenv').config(); // 👈 Load .env first

const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("❌ TELEGRAM_BOT_TOKEN not found in .env");
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "🎉 Welcome to Bingo! Press the button below to play:", {
    reply_markup: {
      keyboard: [[
        {
          text: "🎮 Open Game",
          web_app: {
            url: 'https://frontend-nu-two-64.vercel.app' // Replace with your actual frontend URL
          }
        }
      ]],
      resize_keyboard: true
    }
  });
});
