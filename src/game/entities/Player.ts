import { Kart } from './Kart';
import type { CharacterDef } from '../config/CharacterConfig';
import { CourseGenerator } from '../course/CourseGenerator';
import type { InputState } from '../input/TouchController';

export class Player extends Kart {
  constructor(character: CharacterDef) {
    super();
    this.characterId = character.id;
    this.speedMax = character.stats.speedMax;
    this.acceleration = character.stats.acceleration;
    this.turnRate = character.stats.turnRate;
    this.jumpPower = character.stats.jumpPower;
    this.collisionForce = character.stats.collisionForce;
    this.spriteKey = `char_game_${character.id}`;
  }

  updateWithInput(dt: number, course: CourseGenerator, input: InputState): void {
    this.update(
      dt, course,
      input.accelerate,
      input.brake,
      input.left,
      input.right,
      input.steerValue
    );

    if (input.jump) {
      this.jump();
    }
  }

  useItem(): string | null {
    const item = this.state.itemSlot;
    if (!item) return null;

    this.state.itemSlot = null;

    switch (item) {
      case 'senbei':
        this.state.boostTimer = 5.0;
        this.state.speed = Math.min(this.state.speed + 80, this.speedMax * 1.4);
        break;
      case 'gelpiyo':
        this.state.invincibleTimer = 10.0;
        this.state.boostTimer = 10.0; // speed 30% up handled in Kart.update via boostTimer
        break;
      case 'egg':
      case 'soccer_ball':
        // Effects handled externally in RaceScene
        break;
    }

    return item;
  }

  collectItem(itemType: string): boolean {
    if (this.state.itemSlot !== null) return false;
    this.state.itemSlot = itemType;
    return true;
  }
}
