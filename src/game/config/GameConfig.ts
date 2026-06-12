import Phaser from 'phaser';
import { PreloadScene } from '../scenes/PreloadScene';
import { BootScene } from '../scenes/BootScene';
import { TitleScene } from '../scenes/TitleScene';
import { CharSelectScene } from '../scenes/CharSelectScene';
import { CourseSelectScene } from '../scenes/CourseSelectScene';
import { RaceScene } from '../scenes/RaceScene';
import { ResultScene } from '../scenes/ResultScene';

export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 710;
export const MAX_LAPS = 3;
export const COURSE_TEX_SIZE = 4096; // Large course map for clean road separation
export const HORIZON_Y = 180;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#020617', // Very dark blue/black for cyber feel
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloadScene, BootScene, TitleScene, CharSelectScene, CourseSelectScene, RaceScene, ResultScene],
  render: {
    pixelArt: false,
    antialias: true, // Fix jagged text and rendering!
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  input: {
    touch: true,
    keyboard: true,
  },
};
