// Runner de 3 carriles. El mundo se desplaza hacia el jugador (los obstaculos
// caen desde arriba). Expone metodos publicos que las acciones de regalo invocan.
class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init() {
    this.lanes = [120, 240, 360];
    this.laneIndex = 1;
    this.baseSpeed = 280;          // px/seg de descenso de obstaculos
    this.speed = this.baseSpeed;
    this.speedMul = 1;             // multiplicador por propulsion
    this.distance = 0;
    this.score = 0;
    this.coins = 0;
    this.gameOver = false;

    this.isJumping = false;
    this.isDucking = false;
    this.magnetUntil = 0;
    this.shieldUntil = 0;
    this.boostUntil = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.playerY = height - 120;

    // Fondo y lineas de carril (efecto de movimiento).
    this.add.rectangle(width / 2, height / 2, width, height, 0x10151c);
    this.add.rectangle(width / 2, height / 2, this.lanes[2] - this.lanes[0] + 90, height, 0x1a212b);
    this.laneLines = [];
    for (let i = 0; i < 14; i++) {
      const ln = this.add.rectangle(width / 2, (i * 60), 6, 34, 0x2c3645);
      this.laneLines.push(ln);
    }

    // Jugador.
    this.player = this.physics.add.sprite(this.lanes[this.laneIndex], this.playerY, 'player');
    this.player.setDepth(10);
    this.shieldSprite = this.add.sprite(this.player.x, this.player.y, 'shieldfx').setVisible(false).setDepth(11);

    // Grupos.
    this.obstacles = this.physics.add.group();
    this.coinsGroup = this.physics.add.group();

    this.physics.add.overlap(this.player, this.obstacles, this.handleObstacle, null, this);
    this.physics.add.overlap(this.player, this.coinsGroup, this.collectCoin, null, this);

    // Entrada.
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-LEFT', () => this.changeLane(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.changeLane(1));
    this.input.keyboard.on('keydown-UP', () => this.jump());
    this.input.keyboard.on('keydown-DOWN', () => this.duck());
    this.input.keyboard.on('keydown-SPACE', () => { if (this.gameOver) this.restart(); });

    // Soporte tactil / swipe basico.
    this.input.on('pointerup', (p) => {
      const dx = p.upX - p.downX;
      const dy = p.upY - p.downY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) this.changeLane(dx > 0 ? 1 : -1);
      } else {
        if (dy < -30) this.jump();
        else if (dy > 30) this.duck();
      }
      if (this.gameOver) this.restart();
    });

    // Temporizadores de spawn.
    this.obstacleTimer = this.time.addEvent({ delay: 1100, loop: true, callback: this.spawnRandomObstacle, callbackScope: this });
    this.coinTimer = this.time.addEvent({ delay: 700, loop: true, callback: this.spawnCoinRow, callbackScope: this });

    // Hacer la escena accesible para las acciones de regalo.
    window.GAME = this;
  }

  update(time, delta) {
    if (this.gameOver) return;
    const dt = delta / 1000;

    // Acelerar gradualmente con la distancia.
    this.speed = (this.baseSpeed + this.distance * 0.02) * this.speedMul;
    this.distance += this.speed * dt * 0.1;
    this.score += this.speed * dt * 0.01;

    // Lineas de carril en bucle.
    this.laneLines.forEach((ln) => {
      ln.y += this.speed * dt;
      if (ln.y > this.scale.height) ln.y -= this.scale.height + 34;
    });

    // Mover obstaculos y monedas hacia abajo.
    const limit = this.scale.height + 60;
    this.obstacles.children.iterate((o) => {
      if (!o) return;
      o.y += this.speed * dt;
      if (o.y > limit) { o.destroy(); }
    });

    const magnetOn = time < this.magnetUntil;
    this.coinsGroup.children.iterate((c) => {
      if (!c) return;
      c.y += this.speed * dt;
      if (magnetOn) {
        c.x += (this.player.x - c.x) * 0.12;
        c.y += (this.player.y - c.y) * 0.08;
      }
      if (c.y > limit) c.destroy();
    });

    // Estado de powerups.
    this.shieldSprite.setVisible(time < this.shieldUntil);
    this.shieldSprite.setPosition(this.player.x, this.player.y);
    if (time >= this.boostUntil && this.speedMul !== 1) this.speedMul = 1;

    this.player.setTint(this.isDucking ? 0x9bd1ff : 0xffffff);

    this.syncHud();
  }

  // --- Controles ---
  changeLane(dir) {
    if (this.gameOver) return;
    this.laneIndex = Phaser.Math.Clamp(this.laneIndex + dir, 0, this.lanes.length - 1);
    this.tweens.add({ targets: this.player, x: this.lanes[this.laneIndex], duration: 110, ease: 'Quad.out' });
  }

  jump() {
    if (this.gameOver || this.isJumping) return;
    this.isJumping = true;
    this.tweens.add({
      targets: this.player,
      scaleX: 1.25, scaleY: 1.25,
      duration: 230, yoyo: true, ease: 'Quad.out',
      onComplete: () => { this.isJumping = false; }
    });
  }

  duck() {
    if (this.gameOver || this.isDucking) return;
    this.isDucking = true;
    this.player.setScale(1, 0.55);
    this.time.delayedCall(450, () => { this.isDucking = false; this.player.setScale(1, 1); });
  }

  // --- Spawns ---
  spawnRandomObstacle() {
    if (this.gameOver) return;
    const types = ['car', 'cone', 'barrier'];
    const type = Phaser.Utils.Array.GetRandom(types);
    this.spawnObstacle(type, Phaser.Math.Between(0, 2));
  }

  spawnObstacle(type, lane) {
    if (lane == null || lane < 0) lane = Phaser.Math.Between(0, 2);
    const key = ['car', 'cone', 'barrier'].includes(type) ? type : 'cone';
    const o = this.obstacles.create(this.lanes[lane], -60, key);
    o.kind = key;
    o.setDepth(5);
    return o;
  }

  spawnCoinRow() {
    if (this.gameOver) return;
    const lane = Phaser.Math.Between(0, 2);
    const c = this.coinsGroup.create(this.lanes[lane], -30, 'coin');
    c.setDepth(4);
  }

  // --- Colisiones ---
  handleObstacle(player, obstacle) {
    if (this.gameOver) return;
    const time = this.time.now;
    if (time < this.shieldUntil) { obstacle.destroy(); return; }

    // Esquivar segun el tipo: cono (saltar), barrera (agacharse). El carro
    // solo se evita cambiando de carril.
    if (obstacle.kind === 'cone' && this.isJumping) return;
    if (obstacle.kind === 'barrier' && this.isDucking) return;

    this.endGame();
  }

  collectCoin(player, coin) {
    coin.destroy();
    this.coins += 1;
    this.score += 10;
  }

  // --- Metodos invocados por las ACCIONES de regalo ---
  boost(multiplier = 1.8, duration = 4000) {
    this.speedMul = multiplier;
    this.boostUntil = this.time.now + duration;
    this.cameras.main.flash(150, 37, 244, 238);
  }

  forcePlayerAction(mode) {
    if (mode === 'duck') this.duck();
    else this.jump();
  }

  activateMagnet(duration = 6000) {
    this.magnetUntil = this.time.now + duration;
  }

  activateShield(duration = 5000) {
    this.shieldUntil = this.time.now + duration;
  }

  obstacleRain(count = 6) {
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 180, () => {
        const types = ['car', 'cone', 'barrier'];
        this.spawnObstacle(Phaser.Utils.Array.GetRandom(types), Phaser.Math.Between(0, 2));
      });
    }
  }

  // --- Estado ---
  endGame() {
    this.gameOver = true;
    this.obstacleTimer.paused = true;
    this.coinTimer.paused = true;
    this.cameras.main.shake(200, 0.01);
    this.player.setTint(0xff4d4f);
    this.events.emit('gameover', { score: Math.floor(this.score), coins: this.coins });
  }

  restart() {
    this.scene.restart();
    this.events.emit('restart');
  }

  syncHud() {
    this.events.emit('hud', {
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      coins: this.coins,
      boost: this.time.now < this.boostUntil,
      magnet: this.time.now < this.magnetUntil,
      shield: this.time.now < this.shieldUntil
    });
  }
}
