require('dotenv').config();
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = 'https://promaxsvadba.ru';
const ADMIN_ID = '@ShitshiBB'; // ЗАМЕНИ НА СВОЙ ЮЗЕРНЕЙМ!

if (!BOT_TOKEN) {
  console.error('ERROR: Укажите BOT_TOKEN в .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Хранилище для отслеживания пользователей
const userResponses = new Map();

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || `user_${userId}`;
  
  console.log(`🚀 Пользователь ${username} (${userId}) начал диалог`);
  
  // Сбрасываем предыдущие ответы
  userResponses.set(userId, {
    hasResponded: false,
    answer: null,
    timestamp: null
  });
  
  // Первое сообщение с кнопкой WebApp
  await ctx.reply(
    `👋 Привет, ${ctx.from.first_name || 'дорогой друг'}!\n\n` +
    'Мы приглашаем тебя на нашу свадьбу! ❤️\n' +
    'Нажми кнопку ниже, чтобы открыть интерактивное приглашение:',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎀 Открыть свадебное приглашение",
              web_app: { url: WEBAPP_URL }
            }
          ]
        ]
      }
    }
  );

  // Сразу отправляем второй вопрос с кнопками Да/Нет
  setTimeout(async () => {
    await askAttendanceQuestion(ctx);
  }, 500); // Ждем 0.5 секунды перед отправкой
});

// Функция для вопроса о посещении
async function askAttendanceQuestion(ctx) {
  const userId = ctx.from.id;
  const userData = userResponses.get(userId);
  
  // Проверяем, не ответил ли уже пользователь
  if (userData && userData.hasResponded) {
    console.log(`ℹ️ Пользователь ${userId} уже ответил`);
    return;
  }
  
  console.log(`❓ Задаю вопрос о посещении пользователю ${userId}`);
  
  await ctx.reply(
    '🎉 *Ты придешь на нашу свадьбу?*\n\n' +
    'Пожалуйста, подтверди свое присутствие:',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: '✅ Да, обязательно буду!', 
              callback_data: 'attendance_yes' 
            }
          ],
          [
            { 
              text: '❌ К сожалению, не смогу', 
              callback_data: 'attendance_no' 
            }
          ]
        ]
      }
    }
  );
}

// Обработчик ответа "Да"
bot.action('attendance_yes', async (ctx) => {
  const user = ctx.from;
  const userId = user.id;
  
  // Проверяем, не отвечал ли уже
  const userData = userResponses.get(userId);
  if (userData && userData.hasResponded) {
    await ctx.answerCbQuery('Вы уже ответили ранее!');
    return;
  }
  
  console.log(`✅ Пользователь ${user.username || userId} ответил ДА`);
  
  // Сохраняем ответ
  userResponses.set(userId, {
    hasResponded: true,
    answer: 'ДА',
    timestamp: new Date()
  });
  
  // Ответ пользователю
  await ctx.reply(
    'Ура! Мы очень рады! ❤️\n\n' +
    'Ждем тебя на нашей свадьбе! 🥂\n' +
    'Это будет незабываемый день! ✨'
  );
  
  // Уведомление админу
  await sendAdminNotification(ctx, 'ДА, придет');
  
  await ctx.answerCbQuery('Спасибо за ответ! ❤️');
});

// Обработчик ответа "Нет"
bot.action('attendance_no', async (ctx) => {
  const user = ctx.from;
  const userId = user.id;
  
  // Проверяем, не отвечал ли уже
  const userData = userResponses.get(userId);
  if (userData && userData.hasResponded) {
    await ctx.answerCbQuery('Вы уже ответили ранее!');
    return;
  }
  
  console.log(`❌ Пользователь ${user.username || userId} ответил НЕТ`);
  
  // Сохраняем ответ
  userResponses.set(userId, {
    hasResponded: true,
    answer: 'НЕТ',
    timestamp: new Date()
  });
  
  // Ответ пользователю
  await ctx.reply(
    'Очень жаль, что ты не сможешь быть с нами 😔\n\n' +
    'Но мы все равно благодарим тебя за теплые слова!\n' +
    'Спасибо, что был частью этого важного дня для нас! 💫'
  );
  
  // Уведомление админу
  await sendAdminNotification(ctx, 'НЕТ, не придет');
  
  await ctx.answerCbQuery('Спасибо за честный ответ!');
});

// Функция отправки уведомления админу
async function sendAdminNotification(ctx, answer) {
  const user = ctx.from;
  const timestamp = new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const userInfo = user.username 
    ? `@${user.username}` 
    : `${user.first_name || ''} ${user.last_name || ''}`.trim() || `ID: ${user.id}`;
  
  const message = `
🎊 *НОВЫЙ ОТВЕТ НА ПРИГЛАШЕНИЕ!*

👤 *Пользователь:* ${userInfo}
🆔 *ID:* ${user.id}
📝 *Ответ:* ${answer}
⏰ *Время:* ${timestamp}

_Данные автоматически записаны_
  `.trim();
  
  try {
    await ctx.telegram.sendMessage(ADMIN_ID, message, { 
      parse_mode: 'Markdown' 
    });
    console.log(`📤 Уведомление отправлено админу`);
  } catch (error) {
    console.error('❌ Ошибка отправки админу:', error.message);
  }
}

// Команда для ручной отправки вопроса
bot.command('question', async (ctx) => {
  await askAttendanceQuestion(ctx);
});

// Команда для отправки приглашения
bot.command('invite', async (ctx) => {
  const userId = ctx.from.id;
  
  // Сбрасываем ответы
  userResponses.delete(userId);
  
  await ctx.reply(
    'Открыть свадебное приглашение:',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✨ Открыть приглашение",
              web_app: { url: WEBAPP_URL }
            }
          ]
        ]
      }
    }
  );
  
  // И сразу вопрос
  setTimeout(async () => {
    await askAttendanceQuestion(ctx);
  }, 500);
});

// Показываем статистику по ответам
bot.command('stats', async (ctx) => {
  if (ctx.from.username !== 'ShitshiBB') { // Замени на свой юзернейм
    return ctx.reply('Эта команда только для администратора');
  }
  
  const totalUsers = userResponses.size;
  const yesAnswers = Array.from(userResponses.values()).filter(r => r.answer === 'ДА').length;
  const noAnswers = Array.from(userResponses.values()).filter(r => r.answer === 'НЕТ').length;
  const pending = totalUsers - yesAnswers - noAnswers;
  
  await ctx.reply(
    `📊 *Статистика ответов:*\n\n` +
    `👥 Всего пользователей: ${totalUsers}\n` +
    `✅ Придут: ${yesAnswers}\n` +
    `❌ Не придут: ${noAnswers}\n` +
    `⏳ Не ответили: ${pending}`,
    { parse_mode: 'Markdown' }
  );
});

// Обработчик данных из WebApp
bot.on('message', async (ctx) => {
  if (ctx.message.web_app_data) {
    console.log('📨 Данные из WebApp:', ctx.message.web_app_data.data);
    // Если пришли данные, тоже показываем вопрос
    await askAttendanceQuestion(ctx);
    return;
  }
});

// Запуск бота
bot.launch()
  .then(() => {
    console.log('🤖 Бот успешно запущен!');
    console.log('📱 WebApp URL:', WEBAPP_URL);
    console.log('👑 Админ для уведомлений:', ADMIN_ID);
  })
  .catch(err => {
    console.error('❌ Ошибка запуска бота:', err);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
