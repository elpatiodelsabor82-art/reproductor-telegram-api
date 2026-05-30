const express = require('express');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración
const apiId = parseInt(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const stringSession = new StringSession(process.env.TG_SESSION || ""); 

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

app.get('/stream/:channel/:messageId', async (req, res) => {
    const { channel, messageId } = req.params;

    try {
        if (!client.connected) {
            await client.connect();
        }
        
        const channelPeer = isNaN(channel) ? channel : parseInt(channel);
        const messages = await client.getMessages(channelPeer, { ids: parseInt(messageId) });
        
        if (!messages || !messages[0] || !messages[0].media) {
            return res.status(404).send("Error: Película no encontrada.");
        }

        const media = messages[0].media;

        // Cabeceras para el navegador
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');

        // STREAMING POR BLOQUES (Para que Render no se asfixie con películas)
        const stream = client.iterDownload({
            media: media,
            requestSize: 1024 * 1024, // Bloques de 1MB
        });

        for await (const chunk of stream) {
            res.write(chunk);
        }
        res.end();

    } catch (error) {
        console.error("❌ Error:", error);
        if (!res.headersSent) {
            res.status(500).send("Error procesando el stream.");
        }
    }
});

app.get('/', (req, res) => {
    res.send('🚀 Servidor Activo.');
});

app.listen(PORT, () => {
    console.log(`🚀 API corriendo en puerto ${PORT}`);
});
