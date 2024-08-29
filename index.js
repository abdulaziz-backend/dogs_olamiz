const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
const bot = new TelegramBot(TOKEN);

const app = express();
app.use(bodyParser.json());

const ADMINS = [6236467772, 6592969450];  // Add your admin IDs
let botStats = { users: new Set(), chats: new Set() };

const GREETING = "👋 Assalomu alaykum! Men DOGS token sotib oluvchi ishonchli Botman.";
const DOGS_PRICE = `
💎1000 $DOGS = 11 000 UZS
💎2000 $DOGS = 22 000 UZS
💎3000 $DOGS = 33 000 UZS
💎4000 $DOGS = 44 000 UZS
💎5000 $DOGS = 55 000 UZS
💎6000 $DOGS = 66 000 UZS
`;

const catalogKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Narx", callback_data: "price" }],
      [{ text: "Sotish", callback_data: "sell" }]
    ]
  }
};

// Webhook setup
bot.setWebHook(`https://your-vercel-app-url.vercel.app/bot${TOKEN}`);

// Handle webhook events
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Handlers for commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, GREETING);
  bot.sendMessage(chatId, "Narxni ko'rasizmi yoki Sotasizmi?", catalogKeyboard);

  if (msg.chat.type === 'private') {
    botStats.users.add(chatId);
  } else {
    botStats.chats.add(chatId);
  }
});

// Handle price button click
bot.on('callback_query', (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;

  if (action === 'price') {
    bot.sendMessage(chatId, `DOGS narxi: ${DOGS_PRICE}`);
  } else if (action === 'sell') {
    bot.sendMessage(chatId, "Qancha miqdorda DOGS sotmoqchisiz?");
    bot.once('message', (msg) => handleSellForm(msg, 'amount'));
  }
});

// Function to handle form submission
function handleSellForm(msg, step) {
  const chatId = msg.chat.id;
  const userData = {};
  userData[step] = msg.text;

  if (step === 'amount') {
    bot.sendMessage(chatId, "Ismingizni kiriting:");
    bot.once('message', (msg) => {
      userData['name'] = msg.text;
      bot.sendMessage(chatId, "Karta raqamingizni kiriting:");
      bot.once('message', (msg) => {
        userData['card'] = msg.text;
        bot.sendMessage(chatId, "Wallet manzilingizni kiriting:");
        bot.once('message', (msg) => {
          userData['wallet'] = msg.text;
          finalizeSell(chatId, userData);
        });
      });
    });
  }
}

// Finalize the sell process
function finalizeSell(chatId, userData) {
  userData['username'] = bot.getChat(chatId).then((chat) => chat.username);
  userData['user_id'] = chatId;

  // Save to a file
  fs.appendFile('sales.txt', JSON.stringify(userData, null, 2) + '\n', (err) => {
    if (err) throw err;
  });

  // Send to admins
  const adminMessage = `
    🆕 Yangi foydalanuvchi DOGS sotmoqchi:
    👤 User ID: ${userData['user_id']}
    📛 Username: ${userData['username']}
    👤 Ism: ${userData['name']}
    💰 Miqdor: ${userData['amount']}
    💳 Karta: ${userData['card']}
    🏦 Wallet: ${userData['wallet']}
  `;
  ADMINS.forEach(adminId => {
    bot.sendMessage(adminId, adminMessage);
  });

  bot.sendMessage(chatId, "<u>Ma'lumotlaringiz muvaffaqiyatli saqlandi. Tez orada siz bilan bog'lanamiz.</u>", { parse_mode: 'HTML' });
}

// Handle admin broadcasting
bot.onText(/\/admin/, (msg) => {
  if (ADMINS.includes(msg.from.id) && msg.reply_to_message) {
    broadcastMessage(msg.reply_to_message);
  }
});

function broadcastMessage(message) {
  botStats.users.forEach(userId => {
    bot.forwardMessage(userId, message.chat.id, message.message_id);
  });
}

// Change price
bot.onText(/\/changeprice (.+)/, (msg, match) => {
  if (ADMINS.includes(msg.from.id)) {
    const newPrice = match[1];
    bot.sendMessage(msg.chat.id, `Narx yangilandi: ${newPrice}`);
    botStats.users.forEach(userId => {
      bot.sendMessage(userId, `DOGS narxi yangilandi:\n${newPrice}`);
    });
  } else {
    bot.sendMessage(msg.chat.id, "Sizda bu amalni bajarishga ruxsat yo'q.");
  }
});

// Start Express server
app.listen(3000, () => {
  console.log('Bot is listening on port 3000');
});
