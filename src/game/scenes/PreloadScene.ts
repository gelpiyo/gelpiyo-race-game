import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Load just the loading background here so it's instantly available for BootScene
    this.load.image('loading_bg', 'assets/ui/loading_bg.png');
  }

  create(): void {
    this.scene.start('BootScene');
  }
}
