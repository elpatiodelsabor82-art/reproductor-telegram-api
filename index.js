const express = require('express');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
// Render asigna el puerto automáticamente mediante process.env.PORT
const PORT = process.env.PORT || 3000;

// ⚙️ Configuración segura usando las variables de entorno de Render
const apiId = parseInt(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
// La sesión guardada para que Telegram no te pida código de verificación en cada reinicio
const stringSession = new StringSession(process.env.TG_SESSION || ""); 

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

// 🎬 ENDPOINT PARA TRANSMITIR EL VIDEO DIRECTO AL REPRODUCITOR
// Ejemplo de uso: https://tu-app.onrender.com/stream/kikeFlix0307/2
app.get('/stream/:channel/:messageId', async (req, res) => {
    const { channel, messageId } = req.params;

    try {
        // Nos aseguramos de que el cliente de Telegram esté conectado
        if (!client.connected) {
            await client.connect();
        }
        
        // Si el canal viene como nombre (ej: kikeFlix0307) se usa igual, 
        // si viene como ID numérico lo convierte a entero.
        const channelPeer = isNaN(channel) ? channel : parseInt(channel);

        console.log(`🔍 Buscando película en el canal: ${channel}, Mensaje: #${messageId}`);

        // Buscamos el mensaje exacto dentro del canal de Telegram
        const messages = await client.getMessages(channelPeer, { ids: parseInt(messageId) });
        
        if (!messages || !messages[0] || !messages[0].media) {
            return res.status(404).send("Error: Película no encontrada o el mensaje no contiene un video.");
        }

        const media = messages[0].media;

        // Configuramos las cabeceras HTTP necesarias para streaming de video
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');

        console.log(`🎥 Transmitiendo flujo de video en tiempo real...`);

        // El truco clave: descarga el archivo desde Telegram y lo escupe (pipe)
        // directo a la respuesta web del navegador en tiempo real sin guardarlo en Render
        await client.downloadMedia(media, {
            workers: 4, // 4 conexiones simultáneas para evitar congelamientos y dar máxima velocidad
            outputStream: res // Transmisión directa al reproductor morado
        });

    } catch (error) {
        console.error("❌ Error en el servidor de streaming:", error);
        res.status(500).send("Error interno al procesar el flujo de video de Telegram.");
    }
});

// Ruta de control para verificar en el navegador que el servidor esté vivo
app.get('/', (req, res) => {
    res.send('🚀 Servidor Puente de Telegram Streaming Activo y Corriendo Correctamente.');
});

app.listen(PORT, () => {
    console.log(`🚀 API de Streaming corriendo en el puerto ${PORT}`);
});
