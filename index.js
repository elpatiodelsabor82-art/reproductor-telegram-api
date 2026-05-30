const express = require('express');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
const PORT = process.env.PORT || 3000;

const apiId = parseInt(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const stringSession = new StringSession(process.env.TG_SESSION || ""); 

const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

app.get('/stream/:channel/:messageId', async (req, res) => {
    let { channel, messageId } = req.params;
    
    try {
        if (!client.connected) await client.connect();

        const entity = await client.getEntity(channel);
        const messages = await client.getMessages(entity, { ids: [parseInt(messageId)] });
        
        if (!messages || !messages[0]) return res.status(404).send("Mensaje no encontrado.");

        const msg = messages[0];
        
        // DEBUG: Esto es lo que necesito que leas en los Logs de Render
        console.log("TIPO DE MENSAJE:", msg.className);
        console.log("¿TIENE MEDIA?:", !!msg.media);

        if (!msg.media) {
            return res.status(400).send("Este mensaje no tiene archivos adjuntos.");
        }

        // Intentar descargar directamente
        res.setHeader('Content-Type', 'video/mp4');
        const stream = client.iterDownload({
            media: msg, // Pasamos el objeto mensaje completo, es más seguro
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
