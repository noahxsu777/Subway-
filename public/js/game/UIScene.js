// HUD superpuesto: score, distancia, monedas, estado de powerups y overlay de
// game over. Escucha eventos emitidos por GameScene.
class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    const style = { fontFamily: 'monospace', fontSize: '18px', color: '#e8edf2' };
    this.scoreText = this.add.text(14, 12, 'Score 0', style);
    this.coinText = this.add.text(14, 36, 'Monedas 0', { ...style, color: '#ffd166' });
    this.distText = this.add.text(14, 60, 'Dist 0 m', { ...style, color: '#8a95a5' });

    this.powerText = this.add.text(this.scale.width - 14, 12, '', {
      ...style, color: '#25f4ee', align: 'right'
    }).setOrigin(1, 0);

    this.banner = this.add.text(this.scale.width / 2, 110, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#fff',
      backgroundColor: '#fe2c55', padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setAlpha(0).setDepth(50);

    this.overlay = this.add.container(this.scale.width / 2, this.scale.height / 2).setDepth(60).setVisible(false);
    const bg = this.add.rectangle(0, 0, 320, 180, 0x000000, 0.75).setStrokeStyle(2, 0xfe2c55);
    this.overTitle = this.add.text(0, -40, 'GAME OVER', { fontFamily: 'monospace', fontSize: '28px', color: '#fe2c55' }).setOrigin(0.5);
    this.overScore = this.add.text(0, 6, '', { fontFamily: 'monospace', fontSize: '16px', color: '#fff' }).setOrigin(0.5);
    this.overHint = this.add.text(0, 46, 'Toca o pulsa ESPACIO para reiniciar', { fontFamily: 'monospace', fontSize: '12px', color: '#8a95a5' }).setOrigin(0.5);
    this.overlay.add([bg, this.overTitle, this.overScore, this.overHint]);

    const game = this.scene.get('Game');
    game.events.on('hud', this.updateHud, this);
    game.events.on('gameover', this.showGameOver, this);
    game.events.on('restart', () => this.overlay.setVisible(false), this);

    // API para mostrar el nombre de la accion/regalo entrante.
    window.UI = this;
  }

  updateHud(d) {
    this.scoreText.setText('Score ' + d.score);
    this.coinText.setText('Monedas ' + d.coins);
    this.distText.setText('Dist ' + d.distance + ' m');
    const p = [];
    if (d.boost) p.push('PROPULSION');
    if (d.magnet) p.push('IMAN');
    if (d.shield) p.push('ESCUDO');
    this.powerText.setText(p.join('\n'));
  }

  showGameOver(d) {
    this.overScore.setText('Score ' + d.score + '   Monedas ' + d.coins);
    this.overlay.setVisible(true);
  }

  flashBanner(text) {
    this.banner.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 900, duration: 500 });
  }
}
