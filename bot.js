require('dotenv').config();
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = 'https://promaxsvadba.ru';
const ADMIN_ID = '@ShitshiBB'; // ЗАМЕНИ НА СВОЙ ЮЗЕРНЕЙМ

if (!BOT_TOKEN) {
  console.error('ERROR: Укажите BOT_TOKEN в .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  await ctx.reply(
    "👋 Привет! Открой наше свадебное приглашение ❤️",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎀 Открыть приглашение",
              web_app: { url: WEBAPP_URL }
            }
          ]
        ]
      }
    }
  );
});

// Обработчик данных из WebApp
bot.on('message', async (ctx) => {
  if (ctx.message.web_app_data) {
    console.log("WebApp закрыт пользователем");
    
    // Задаем вопрос о посещении
    await ctx.reply(
      "🎉 Ты придешь на нашу свадьбу?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Да", callback_data: 'yes' },
              { text: "❌ Нет", callback_data: 'no' }
            ]
          ]
        }
      }
    );
    
    return;
  }
});

// Обработчик ответов
bot.action('yes', async (ctx) => {
  const user = ctx.from;
  await ctx.reply("Ура! Ждем тебя! ❤️");
  
  // Уведомление админу
  await ctx.telegram.sendMessage(
    ADMIN_ID,
    `✅ НОВЫЙ ОТВЕТ!\n\n` +
    `👤 ${user.first_name || ''} ${user.last_name || ''}\n` +
    `📱 @${user.username || 'нет_юзера'}\n` +
    `🆔 ${user.id}\n` +
    `📝 Ответ: ДА, придет`
  );
  
  await ctx.answerCbQuery();
});

bot.action('no', async (ctx) => {
  const user = ctx.from;
  await ctx.reply("Очень жаль 😔 Спасибо за ответ!");
  
  // Уведомление админу
  await ctx.telegram.sendMessage(
    ADMIN_ID,
    `❌ НОВЫЙ ОТВЕТ!\n\n` +
    `👤 ${user.first_name || ''} ${user.last_name || ''}\n` +
    `📱 @${user.username || 'нет_юзера'}\n` +
    `🆔 ${user.id}\n` +
    `📝 Ответ: НЕТ, не придет`
  );
  
  await ctx.answerCbQuery();
});

bot.launch().then(() => {
  console.log("Бот запущен!");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
