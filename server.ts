import dotenv from 'dotenv';
dotenv.config();

import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = 'https://frontend-nu-two-64.vercel.app'.trim(); // ✅ Vercel app URL — NO trailing slash or space

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env');
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🎉 Welcome to the Bingo Mini App!", {
    reply_markup: {
      keyboard: [[
        {
          text: '🎲 Play Bingo Game',
          web_app: { url: WEB_APP_URL }
        }
      ]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});
