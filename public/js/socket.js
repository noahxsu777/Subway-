// Cliente Socket.IO: recibe acciones del servidor y reenvia comandos del panel.
const socket = io();

socket.on('connect', () => logEvent('Conectado al servidor'));

socket.on('action', (msg) => {
  runAction(msg.type, msg.params, { user: msg.user });
  const who = msg.user ? (msg.user.nickname || msg.user.uniqueId) : '';
  const giftName = msg.gift && msg.gift.name ? msg.gift.name : '?';
  logEvent(`<b>${esc(giftName)}</b> &rarr; ${esc(ACTION_LABELS[msg.type] || msg.type)}${who ? ' (' + esc(who) + ')' : ''}`);
});

socket.on('gift-unmapped', ({ gift }) => {
  logEvent(`Regalo sin mapear: <b>${esc(gift.giftName || gift.giftId)}</b>`);
});

socket.on('tiktok-status', (s) => {
  if (window.setTikTokStatus) window.setTikTokStatus(s);
});

socket.on('config-updated', () => {
  if (window.reloadMappings) window.reloadMappings();
});

function esc(str) {
  return String(str).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function logEvent(html) {
  const log = document.getElementById('event-log');
  if (!log) return;
  const li = document.createElement('li');
  li.innerHTML = html;
  log.prepend(li);
  while (log.children.length > 30) log.removeChild(log.lastChild);
}

window.appSocket = socket;
window.logEvent = logEvent;
