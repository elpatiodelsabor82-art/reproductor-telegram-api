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

        const entity = await client.getEntity(channel);
        const messages = await client.getMessages(entity, { ids: [parseInt(messageId)] });
        
        if (!messages || !messages[0]) return res.status(404).send("Mensaje no encontrado.");

        const msg = messages[0];
        
        // DEPURADOR: Esto te dirá en los logs qué tiene el objeto antes de fallar
        console.log("DEBUG MSG MEDIA:", msg.media);

        // Si es un video, Telegram suele guardarlo en msg.media.document
        const media = msg.media && msg.media.document ? msg.media.document : msg.media;

        if (!media) {
            return res.status(404).send("El mensaje no tiene contenido multimedia válido.");
        }

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');

        const stream = client.iterDownload({
            media: media,
            requestSize: 1024 * 1024,
        });

        for await (const chunk of stream) {
            res.write(chunk);
        }
        res.end();

    } catch (error) {
        console.error("❌ ERROR FINAL:", error);
        res.status(500).send("Error crítico: " + error.message);
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
