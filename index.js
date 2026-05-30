const express = require('express');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
const PORT = process.env.PORT || 3000;

const apiId = parseInt(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const stringSession = new StringSession(process.env.TG_SESSION || ""); 

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

app.get('/stream/:channel/:messageId', async (req, res) => {
    let { channel, messageId } = req.params;
    try {
        if (!client.connected) await client.connect();
        
        const message = await client.getMessages(channel, { ids: [parseInt(messageId)] });
        
        if (!message || message.length === 0 || !message[0].media) {
            return res.status(404).send("No se encontró el video.");
        }

        const media = message[0].media;
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');

        const stream = client.iterDownload({ media: media, requestSize: 1024 * 1024 });
        for await (const chunk of stream) {
            res.write(chunk);
        }
        res.end();
    } catch (error) {
        console.error("ERROR:", error);
        res.status(500).send("Error: " + error.message);
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
