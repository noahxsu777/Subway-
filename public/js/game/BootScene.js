// Genera texturas con formas simples (sin assets externos) para evitar depender
// de sprites con copyright. Facilmente reemplazables por imagenes reales.
class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.makeRect('player', 46, 60, 0x25f4ee, 0x0e1116);
    this.makeRect('car', 64, 90, 0xfe2c55, 0x2a0c14);
    this.makeRect('cone', 34, 40, 0xffa502, 0x7a4b00);
    this.makeRect('barrier', 90, 28, 0xf1c40f, 0x6b5800);
    this.makeCoin('coin', 16, 0xffd166);
    this.makeRect('shieldfx', 70, 80, 0x25f4ee, 0x25f4ee, 0.25);

    this.scene.start('Game');
    this.scene.launch('UI');
  }

  makeRect(key, w, h, fill, stroke, alpha = 1) {
    const g = this.add.graphics();
    g.fillStyle(fill, alpha);
    g.fillRoundedRect(0, 0, w, h, 8);
    g.lineStyle(3, stroke, 1);
    g.strokeRoundedRect(1.5, 1.5, w - 3, h - 3, 8);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  makeCoin(key, r, fill) {
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillCircle(r, r, r);
    g.lineStyle(3, 0xb8860b, 1);
    g.strokeCircle(r, r, r - 1.5);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }
}
