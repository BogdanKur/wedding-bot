require('dotenv').config();
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = 'https://promaxsvadba.ru'; // ТВОЙ САЙТ

if (!BOT_TOKEN) {
  console.error('ERROR: Укажите BOT_TOKEN в .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  await ctx.reply(
    "Привет! Открой наше свадебное приглашение ❤️",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Открыть приглашение ✨",
              web_app: { url: WEBAPP_URL }
            }
          ]
        ]
      }
    }
  );
});

bot.command('invite', async (ctx) => {
  await ctx.reply("Свадебное приглашение:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Открыть приглашение ✨",
            web_app: { url: WEBAPP_URL }
          }
        ]
      ]
    }
  });
});

bot.launch().then(() => {
  console.log("Бот запущен!");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));