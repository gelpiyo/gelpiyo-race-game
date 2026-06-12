import { Kart } from './Kart';
import type { CharacterDef } from '../config/CharacterConfig';
import { CourseGenerator } from '../course/CourseGenerator';
import { RacingAI } from '../ai/RacingAI';

export class NPC extends Kart {
  public ai: RacingAI;
  private itemUseTimer: number = 0;

  constructor(character: CharacterDef, waypoints: { x: number; y: number }[]) {
    super();
    this.characterId = character.id;
    this.speedMax = character.stats.speedMax;
    this.acceleration = character.stats.acceleration;
    this.turnRate = character.stats.turnRate;
    this.jumpPower = character.stats.jumpPower;
    this.collisionForce = character.stats.collisionForce;
    this.spriteKey = `char_game_${character.id}`;
    this.ai = new RacingAI(waypoints);
  }

  updateAI(dt: number, course: CourseGenerator, playerX: number, playerY: number, playerLap: number): void {
    const s = this.state;
    const input = this.ai.update(
      s.x, s.y, s.angle, s.speed,
      playerX, playerY,
      playerLap, s.lap
    );

    // Apply rubber band speed modifier
    const rbMult = this.ai.getRubberBandMultiplier();
    const origMax = this.speedMax;
    this.speedMax = origMax * rbMult;

    this.update(dt, course, input.accel, input.brake, input.left, input.right);

    if (input.jump) {
      this.jump();
    }

    this.speedMax = origMax;

    // Random item collection simulation
    if (s.itemSlot === null && Math.random() < 0.005) {
      const items = ['senbei', 'egg', 'soccer_ball', 'gelpiyo'];
      s.itemSlot = items[Math.floor(Math.random() * items.length)];
    }

    // Random item usage
    this.itemUseTimer -= dt;
    if (s.itemSlot && this.itemUseTimer <= 0) {
      this.useNPCItem();
      this.itemUseTimer = 5 + Math.random() * 10;
    }
  }

  private useNPCItem(): void {
    const item = this.state.itemSlot;
    if (!item) return;
    this.state.itemSlot = null;

    switch (item) {
      case 'senbei':
        this.state.boostTimer = 5.0;
        this.state.speed = Math.min(this.state.speed + 80, this.speedMax * 1.4);
        break;
      case 'gelpiyo':
        this.state.invincibleTimer = 10.0;
        this.state.boostTimer = 10.0;
        break;
      case 'egg':
      case 'soccer_ball':
        // NPC projectile items – no self-effect
        break;
    }
  }

  initPosition(x: number, y: number, angle: number): void {
    this.init(x, y, angle);
    this.ai.setStartWaypoint(x, y);
  }
}
