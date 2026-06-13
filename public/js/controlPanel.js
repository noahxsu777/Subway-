// Panel de control: conexion a TikTok, simulador de regalos y editor de mapeos.
(function () {
  let actionsCatalog = [];
  let mappings = [];

  const $ = (id) => document.getElementById(id);

  // --- Estado de conexion TikTok ---
  window.setTikTokStatus = function (s) {
    const el = $('tiktok-status');
    if (!el) return;
    const map = {
      connecting: ['connecting', 'Conectando...'],
      connected: ['connected', 'Conectado'],
      disconnected: ['idle', 'Desconectado'],
      error: ['error', 'Error']
    };
    const [cls, label] = map[s.state] || ['idle', s.state];
    el.className = 'status ' + cls;
    el.textContent = label + (s.detail ? ': ' + s.detail : '');
  };

  $('btn-connect').addEventListener('click', () => {
    const username = $('tiktok-username').value.trim();
    if (!username) return;
    window.appSocket.emit('connect-tiktok', { username });
  });

  $('btn-disconnect').addEventListener('click', () => {
    window.appSocket.emit('disconnect-tiktok');
  });

  // --- Simulador ---
  function buildSimulator() {
    const grid = $('sim-buttons');
    grid.innerHTML = '';
    actionsCatalog.forEach((a) => {
      const btn = document.createElement('button');
      btn.textContent = a.label;
      btn.title = 'Dispara la accion ' + a.id;
      btn.addEventListener('click', () => {
        // Ejecuta la accion directamente en el juego (no depende de mapeos).
        runAction(a.id, defaultParams(a.id), { user: { nickname: 'Simulador' } });
        logEvent('Simulado: <b>' + a.label + '</b>');
      });
      grid.appendChild(btn);
    });
  }

  function defaultParams(actionId) {
    switch (actionId) {
      case 'propulsion': return { duration: 4000, multiplier: 1.8 };
      case 'coinMagnet': return { duration: 6000 };
      case 'shield': return { duration: 5000 };
      case 'obstacleRain': return { count: 6 };
      case 'forcedJump': return { mode: 'jump' };
      case 'spawnCar':
      case 'spawnCone': return { lane: -1 };
      default: return {};
    }
  }

  // --- Editor de mapeos ---
  function actionOptions(selected) {
    return actionsCatalog
      .map((a) => `<option value="${a.id}" ${a.id === selected ? 'selected' : ''}>${a.label}</option>`)
      .join('');
  }

  function renderMappings() {
    const container = $('mappings');
    container.innerHTML = '';
    mappings.forEach((m, idx) => {
      const row = document.createElement('div');
      row.className = 'mapping';
      row.innerHTML = `
        <input class="m-gift" type="text" value="${escAttr(m.gift || '')}" placeholder="Nombre regalo" />
        <select class="m-action">${actionOptions(m.action)}</select>
        <button class="del" title="Eliminar">x</button>
        <input class="params-input m-params" type="text" value="${escAttr(JSON.stringify(m.params || {}))}" placeholder='{"duration":4000}' />
      `;
      row.querySelector('.m-gift').addEventListener('input', (e) => { mappings[idx].gift = e.target.value; });
      row.querySelector('.m-action').addEventListener('change', (e) => { mappings[idx].action = e.target.value; });
      row.querySelector('.m-params').addEventListener('input', (e) => {
        try { mappings[idx].params = JSON.parse(e.target.value || '{}'); e.target.style.borderColor = '#2c3645'; }
        catch (_) { e.target.style.borderColor = '#ff4d4f'; }
      });
      row.querySelector('.del').addEventListener('click', () => { mappings.splice(idx, 1); renderMappings(); });
      container.appendChild(row);
    });
  }

  $('btn-add-mapping').addEventListener('click', () => {
    mappings.push({ gift: '', action: actionsCatalog[0] ? actionsCatalog[0].id : 'spawnCone', params: {} });
    renderMappings();
  });

  $('btn-save').addEventListener('click', async () => {
    const status = $('save-status');
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      status.textContent = 'Guardado';
      setTimeout(() => (status.textContent = ''), 2000);
    } catch (err) {
      status.textContent = 'Error al guardar';
    }
  });

  window.reloadMappings = loadConfig;

  async function loadConfig() {
    const res = await fetch('/api/config');
    const data = await res.json();
    mappings = Array.isArray(data.mappings) ? data.mappings : [];
    renderMappings();
  }

  function escAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  // --- Inicializacion ---
  async function init() {
    const res = await fetch('/api/actions');
    const data = await res.json();
    actionsCatalog = data.actions || [];
    buildSimulator();
    await loadConfig();
  }

  init();
})();
