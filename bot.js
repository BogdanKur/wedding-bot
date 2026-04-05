require('dotenv').config();
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = 'https://promaxxsvadba.ru';
const ADMIN_ID = 971702774; // ⚠️ ТВОЙ РЕАЛЬНЫЙ TELEGRAM ID (цифры)

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
  }, 500);
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

// Функция отправки уведомления админу
async function sendAdminNotification(ctx, answer) {
  try {
    const user = ctx.from;
    const userId = user.id;
    
    // Проверяем, не админ ли это сам
    if (userId === ADMIN_ID) {
      console.log('ℹ️ Админ ответил сам, уведомление не отправляем');
      return;
    }
    
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
    
    console.log(`📤 Пытаюсь отправить уведомление админу ${ADMIN_ID}...`);
    
    // Отправляем сообщение админу
    await ctx.telegram.sendMessage(ADMIN_ID, message, { 
      parse_mode: 'Markdown' 
    });
    
    console.log(`✅ Уведомление успешно отправлено админу ${ADMIN_ID}`);
    
    // Также отправляем в консоль для отладки
    console.log('📋 Содержимое уведомления:', message);
    
  } catch (error) {
    console.error('❌ Ошибка отправки админу:', error.message);
    console.error('❌ Полная ошибка:', error);
    
    // Попробуем отправить текстовое сообщение без Markdown
    try {
      const fallbackMessage = `Новый ответ от пользователя! Ответ: ${answer}`;
      await ctx.telegram.sendMessage(ADMIN_ID, fallbackMessage);
      console.log('✅ Уведомление отправлено (fallback)');
    } catch (fallbackError) {
      console.error('❌ Fallback тоже не сработал:', fallbackError.message);
    }
  }
}

// Обработчик ответа "Да"
bot.action('attendance_yes', async (ctx) => {
  try {
    const user = ctx.from;
    const userId = user.id;
    
    console.log(`🎯 Получен callback от ${user.username || userId}: attendance_yes`);
    
    // Проверяем, не отвечал ли уже
    const userData = userResponses.get(userId);
    if (userData && userData.hasResponded) {
      console.log(`⚠️ Пользователь ${userId} уже отвечал ранее`);
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
    console.log(`🔔 Вызываю sendAdminNotification для админа ${ADMIN_ID}`);
    await sendAdminNotification(ctx, 'ДА, придет');
    
    await ctx.answerCbQuery('Спасибо за ответ! ❤️');
    
  } catch (error) {
    console.error('❌ Ошибка в обработчике attendance_yes:', error);
    await ctx.answerCbQuery('Произошла ошибка, попробуйте позже');
  }
});

// Обработчик ответа "Нет"
bot.action('attendance_no', async (ctx) => {
  try {
    const user = ctx.from;
    const userId = user.id;
    
    console.log(`🎯 Получен callback от ${user.username || userId}: attendance_no`);
    
    // Проверяем, не отвечал ли уже
    const userData = userResponses.get(userId);
    if (userData && userData.hasResponded) {
      console.log(`⚠️ Пользователь ${userId} уже отвечал ранее`);
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
    console.log(`🔔 Вызываю sendAdminNotification для админа ${ADMIN_ID}`);
    await sendAdminNotification(ctx, 'НЕТ, не придет');
    
    await ctx.answerCbQuery('Спасибо за честный ответ!');
    
  } catch (error) {
    console.error('❌ Ошибка в обработчике attendance_no:', error);
    await ctx.answerCbQuery('Произошла ошибка, попробуйте позже');
  }
});

// Команда для тестирования уведомлений
bot.command('testnotify', async (ctx) => {
  const userId = ctx.from.id;
  
  console.log(`🧪 Тест уведомления от пользователя ${userId}`);
  
  // Имитируем уведомление
  try {
    const testMessage = `🧪 *ТЕСТОВОЕ УВЕДОМЛЕНИЕ!*\n\nТест отправки от пользователя ${userId}\nВремя: ${new Date().toLocaleString()}`;
    
    await ctx.telegram.sendMessage(ADMIN_ID, testMessage, { 
      parse_mode: 'Markdown' 
    });
    
    await ctx.reply('✅ Тестовое уведомление отправлено!');
    console.log('✅ Тестовое уведомление отправлено');
    
  } catch (error) {
    console.error('❌ Ошибка тестового уведомления:', error.message);
    await ctx.reply(`❌ Ошибка: ${error.message}`);
  }
});

// Показываем текущий ADMIN_ID
bot.command('admininfo', async (ctx) => {
  await ctx.reply(`Текущий ADMIN_ID: ${ADMIN_ID}\nТип: ${typeof ADMIN_ID}`);
});

// Обработчик данных из WebApp
bot.on('message', async (ctx) => {
  if (ctx.message.web_app_data) {
    console.log('📨 Данные из WebApp:', ctx.message.web_app_data.data);
    await askAttendanceQuestion(ctx);
    return;
  }
});

// Запуск бота
bot.launch()
  .then(() => {
    console.log('🤖 Бот успешно запущен!');
    console.log('📱 WebApp URL:', WEBAPP_URL);
    console.log('👑 Админ ID:', ADMIN_ID, '(тип:', typeof ADMIN_ID, ')');
    
    // Тестовый вывод в консоль
    console.log('\n=== КОНФИГУРАЦИЯ ===');
    console.log('BOT_TOKEN:', BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует');
    console.log('ADMIN_ID:', ADMIN_ID);
    console.log('WEBAPP_URL:', WEBAPP_URL);
    console.log('====================\n');
  })
  .catch(err => {
    console.error('❌ Ошибка запуска бота:', err);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

