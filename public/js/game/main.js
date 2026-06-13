// Arranque de Phaser.
const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 480,
  height: 720,
  backgroundColor: '#0e1116',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [BootScene, GameScene, UIScene]
};

window.PHASER_GAME = new Phaser.Game(gameConfig);
