// Runner 3D estilo Subway Surfers con Three.js. Un personaje animado corre por
// una via de 3 carriles con la camara detras; los obstaculos vienen de frente.
// Expone window.GAME (metodos invocados por las acciones de regalo) y window.UI
// (banner/HUD), de modo que actions.js y socket.js no cambian.
(function () {
  const LANES = [-2.2, 0, 2.2];
  const PLAYER_Z = 0;
  const SPAWN_Z = -90;
  const DESPAWN_Z = 12;

  let scene, camera, renderer, clock;
  let player, playerParts;
  const obstacles = [];
  const coins = [];
  const scrollers = []; // elementos del decorado que se reciclan para dar sensacion de avance

  // Estado de juego
  let laneIndex = 1;
  let targetX = 0;
  let baseSpeed = 16;
  let speed = baseSpeed;
  let speedMul = 1;
  let distance = 0;
  let score = 0;
  let coinCount = 0;
  let gameOver = false;

  // Estado del personaje
  let runPhase = 0;
  let isJumping = false;
  let jumpT = 0;
  let isDucking = false;
  let duckTimer = 0;

  // Powerups (timestamps en segundos)
  let now = 0;
  let magnetUntil = 0;
  let shieldUntil = 0;
  let boostUntil = 0;

  // Timers de spawn
  let obstacleAcc = 0;
  let coinAcc = 0;

  // ---------- Construccion de la escena ----------
  function init() {
    const container = document.getElementById('game');
    const W = 480, H = 720;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87b7e8);
    scene.fog = new THREE.Fog(0x87b7e8, 30, 85);

    camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
    camera.position.set(0, 5.2, 8.5);
    camera.lookAt(0, 1.4, -10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(-6, 14, 6);
    sun.castShadow = true;
    scene.add(sun);

    buildTrack();
    buildScenery();
    buildPlayer();

    clock = new THREE.Clock();
    bindInput();
    animate();
  }

  function buildTrack() {
    // Suelo de la via.
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a4250 });
    const road = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 220), roadMat);
    road.position.set(0, -0.25, -90);
    road.receiveShadow = true;
    scene.add(road);

    // Cesped lateral.
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4c8c43 });
    [-1, 1].forEach((s) => {
      const g = new THREE.Mesh(new THREE.BoxGeometry(30, 0.4, 220), grassMat);
      g.position.set(s * 19, -0.3, -90);
      scene.add(g);
    });

    // Lineas divisorias entre carriles (se reciclan para simular movimiento).
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xf2d23a });
    for (let i = 0; i < 40; i++) {
      [-1.1, 1.1].forEach((x) => {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 1.6), lineMat);
        dash.position.set(x, 0.02, -i * 3);
        scene.add(dash);
        scrollers.push({ mesh: dash, span: 120 });
      });
    }
  }

  function buildScenery() {
    // Edificios/postes laterales que avanzan hacia la camara: refuerzan la
    // sensacion de velocidad.
    const palette = [0xc0584f, 0x4f7dc0, 0xc9a24b, 0x6a4fc0, 0x4fb0a0];
    for (let i = 0; i < 26; i++) {
      [-1, 1].forEach((s) => {
        const h = 4 + Math.random() * 12;
        const mat = new THREE.MeshStandardMaterial({ color: palette[(Math.random() * palette.length) | 0] });
        const b = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 2, h, 3 + Math.random() * 2), mat);
        b.position.set(s * (7 + Math.random() * 6), h / 2 - 0.3, -i * 7 - Math.random() * 4);
        b.castShadow = true;
        scene.add(b);
        scrollers.push({ mesh: b, span: 190 });
      });
    }
  }

  // ---------- Personaje animado (estilo Elmo: monstruo rojo y peludo) ----------
  // Construido con geometria propia, NO con assets oficiales de Elmo (marca de
  // Sesame Workshop). Es una interpretacion original del estilo.
  function buildPlayer() {
    player = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: 0xff2b2b, roughness: 0.95 });
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const black = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xff7b1a, roughness: 0.6 });

    // Torso redondeado y rojo.
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 18), fur);
    torso.position.y = 1.15;
    torso.scale.set(1, 1.15, 0.9);
    torso.castShadow = true;
    player.add(torso);

    // Cabeza grande.
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 22, 22), fur);
    head.position.y = 1.95;
    head.castShadow = true;
    player.add(head);

    // Ojos grandes (esferas blancas juntas) con pupilas.
    const eyeGeo = new THREE.SphereGeometry(0.17, 16, 16);
    [-0.16, 0.16].forEach((x) => {
      const eye = new THREE.Mesh(eyeGeo, white);
      eye.position.set(x, 2.08, 0.4);
      player.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), black);
      pupil.position.set(x, 2.08, 0.55);
      player.add(pupil);
    });

    // Nariz naranja ovalada.
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), orange);
    nose.position.set(0, 1.9, 0.48);
    nose.scale.set(1.2, 0.95, 1);
    player.add(nose);

    // Boca: medio toro oscuro a modo de sonrisa.
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 8, 18, Math.PI), black);
    mouth.position.set(0, 1.74, 0.44);
    mouth.rotation.z = Math.PI;
    player.add(mouth);

    // Brazos rojos (pivote en el hombro).
    const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const leftArm = limb(armGeo, fur, -0.58, 1.4);
    const rightArm = limb(armGeo, fur, 0.58, 1.4);
    player.add(leftArm.pivot, rightArm.pivot);

    // Piernas rojas (pivote en la cadera).
    const legGeo = new THREE.BoxGeometry(0.24, 0.7, 0.24);
    const leftLeg = limb(legGeo, fur, -0.2, 0.72);
    const rightLeg = limb(legGeo, fur, 0.2, 0.72);
    player.add(leftLeg.pivot, rightLeg.pivot);

    // Pies.
    [-0.2, 0.2].forEach((x) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.44), fur);
      f.position.set(x, 0.08, 0.1);
      player.add(f);
    });

    player.position.set(LANES[laneIndex], 0, PLAYER_Z);
    scene.add(player);

    playerParts = { leftArm, rightArm, leftLeg, rightLeg, torso, head };

    // Escudo (esfera translucida)
    const sh = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x25f4ee, transparent: true, opacity: 0.28 })
    );
    sh.position.y = 1.1;
    sh.visible = false;
    player.add(sh);
    playerParts.shield = sh;
  }

  // Crea una extremidad con pivote en su extremo superior.
  function limb(geo, mat, x, pivotY) {
    const pivot = new THREE.Group();
    pivot.position.set(x, pivotY, 0);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -geo.parameters.height / 2;
    mesh.castShadow = true;
    pivot.add(mesh);
    return { pivot, mesh };
  }

  // ---------- Entrada ----------
  function bindInput() {
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft': changeLane(-1); break;
        case 'ArrowRight': changeLane(1); break;
        case 'ArrowUp': jump(); break;
        case 'ArrowDown': duck(); break;
        case ' ': if (gameOver) restart(); break;
      }
    });

    let downX = 0, downY = 0;
    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
    el.addEventListener('pointerup', (e) => {
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 25) changeLane(dx > 0 ? 1 : -1);
        else if (gameOver) restart();
      } else {
        if (dy < -25) jump();
        else if (dy > 25) duck();
        else if (gameOver) restart();
      }
    });
  }

  function changeLane(dir) {
    if (gameOver) return;
    laneIndex = Math.max(0, Math.min(LANES.length - 1, laneIndex + dir));
    targetX = LANES[laneIndex];
  }

  function jump() {
    if (gameOver || isJumping) return;
    isJumping = true;
    jumpT = 0;
  }

  function duck() {
    if (gameOver || isDucking) return;
    isDucking = true;
    duckTimer = 0.55;
  }

  // ---------- Spawns ----------
  function spawnObstacle(type, lane) {
    if (lane == null || lane < 0) lane = (Math.random() * 3) | 0;
    const x = LANES[Math.max(0, Math.min(2, lane))];
    let mesh, kind = type;
    if (type === 'car') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 2.4),
        new THREE.MeshStandardMaterial({ color: 0xfe2c55 }));
      mesh.position.set(x, 0.6, SPAWN_Z);
    } else if (type === 'barrier') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
      mesh.position.set(x, 1.5, SPAWN_Z); // elevada: hay que agacharse para pasar
    } else {
      kind = 'cone';
      mesh = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 12),
        new THREE.MeshStandardMaterial({ color: 0xffa502 }));
      mesh.position.set(x, 0.45, SPAWN_Z);
    }
    mesh.castShadow = true;
    mesh.userData = { kind, checked: false };
    scene.add(mesh);
    obstacles.push(mesh);
    return mesh;
  }

  function spawnCoin(lane) {
    if (lane == null) lane = (Math.random() * 3) | 0;
    const c = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 10, 20),
      new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x4a3a00 }));
    c.position.set(LANES[lane], 1.0, SPAWN_Z);
    c.rotation.x = Math.PI / 2;
    scene.add(c);
    coins.push(c);
  }

  // ---------- Bucle ----------
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    now += dt;
    if (!gameOver) update(dt);
    renderer.render(scene, camera);
  }

  function update(dt) {
    if (now >= boostUntil && speedMul !== 1) speedMul = 1;
    speed = (baseSpeed + distance * 0.02) * speedMul;
    distance += speed * dt * 0.1;
    score += speed * dt * 0.05;

    // Decorado y lineas en bucle.
    for (const s of scrollers) {
      s.mesh.position.z += speed * dt;
      if (s.mesh.position.z > DESPAWN_Z) s.mesh.position.z -= s.span;
    }

    // Movimiento lateral suave del jugador + camara.
    player.position.x += (targetX - player.position.x) * Math.min(1, dt * 14);
    camera.position.x += (player.position.x * 0.5 - camera.position.x) * Math.min(1, dt * 6);

    animateRun(dt);

    // Obstaculos.
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.position.z += speed * dt;
      if (!o.userData.checked && o.position.z > PLAYER_Z - 0.9) {
        o.userData.checked = true;
        checkObstacle(o);
      }
      if (o.position.z > DESPAWN_Z) { scene.remove(o); obstacles.splice(i, 1); }
    }

    // Monedas.
    const magnetOn = now < magnetUntil;
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.position.z += speed * dt;
      c.rotation.z += dt * 5;
      if (magnetOn && c.position.z > -25) {
        c.position.x += (player.position.x - c.position.x) * Math.min(1, dt * 6);
        c.position.y += (1.0 - c.position.y) * Math.min(1, dt * 6);
      }
      const near = Math.abs(c.position.z - PLAYER_Z) < 1 && Math.abs(c.position.x - player.position.x) < 0.9;
      if (near) { scene.remove(c); coins.splice(i, 1); coinCount++; score += 10; continue; }
      if (c.position.z > DESPAWN_Z) { scene.remove(c); coins.splice(i, 1); }
    }

    // Spawns por tiempo.
    obstacleAcc += dt;
    if (obstacleAcc > 1.05) { obstacleAcc = 0; spawnObstacle(['car', 'cone', 'barrier'][(Math.random() * 3) | 0], -1); }
    coinAcc += dt;
    if (coinAcc > 0.6) { coinAcc = 0; spawnCoin(); }

    playerParts.shield.visible = now < shieldUntil;
    syncHud();
  }

  function animateRun(dt) {
    // Salto (parabola) y agachado.
    let baseY = 0;
    if (isJumping) {
      jumpT += dt;
      const T = 0.7;
      const p = jumpT / T;
      if (p >= 1) { isJumping = false; baseY = 0; }
      else baseY = Math.sin(p * Math.PI) * 2.2;
    }
    if (isDucking) {
      duckTimer -= dt;
      if (duckTimer <= 0) isDucking = false;
    }
    player.position.y = baseY;
    const squash = isDucking ? 0.55 : 1;
    player.scale.y += (squash - player.scale.y) * Math.min(1, dt * 16);

    // Balanceo de extremidades (mas rapido a mayor velocidad).
    runPhase += dt * speed * 0.9;
    const swing = isJumping ? 0.5 : Math.sin(runPhase) * 0.9;
    const aswing = isJumping ? -0.6 : Math.sin(runPhase) * 0.7;
    playerParts.leftLeg.pivot.rotation.x = swing;
    playerParts.rightLeg.pivot.rotation.x = -swing;
    playerParts.leftArm.pivot.rotation.x = -aswing;
    playerParts.rightArm.pivot.rotation.x = aswing;
    playerParts.torso.rotation.x = 0.12; // ligera inclinacion al correr
  }

  function checkObstacle(o) {
    if (Math.abs(o.position.x - player.position.x) > 1.1) return; // otro carril
    if (now < shieldUntil) { flash(0x25f4ee); scene.remove(o); const i = obstacles.indexOf(o); if (i >= 0) obstacles.splice(i, 1); return; }
    if (o.userData.kind === 'cone' && isJumping) return;
    if (o.userData.kind === 'barrier' && isDucking) return;
    endGame();
  }

  function flash(color) {
    const c = new THREE.Color(color);
    scene.background = c;
    setTimeout(() => { scene.background = new THREE.Color(0x87b7e8); }, 90);
  }

  // ---------- Acciones de regalo (interfaz usada por actions.js) ----------
  function boost(multiplier, duration) {
    speedMul = multiplier || 1.8;
    boostUntil = now + (duration || 4000) / 1000;
    flash(0x25f4ee);
  }
  function forcePlayerAction(mode) { mode === 'duck' ? duck() : jump(); }
  function activateMagnet(duration) { magnetUntil = now + (duration || 6000) / 1000; }
  function activateShield(duration) { shieldUntil = now + (duration || 5000) / 1000; }
  function obstacleRain(count) {
    const n = count || 6;
    for (let i = 0; i < n; i++) {
      setTimeout(() => { if (!gameOver) spawnObstacle(['car', 'cone', 'barrier'][(Math.random() * 3) | 0], -1); }, i * 170);
    }
  }

  // ---------- Estado ----------
  function endGame() {
    gameOver = true;
    document.getElementById('over-score').textContent = 'Score ' + Math.floor(score) + '   Monedas ' + coinCount;
    document.getElementById('hud-over').style.display = 'flex';
    flash(0xff4d4f);
  }

  function restart() {
    obstacles.forEach((o) => scene.remove(o));
    coins.forEach((c) => scene.remove(c));
    obstacles.length = 0; coins.length = 0;
    laneIndex = 1; targetX = 0;
    player.position.set(0, 0, PLAYER_Z); player.scale.y = 1;
    speed = baseSpeed; speedMul = 1; distance = 0; score = 0; coinCount = 0;
    isJumping = isDucking = false; jumpT = 0; duckTimer = 0;
    magnetUntil = shieldUntil = boostUntil = 0;
    obstacleAcc = coinAcc = 0;
    gameOver = false;
    document.getElementById('hud-over').style.display = 'none';
  }

  function syncHud() {
    document.getElementById('hud-score').textContent = 'Score ' + Math.floor(score);
    document.getElementById('hud-coins').textContent = 'Monedas ' + coinCount;
    document.getElementById('hud-dist').textContent = 'Dist ' + Math.floor(distance) + ' m';
    const p = [];
    if (now < boostUntil) p.push('PROPULSION');
    if (now < magnetUntil) p.push('IMAN');
    if (now < shieldUntil) p.push('ESCUDO');
    document.getElementById('hud-power').textContent = p.join('\n');
  }

  // ---------- Interfaces globales ----------
  window.GAME = {
    get gameOver() { return gameOver; },
    boost, spawnObstacle, forcePlayerAction, activateMagnet, activateShield, obstacleRain,
    restart
  };

  window.UI = {
    flashBanner(text) {
      const b = document.getElementById('hud-banner');
      if (!b) return;
      b.textContent = text;
      b.style.opacity = '1';
      clearTimeout(b._t);
      b._t = setTimeout(() => { b.style.opacity = '0'; }, 1100);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
