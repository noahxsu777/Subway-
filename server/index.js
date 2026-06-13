require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const { readConfig, writeConfig, findMapping } = require('./config');
const { TikTokManager } = require('./tiktok');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- API REST de configuracion de mapeos regalo -> accion ---
app.get('/api/config', (req, res) => {
  res.json(readConfig());
});

app.post('/api/config', (req, res) => {
  try {
    const saved = writeConfig(req.body || {});
    res.json(saved);
    io.emit('config-updated', saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Catalogo de acciones disponibles para que el panel construya su UI.
app.get('/api/actions', (req, res) => {
  res.json({
    actions: [
      { id: 'propulsion', label: 'Propulsion (boost de velocidad)', params: ['duration', 'multiplier'] },
      { id: 'spawnCar', label: 'Aparecer carro (obstaculo)', params: ['lane'] },
      { id: 'spawnCone', label: 'Aparecer cono (obstaculo)', params: ['lane'] },
      { id: 'forcedJump', label: 'Salto / agacharse forzado', params: ['mode'] },
      { id: 'coinMagnet', label: 'Iman de monedas', params: ['duration'] },
      { id: 'shield', label: 'Escudo / invencibilidad', params: ['duration'] },
      { id: 'obstacleRain', label: 'Lluvia de obstaculos', params: ['count'] }
    ]
  });
});

const server = http.createServer(app);
const io = new Server(server);

const tiktok = new TikTokManager();

// Reenvia el estado de la conexion TikTok a todos los clientes (panel).
tiktok.onStatus((status) => {
  io.emit('tiktok-status', status);
});

// Convierte un regalo en una accion del juego segun la configuracion guardada.
function dispatchGift(gift, source) {
  // Para regalos en racha, actuar solo al final para no repetir la accion.
  if (gift.repeatEnd === false) return;

  const config = readConfig();
  const mapping = findMapping(config, { giftId: gift.giftId, giftName: gift.giftName });
  if (!mapping) {
    io.emit('gift-unmapped', { gift, source });
    return;
  }

  io.emit('action', {
    type: mapping.action,
    params: mapping.params || {},
    gift: { name: gift.giftName, id: gift.giftId, count: gift.repeatCount },
    user: gift.user,
    source: source || 'tiktok'
  });
}

tiktok.onGift((gift) => dispatchGift(gift, 'tiktok'));

io.on('connection', (socket) => {
  socket.emit('actions-available', Boolean(tiktok.isAvailable()));

  socket.on('connect-tiktok', async ({ username } = {}) => {
    await tiktok.connect(username);
  });

  socket.on('disconnect-tiktok', async () => {
    await tiktok.disconnect();
  });

  // El simulador del panel envia un regalo falso por aqui.
  socket.on('simulate-gift', ({ giftName, giftId } = {}) => {
    dispatchGift(
      {
        giftId,
        giftName,
        repeatCount: 1,
        repeatEnd: true,
        user: { uniqueId: 'simulador', nickname: 'Simulador' }
      },
      'sim'
    );
  });
});

server.listen(PORT, () => {
  console.log(`\n  Subway x TikTok LIVE listo en http://localhost:${PORT}`);
  console.log(`  TikTok API (TikTools): ${tiktok.isAvailable() ? 'disponible' : 'NO instalada (solo simulador)'}`);
  console.log(`  TIKTOOL_API_KEY: ${process.env.TIKTOOL_API_KEY ? 'configurada' : 'ausente (conexion real desactivada)'}\n`);
});
