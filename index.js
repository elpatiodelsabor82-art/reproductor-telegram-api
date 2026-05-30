const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
  console.error("❌ BOT_TOKEN no definido en variables de entorno");
  process.exit(1);
}

// ==========================
// BOT (modo estable)
// ==========================
const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  }
});

// 🔥 almacenamiento (MEMORIA)
const videos = {};

// ==========================
// CAPTURA DE VIDEOS DEL CANAL
// ==========================
bot.on("channel_post", (msg) => {
  try {
    const channelId = msg.chat.id;

    if (!msg.video) return;

    const fileId = msg.video.file_id;
    const messageId = msg.message_id;

    if (!videos[channelId]) {
      videos[channelId] = {};
    }

    videos[channelId][messageId] = {
      fileId,
      title: msg.video.file_name || "video",
      date: msg.date
    };

    console.log("🔥 VIDEO GUARDADO");
    console.log("CANAL:", channelId);
    console.log("ID:", messageId);
    console.log("FILE:", fileId);

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

    const video = videos?.[channel]?.[id];

    if (!video) {
      return res.status(404).send("❌ Video no encontrado");
    }

    const file = await bot.getFile(video.fileId);

    const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream"
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
// LISTAR VIDEOS (API SIMPLE)
// ==========================
app.get("/list/:channel", (req, res) => {
  const { channel } = req.params;

  const data = videos?.[channel];

  if (!data) {
    return res.json([]);
  }

  const list = Object.entries(data).map(([id, v]) => ({
    id,
    title: v.title,
    date: v.date,
    stream: `/stream/${channel}/${id}`
  }));

  res.json(list);
});

// ==========================
// HOME
// ==========================
app.get("/", (req, res) => {
  res.send("🚀 Telegram Flix API funcionando correctamente");
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Servidor corriendo en puerto", PORT);
});
