require('dotenv').config();
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = 'https://promaxsvadba.ru';
const ADMIN_ID = '@ShitshiBB'; // Твой юзернейм в Telegram

if (!BOT_TOKEN) {
  console.error('ERROR: Укажите BOT_TOKEN в .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Хранилище для отслеживания, кто уже видел WebApp
const userStates = new Map();

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || `ID${userId}`;
  
  // Сбрасываем состояние для пользователя
  userStates.set(userId, { hasSeenWebApp: false, username });
  
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
  const userId = ctx.from.id;
  const username = ctx.from.username || `ID${userId}`;
  userStates.set(userId, { hasSeenWebApp: false, username });
  
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

// Обработчик для данных из WebApp (если захочешь добавить в будущем)
bot.on('message', async (ctx) => {
  if (ctx.message.web_app_data) {
    const userId = ctx.from.id;
    const userState = userStates.get(userId);
    
    if (userState && !userState.hasSeenWebApp) {
      userState.hasSeenWebApp = true;
      userStates.set(userId, userState);
      
      // После закрытия WebApp показываем кнопки
      await askAttendance(ctx);
    }
    
    console.log("Получено из WebApp:", ctx.message.web_app_data.data);
    await ctx.reply("Спасибо! Данные получены ❤️");
    return;
  }

  // Если нет web_app_data, просто обрабатываем как обычное сообщение
  console.log("Сообщение от", ctx.from.username, ":", ctx.message.text);
});

// Функция для вопроса о посещении
async function askAttendance(ctx) {
  await ctx.reply(
    "Ты придешь на нашу свадьбу?",
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Да, обязательно!", callback_data: 'attendance_yes' },
            { text: "❌ К сожалению, нет", callback_data: 'attendance_no' }
          ]
        ]
      }
    }
  );
}

// Обработчик нажатий на кнопки
bot.action('attendance_yes', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || `ID${userId}`;
  const firstName = ctx.from.first_name || 'Неизвестный';
  const lastName = ctx.from.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  // Сообщение для пользователя
  await ctx.reply("Ура! Будем ждать тебя! ❤️");
  
  // Сообщение для админа
  await ctx.telegram.sendMessage(
    ADMIN_ID,
    `🎉 НОВЫЙ ОТВЕТ НА ПРИГЛАШЕНИЕ!\n\n` +
    `👤 Пользователь: ${fullName}\n` +
    `📱 Юзернейм: @${username}\n` +
    `🆔 ID: ${userId}\n` +
    `📝 Ответ: ДА, придет на свадьбу!\n` +
    `⏰ Время: ${new Date().toLocaleString('ru-RU')}`
  );
  
  await ctx.answerCbQuery();
});

bot.action('attendance_no', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || `ID${userId}`;
  const firstName = ctx.from.first_name || 'Неизвестный';
  const lastName = ctx.from.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  // Сообщение для пользователя
  await ctx.reply("Очень жаль 😔 Но мы все равно благодарим, что был с нами в этот день!");
  
  // Сообщение для админа
  await ctx.telegram.sendMessage(
    ADMIN_ID,
    `📩 НОВЫЙ ОТВЕТ НА ПРИГЛАШЕНИЕ!\n\n` +
    `👤 Пользователь: ${fullName}\n` +
    `📱 Юзернейм: @${username}\n` +
    `🆔 ID: ${userId}\n` +
    `📝 Ответ: НЕТ, не сможет прийти\n` +
    `⏰ Время: ${new Date().toLocaleString('ru-RU')}`
  );
  
  await ctx.answerCbQuery();
});

// ВАЖНО: Отслеживаем закрытие WebApp через специальный метод
// Telegram не отправляет сообщение при закрытии WebApp, 
// поэтому используем следующий подход:

// 1. В момент нажатия на кнопку WebApp запоминаем пользователя
bot.action(/web_app_open/, async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || `ID${userId}`;
  userStates.set(userId, { hasSeenWebApp: false, username, webAppOpenedAt: Date.now() });
  await ctx.answerCbQuery();
});

// 2. Проверяем, закрыл ли пользователь WebApp (косвенный метод)
// Если пользователь пишет сообщение после открытия WebApp, считаем что он закрыл его
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const userState = userStates.get(userId);
  
  // Проверяем, был ли открыт WebApp и еще не задан вопрос
  if (userState && !userState.hasSeenWebApp && userState.webAppOpenedAt) {
    const timeSinceWebApp = Date.now() - userState.webAppOpenedAt;
    
    // Если прошло достаточно времени (минимум 5 секунд)
    if (timeSinceWebApp > 5000) {
      userState.hasSeenWebApp = true;
      userStates.set(userId, userState);
      
      // Задаем вопрос о посещении
      await askAttendance(ctx);
      return; // Не обрабатываем дальше это сообщение
    }
  }
});

// Альтернативный вариант: добавляем кнопку "Закрыть приглашение" в самом WebApp
// Для этого нужно изменить index.html

bot.launch().then(() => {
  console.log("Бот запущен!");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
