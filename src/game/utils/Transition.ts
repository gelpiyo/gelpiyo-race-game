import Phaser from 'phaser';

export class Transition {
  /**
   * Plays a shutter open animation (black bars sliding UP and DOWN to reveal the scene)
   * Should be called in scene's `create` method.
   */
  static playShutterOpen(scene: Phaser.Scene, duration: number = 400, onComplete?: () => void): void {
    const w = scene.cameras.main.width;
    const h = scene.cameras.main.height;
    const halfH = h / 2;

    const topBar = scene.add.rectangle(0, 0, w, halfH, 0x000000).setOrigin(0, 0).setDepth(1000);
    const bottomBar = scene.add.rectangle(0, h, w, halfH, 0x000000).setOrigin(0, 1).setDepth(1000);

    // Glowing cyan edges for the shutters
    const topGlow = scene.add.rectangle(0, halfH, w, 4, 0x0ea5e9).setOrigin(0, 1).setDepth(1001);
    const bottomGlow = scene.add.rectangle(0, halfH, w, 4, 0x0ea5e9).setOrigin(0, 0).setDepth(1001);

    scene.tweens.add({
      targets: [topBar, topGlow],
      y: -halfH - 10,
      duration: duration,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        topBar.destroy();
        topGlow.destroy();
      }
    });

    scene.tweens.add({
      targets: [bottomBar, bottomGlow],
      y: h + halfH + 10,
      duration: duration,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        bottomBar.destroy();
        bottomGlow.destroy();
        if (onComplete) onComplete();
      }
    });
  }

  /**
   * Plays a shutter close animation (black bars sliding to the center to cover the scene)
   * Call this right before transitioning to a new scene.
   */
  static playShutterClose(scene: Phaser.Scene, duration: number = 400, onComplete?: () => void): void {
    const w = scene.cameras.main.width;
    const h = scene.cameras.main.height;
    const halfH = h / 2;

    const topBar = scene.add.rectangle(0, -halfH, w, halfH, 0x000000).setOrigin(0, 0).setDepth(1000);
    const bottomBar = scene.add.rectangle(0, h + halfH, w, halfH, 0x000000).setOrigin(0, 1).setDepth(1000);

    const topGlow = scene.add.rectangle(0, 0, w, 4, 0x0ea5e9).setOrigin(0, 1).setDepth(1001);
    const bottomGlow = scene.add.rectangle(0, h, w, 4, 0x0ea5e9).setOrigin(0, 0).setDepth(1001);

    scene.tweens.add({
      targets: [topBar, topGlow],
      y: { value: halfH, from: -halfH },
      duration: duration,
      ease: 'Cubic.easeOut'
    });

    scene.tweens.add({
      targets: [bottomBar, bottomGlow],
      y: { value: halfH, from: h + halfH },
      duration: duration,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }
}
