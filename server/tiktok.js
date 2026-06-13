// Envoltorio sobre la API de TikTools (paquete `tiktok-live-api`, https://tik.tools).
// Gestiona la conexion a un TikTok LIVE y reenvia los eventos relevantes mediante
// callbacks. El paquete se carga de forma perezosa para que el servidor (y el
// simulador) arranquen aunque la dependencia no este instalada todavia.

let TikTokLive = null;
try {
  ({ TikTokLive } = require('tiktok-live-api'));
} catch (err) {
  TikTokLive = null;
}

class TikTokManager {
  constructor({ apiKey } = {}) {
    this.apiKey = apiKey || process.env.TIKTOOL_API_KEY || '';
    this.client = null;
    this.username = null;
    this.handlers = { gift: null, status: null };
  }

  onGift(fn) { this.handlers.gift = fn; }
  onStatus(fn) { this.handlers.status = fn; }

  _emitStatus(state, detail) {
    if (this.handlers.status) this.handlers.status({ state, detail: detail || null });
  }

  isAvailable() {
    return Boolean(TikTokLive);
  }

  async connect(username) {
    if (!TikTokLive) {
      this._emitStatus('error', 'El paquete tiktok-live-api no esta instalado. Ejecuta: npm install');
      return false;
    }
    if (!this.apiKey) {
      this._emitStatus('error', 'Falta TIKTOOL_API_KEY en el archivo .env (clave gratuita en https://tik.tools).');
      return false;
    }
    const clean = String(username || '').trim().replace(/^@/, '');
    if (!clean) {
      this._emitStatus('error', 'Indica un nombre de usuario de TikTok valido.');
      return false;
    }

    await this.disconnect();
    this.username = clean;
    this._emitStatus('connecting', clean);

    try {
      this.client = new TikTokLive(clean, { apiKey: this.apiKey });

      this.client.on('connected', () => this._emitStatus('connected', clean));
      this.client.on('disconnected', () => this._emitStatus('disconnected', clean));
      this.client.on('error', (e) => this._emitStatus('error', e && e.message ? e.message : String(e)));

      this.client.on('gift', (event) => {
        if (this.handlers.gift) this.handlers.gift(normalizeGift(event));
      });

      await this.client.connect();
      return true;
    } catch (err) {
      this._emitStatus('error', err && err.message ? err.message : String(err));
      this.client = null;
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        if (typeof this.client.disconnect === 'function') await this.client.disconnect();
      } catch (err) {
        // ignorar errores de desconexion
      }
      this.client = null;
      this._emitStatus('disconnected', this.username);
    }
  }
}

// Normaliza el evento de regalo a una forma estable para el resto de la app.
function normalizeGift(event = {}) {
  const user = event.user || {};
  return {
    giftId: event.giftId,
    giftName: event.giftName,
    diamondCount: event.diamondCount,
    repeatCount: event.repeatCount != null ? event.repeatCount : 1,
    repeatEnd: event.repeatEnd != null ? event.repeatEnd : true,
    giftType: event.giftType,
    user: {
      uniqueId: user.uniqueId || event.uniqueId || 'anon',
      nickname: user.nickname || user.uniqueId || 'anon'
    }
  };
}

module.exports = { TikTokManager, normalizeGift };
