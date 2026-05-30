const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN;

const bot = new TelegramBot(TOKEN, { polling: true });

// 🔥 aquí guardamos videos temporalmente
const videos = {};
let counter = 1;

// detectar videos del canal
bot.on("channel_post", (msg) => {
  try {
    const channel = msg.chat.username;

    if (msg.video) {
      const fileId = msg.video.file_id;

      if (!videos[channel]) videos[channel] = {};

      videos[channel][counter] = fileId;

      console.log("🔥 VIDEO GUARDADO:", channel, counter);
      console.log("FILE ID:", fileId);

      counter++;
    }
  } catch (err) {
    console.log("ERROR:", err.message);
  }
});
