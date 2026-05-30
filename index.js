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

        // 1. Obtener el canal (entidad) primero
        const entity = await client.getEntity(channel);
        
        // 2. Obtener el mensaje completo con su media
        const message = await client.getMessages(entity, { ids: [parseInt(messageId)] });
        
        if (!message || !message[0] || !message[0].media) {
            return res.status(404).send("El mensaje no existe o no es un video.");
        }

        // 3. Forzar acceso a la media del documento/video
        const media = message[0].media;

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
