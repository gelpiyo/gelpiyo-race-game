export interface InputState {
  left: boolean;
  right: boolean;
  accelerate: boolean;
  brake: boolean;
  jump: boolean;
  useItem: boolean;
  steerValue: number;  // -1.0 (full left) to +1.0 (full right), 0 = center
}

export class TouchController {
  private state: InputState = {
    left: false, right: false,
    accelerate: false, brake: false,
    jump: false, useItem: false,
    steerValue: 0,
  };

  private keys: Set<string> = new Set();

  constructor() {
    // Keyboard listeners
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Listen for virtual controller events
    window.addEventListener('vpad-input', ((e: CustomEvent<Partial<InputState>>) => {
      Object.assign(this.state, e.detail);
    }) as EventListener);
  }

  getInput(): InputState {
    const kbLeft = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const kbRight = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    // Keyboard gives full ±1.0, vpad gives analog value
    let steer = this.state.steerValue || 0;
    if (kbLeft) steer = -1;
    if (kbRight) steer = 1;

    return {
      left: this.state.left || kbLeft,
      right: this.state.right || kbRight,
      accelerate: this.state.accelerate || this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.keys.has('KeyZ'),
      brake: this.state.brake || this.keys.has('ArrowDown') || this.keys.has('KeyS') || this.keys.has('KeyX'),
      jump: this.state.jump || this.keys.has('Space'),
      useItem: this.state.useItem || this.keys.has('KeyC'),
      steerValue: steer,
    };
  }

  consumeItem(): void {
    this.state.useItem = false;
  }

  consumeJump(): void {
    this.state.jump = false;
  }

  reset(): void {
    this.state = {
      left: false, right: false,
      accelerate: false, brake: false,
      jump: false, useItem: false,
      steerValue: 0,
    };
    this.keys.clear();
  }
}
