import Phaser from 'phaser';
import { CourseGenerator } from '../course/CourseGenerator';
import { CHARACTERS } from '../config/CharacterConfig';
import { Transition } from '../utils/Transition';

export class BootScene extends Phaser.Scene {
  private courseGenerator!: CourseGenerator;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const bg = this.add.image(w / 2, h / 2, 'loading_bg');
    bg.setDisplaySize(w, h);

    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.5);

    this.add.text(w / 2, h / 2 - 80, 'SYSTEM INITIALIZING...', {
      fontSize: '24px',
      fontFamily: 'Impact',
      color: '#0ea5e9',
      letterSpacing: 4
    }).setOrigin(0.5);

    const loadingText = this.add.text(w / 2, h / 2 - 30, 'LOADING DATA', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    const barW = 280;
    this.add.rectangle(w / 2, h / 2 + 20, barW + 8, 20, 0x0f172a).setStrokeStyle(2, 0x0ea5e9);
    const bar = this.add.rectangle(w / 2 - barW / 2, h / 2 + 20, 0, 12, 0x0ea5e9).setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      bar.width = barW * value;
      loadingText.setText(`LOADING DATA... [${Math.floor(value * 100)}%]`);
    });

    this.load.on('complete', () => {
      loadingText.setText('SYSTEM READY');
    });

    for (const char of CHARACTERS) {
      this.load.image(`char_game_${char.id}`, char.gameSprite);
    }

    for (const char of CHARACTERS) {
      this.load.image(`char_sys_${char.id}`, char.systemImage);
    }

    this.load.image('title_bg', 'assets/ui/title_bg_new.png');
    this.load.image('result_bg', 'result_bg.png');
    this.load.image('item_egg', 'item_egg.png');
    this.load.image('char_select_bg', 'assets/ui/char_select_bg.png');
    this.load.image('logo', 'assets/ui/logo.png');

    // Load course textures
    this.load.image('track_pattern', 'assets/course/track_pattern.png');
    this.load.image('ground_pattern', 'assets/course/ground_pattern.png');
  }

  create(): void {
    this.courseGenerator = new CourseGenerator();
    
    // Extract HTMLImageElements from loaded textures
    const groundTex = this.textures.get('ground_pattern').getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const trackTex = this.textures.get('track_pattern').getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    
    // Some browsers return HTMLImageElement, some return HTMLCanvasElement. 
    // Both work with ctx.createPattern.
    const courseCanvas = this.courseGenerator.generate(groundTex as HTMLImageElement, trackTex as HTMLImageElement);
    this.textures.addCanvas('courseTexture', courseCanvas);

    this.registry.set('courseGenerator', this.courseGenerator);

    this.time.delayedCall(500, () => {
      Transition.playShutterClose(this, 300, () => {
        this.scene.start('TitleScene');
      });
    });
  }
}
