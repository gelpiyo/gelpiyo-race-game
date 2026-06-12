import { Camera } from './Camera';
import { CourseGenerator } from '../course/CourseGenerator';
import { GAME_WIDTH, GAME_HEIGHT, HORIZON_Y } from '../config/GameConfig';

export class Mode7Renderer {
  private camera: Camera;
  private course: CourseGenerator;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private pixels: Uint32Array;
  private skyGradient: Uint32Array;

  constructor(camera: Camera, course: CourseGenerator) {
    this.camera = camera;
    this.course = course;
    this.canvas = document.createElement('canvas');
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.imageData = this.ctx.createImageData(GAME_WIDTH, GAME_HEIGHT);
    this.pixels = new Uint32Array(this.imageData.data.buffer);
    
    // Sunny Sky Gradient (Top to Horizon)
    // Top: Deep Sky Blue (e.g. 56, 189, 248) -> Horizon: Light Cyan/White (e.g. 224, 242, 254)
    this.skyGradient = new Uint32Array(HORIZON_Y);
    for (let y = 0; y < HORIZON_Y; y++) {
      const t = y / HORIZON_Y;
      const r = Math.floor(56 * (1 - t) + 224 * t);
      const g = Math.floor(189 * (1 - t) + 242 * t);
      const b = Math.floor(248 * (1 - t) + 254 * t);
      this.skyGradient[y] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
  }

  render(scene: Phaser.Scene): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const camX = this.camera.x;
    const camY = this.camera.y;
    const camAngle = this.camera.angle;
    const camHeight = this.camera.height;
    const fov = this.camera.fov;
    const cosA = Math.cos(camAngle);
    const sinA = Math.sin(camAngle);
    const courseData = this.course.imageData;
    
    if (!courseData) return;

    const texSize = courseData.width;
    const texData = courseData.data;

    // Draw sky
    for (let y = 0; y < HORIZON_Y; y++) {
      const skyColor = this.skyGradient[y];
      const rowStart = y * w;
      for (let x = 0; x < w; x++) {
        this.pixels[rowStart + x] = skyColor;
      }
    }

    // Sunny distance fog (matches horizon color)
    const fogR = 224, fogG = 242, fogB = 254;

    // Draw ground with Mode7 transformation
    for (let y = HORIZON_Y; y < h; y++) {
      const screenY = y - HORIZON_Y;
      const depth = camHeight * fov / (screenY + 1);
      
      const rowStart = y * w;
      const halfW = w / 2;

      for (let x = 0; x < w; x++) {
        const screenX = x - halfW;
        
        // World-space coordinates
        const worldX = camX + (depth * cosA) + (screenX * depth / fov) * (-sinA);
        const worldY = camY + (depth * sinA) + (screenX * depth / fov) * cosA;

        // Texture coordinates with wrapping
        let texX = ((Math.floor(worldX) % texSize) + texSize) % texSize;
        let texY = ((Math.floor(worldY) % texSize) + texSize) % texSize;

        const texIdx = (texY * texSize + texX) * 4;
        const r = texData[texIdx];
        const g = texData[texIdx + 1];
        const b = texData[texIdx + 2];

        // Distance-based fog (maxDepth raised to reduce haze — was 600)
        const maxDepth = 1100;
        const fogFactor = Math.min(depth / maxDepth, 0.65);  // cap at 0.65 so distant areas never go fully white
        const fr = Math.floor(r * (1 - fogFactor) + fogR * fogFactor);
        const fg = Math.floor(g * (1 - fogFactor) + fogG * fogFactor);
        const fb = Math.floor(b * (1 - fogFactor) + fogB * fogFactor);

        this.pixels[rowStart + x] = (255 << 24) | (fb << 16) | (fg << 8) | fr;
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);

    // Draw to Phaser scene
    const tex = scene.textures.get('mode7ground');
    if (tex.key === '__MISSING') {
      scene.textures.addCanvas('mode7ground', this.canvas);
    } else {
      // Important: update the texture source to point to THIS instance's canvas
      // This fixes the bug where restarting the race freezes the background
      if (tex.getSourceImage() !== this.canvas) {
        scene.textures.remove('mode7ground');
        scene.textures.addCanvas('mode7ground', this.canvas);
      } else {
        (tex.source[0] as any).update();
      }
    }
  }

  worldToScreen(
    worldX: number,
    worldY: number,
    worldZ: number = 0
  ): { x: number; y: number; scale: number; visible: boolean } {
    const camX = this.camera.x;
    const camY = this.camera.y;
    const camAngle = this.camera.angle;
    const camHeight = this.camera.height;
    const fov = this.camera.fov;

    // Translate relative to camera
    const dx = worldX - camX;
    const dy = worldY - camY;

    // Rotate into camera space
    const cosA = Math.cos(-camAngle);
    const sinA = Math.sin(-camAngle);
    const cx = dx * cosA - dy * sinA;
    const cy = dx * sinA + dy * cosA;

    // cx is forward distance, cy is lateral
    if (cx <= 5) {
      return { x: 0, y: 0, scale: 0, visible: false };
    }

    const screenX = GAME_WIDTH / 2 + (cy / cx) * fov;
    const groundScreenY = HORIZON_Y + (camHeight * fov) / cx;
    const spriteScreenY = groundScreenY - (worldZ * fov) / cx;
    const scale = fov / cx;

    const visible =
      screenX > -100 &&
      screenX < GAME_WIDTH + 100 &&
      spriteScreenY > -100 &&
      spriteScreenY < GAME_HEIGHT + 100 &&
      cx > 0;

    return { x: screenX, y: spriteScreenY, scale: Math.min(scale, 4), visible };
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
