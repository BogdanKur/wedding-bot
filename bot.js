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

// Храним ID пользователей, которые открыли WebApp
const webAppUsers = new Set();

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || `user_${userId}`;
  
  console.log(`🚀 Пользователь ${username} (${userId}) начал диалог`);
  
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
  
  // Запоминаем, что пользователь начал диалог
  webAppUsers.add(userId);
});

// ОБЯЗАТЕЛЬНЫЙ ОБРАБОТЧИК ДЛЯ ДАННЫХ ИЗ WEBAPP
bot.on('message', async (ctx) => {
  // Проверяем, есть ли данные из WebApp
  if (ctx.message.web_app_data) {
    const userId = ctx.from.id;
    const data = ctx.message.web_app_data.data;
    
    console.log(`📨 Данные из WebApp от ${userId}:`, data);
    
    try {
      // Парсим JSON данные
      const parsedData = JSON.parse(data);
      console.log('📊 Parsed data:', parsedData);
      
      // Показываем вопрос о посещении
      await askAttendanceQuestion(ctx);
      
    } catch (error) {
      console.error('❌ Ошибка парсинга данных:', error);
      // Все равно показываем вопрос
      await askAttendanceQuestion(ctx);
    }
    
    return;
  }
  
  // Обычные текстовые сообщения
  console.log(`💬 Сообщение от ${ctx.from.username}:`, ctx.message.text);
});

// Команда для ручной отправки приглашения
bot.command('invite', async (ctx) => {
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
  webAppUsers.add(ctx.from.id);
});

// Функция для вопроса о посещении
async function askAttendanceQuestion(ctx) {
  const userId = ctx.from.id;
  const username = ctx.from.username || `user_${userId}`;
  
  console.log(`❓ Задаю вопрос о посещении пользователю ${username}`);
  
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
  
  console.log(`✅ Пользователь ${user.username || userId} ответил ДА`);
  
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
  
  console.log(`❌ Пользователь ${user.username || userId} ответил НЕТ`);
  
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
    minute: '2-digit'
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
