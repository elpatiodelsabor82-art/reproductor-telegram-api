const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const TOKEN = process.env.BOT_TOKEN;

const bot = new TelegramBot(TOKEN, { polling: true });

// 🔥 almacenamiento temporal
const videos = {};
let counter = 1;

// ==========================
// CAPTURAR VIDEOS DEL CANAL
// ==========================
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
    console.log("ERROR BOT:", err.message);
  }
});

// ==========================
// STREAMING
// ==========================
app.get("/stream/:channel/:id", async (req, res) => {
  try {
    const { channel, id } = req.params;

    const fileId = videos?.[channel]?.[id];

    if (!fileId) {
      return res.status(404).send("Video no encontrado");
    }

    const file = await bot.getFile(fileId);

    const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    response.data.pipe(res);

  } catch (err) {
    console.error("STREAM ERROR:", err.message);
    res.status(500).send("Error en stream");
  }
});

// ==========================
// HOME
// ==========================
app.get("/", (req, res) => {
  res.send("Telegram Flix API funcionando 🚀");
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});
