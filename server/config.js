const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'gift-actions.json');

const DEFAULT_CONFIG = { mappings: [] };

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.mappings)) {
      return { ...DEFAULT_CONFIG };
    }
    return parsed;
  } catch (err) {
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(config) {
  const safe = { mappings: Array.isArray(config.mappings) ? config.mappings : [] };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(safe, null, 2) + '\n', 'utf8');
  return safe;
}

// Devuelve el mapeo que corresponde a un regalo, buscando por giftId primero y
// por nombre (insensible a mayusculas) como respaldo.
function findMapping(config, { giftId, giftName }) {
  const mappings = config.mappings || [];
  if (giftId != null) {
    const byId = mappings.find((m) => m.giftId != null && Number(m.giftId) === Number(giftId));
    if (byId) return byId;
  }
  if (giftName) {
    const target = String(giftName).trim().toLowerCase();
    return mappings.find((m) => m.gift && m.gift.trim().toLowerCase() === target) || null;
  }
  return null;
}

module.exports = { readConfig, writeConfig, findMapping, CONFIG_PATH };
