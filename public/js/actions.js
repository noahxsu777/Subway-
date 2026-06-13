// Registro de acciones de regalo. Cada funcion recibe la escena del juego y los
// parametros configurados, y ejecuta el efecto correspondiente.
const GiftActions = {
  propulsion: (game, p = {}) => game.boost(num(p.multiplier, 1.8), num(p.duration, 4000)),
  spawnCar: (game, p = {}) => game.spawnObstacle('car', laneOf(p.lane)),
  spawnCone: (game, p = {}) => game.spawnObstacle('cone', laneOf(p.lane)),
  forcedJump: (game, p = {}) => game.forcePlayerAction(p.mode === 'duck' ? 'duck' : 'jump'),
  coinMagnet: (game, p = {}) => game.activateMagnet(num(p.duration, 6000)),
  shield: (game, p = {}) => game.activateShield(num(p.duration, 5000)),
  obstacleRain: (game, p = {}) => game.obstacleRain(num(p.count, 6))
};

const ACTION_LABELS = {
  propulsion: 'Propulsion',
  spawnCar: 'Carro',
  spawnCone: 'Cono',
  forcedJump: 'Salto/Agacharse',
  coinMagnet: 'Iman de monedas',
  shield: 'Escudo',
  obstacleRain: 'Lluvia de obstaculos'
};

function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// lane -1 (o ausente) = aleatorio; 0/1/2 = carril fijo.
function laneOf(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 2 ? n : -1;
}

// Punto de entrada: ejecuta una accion sobre el juego activo.
function runAction(type, params, meta) {
  const game = window.GAME;
  if (!game || game.gameOver) return false;
  const fn = GiftActions[type];
  if (!fn) return false;
  fn(game, params || {});

  if (window.UI) {
    const who = meta && meta.user ? (meta.user.nickname || meta.user.uniqueId) : '';
    window.UI.flashBanner(`${ACTION_LABELS[type] || type}${who ? ' - ' + who : ''}`);
  }
  return true;
}

window.GiftActions = GiftActions;
window.ACTION_LABELS = ACTION_LABELS;
window.runAction = runAction;
