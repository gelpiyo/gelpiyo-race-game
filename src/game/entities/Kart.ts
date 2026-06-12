import { CourseGenerator } from '../course/CourseGenerator';

export interface KartState {
  x: number;
  y: number;
  lastValidX: number; // For foolproof collision
  lastValidY: number; // For foolproof collision
  speed: number;
  angle: number;
  angularVel: number;
  isAirborne: boolean;
  airborneTimer: number;
  jumpVelocity: number;
  z: number;
  lap: number;
  checkpointIndex: number;
  finished: boolean;
  finishTime: number;
  itemSlot: string | null;
  invincibleTimer: number;
  boostTimer: number;
  spinTimer: number;
  lapCooldown: number; // frames to prevent double lap count
  prevX: number; // For finish line crossing detection
  prevY: number;
  knockbackVx: number;
  knockbackVy: number;
  steeringInput: number;
  wrongWay: boolean;
}

// Helper: do segments (ax,ay)-(bx,by) and (cx,cy)-(dx,dy) intersect?
function segmentsCross(ax: number, ay: number, bx: number, by: number,
                       cx: number, cy: number, dx: number, dy: number): boolean {
  const d1x = bx - ax, d1y = by - ay;
  const d2x = dx - cx, d2y = dy - cy;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-8) return false; // parallel
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / cross;
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export class Kart {
  public state: KartState;
  public characterId: string = '';
  public speedMax: number = 688;
  public acceleration: number = 1.0;
  public turnRate: number = 1.0;
  public jumpPower: number = 1.0;
  public collisionForce: number = 1.0;
  public radius: number = 30;
  public spriteKey: string = '';

  constructor() {
    this.state = {
      x: 0, y: 0, lastValidX: 0, lastValidY: 0, speed: 0, angle: 0, angularVel: 0,
      isAirborne: false, airborneTimer: 0, jumpVelocity: 0, z: 0,
      lap: 0, checkpointIndex: 0, finished: false, finishTime: 0,
      itemSlot: null, invincibleTimer: 0, boostTimer: 0, spinTimer: 0,
      knockbackVx: 0, knockbackVy: 0,
      steeringInput: 0,
      lapCooldown: 0,
      prevX: 0, prevY: 0, wrongWay: false,
    };
  }

  init(x: number, y: number, angle: number): void {
    this.state.x = x;
    this.state.y = y;
    this.state.lastValidX = x;
    this.state.lastValidY = y;
    this.state.angle = angle;
    this.state.speed = 0;
    this.state.lap = 0;
    this.state.checkpointIndex = 0;
    this.state.finished = false;
    this.state.finishTime = 0;
    this.state.itemSlot = null;
    this.state.invincibleTimer = 0;
    this.state.boostTimer = 0;
    this.state.spinTimer = 0;
    this.state.z = 0;
    this.state.steeringInput = 0;
    this.state.lapCooldown = 0;
    this.state.prevX = x;
    this.state.prevY = y;
    this.state.wrongWay = false;
  }

  update(dt: number, course: CourseGenerator, accel: boolean, brake: boolean, steerLeft: boolean, steerRight: boolean, steerValue?: number): void {
    const s = this.state;
    
    // Remember safe coordinates before we do anything
    if (course.getTerrainAt(s.x, s.y) !== 'offtrack') {
      s.lastValidX = s.x;
      s.lastValidY = s.y;
    }

    if (s.lapCooldown > 0) s.lapCooldown -= dt;

    if (s.spinTimer > 0) {
      s.spinTimer -= dt;
      s.angle += 12 * dt;
      s.speed *= 0.95;
      s.steeringInput = 0;
      return;
    }

    const currentTerrain = course.getTerrainAt(s.x, s.y);
    let terrainMult = 1.0;
    let maxSpeedMult = 1.0;
    if (currentTerrain === 'grass' || currentTerrain === 'offtrack') {
      terrainMult = 0.5;
      maxSpeedMult = 0.4;
    }

    let effectiveMax = this.speedMax * maxSpeedMult;
    const gelpiyoActive = s.invincibleTimer > 0 && s.boostTimer > 0;
    if (s.boostTimer > 0) {
      s.boostTimer -= dt;
      // gelpiyo: 30% up; senbei: 40% up
      effectiveMax *= gelpiyoActive ? 1.3 : 1.4;
      terrainMult = 1.0;
    }
    if (s.invincibleTimer > 0) {
      s.invincibleTimer -= dt;
    }

    if (accel) {
      if (s.speed < 0) s.speed += this.acceleration * 720 * dt; 
      else s.speed += this.acceleration * 734 * terrainMult * dt;
    } else if (!brake) {
      if (s.speed > 0) {
        s.speed = Math.max(0, s.speed - 28 * dt);
      } else if (s.speed < 0) {
        s.speed = Math.min(0, s.speed + 28 * dt);
      }
    }
    
    if (brake) {
      if (s.speed > 0) s.speed -= this.acceleration * 810 * dt; 
      else s.speed -= this.acceleration * 99 * terrainMult * dt; 
    }

    s.speed = Math.max(-effectiveMax * 0.4, Math.min(s.speed, effectiveMax));

    const absSpeed = Math.abs(s.speed);
    const steerEffect = Math.min(absSpeed / 40, 1.0);
    const steerDir = s.speed >= 0 ? 1 : -1;
    
    // Use analog steerValue if provided, otherwise fall back to boolean
    let analogSteer = steerValue ?? 0;
    if (analogSteer === 0) {
      if (steerLeft) analogSteer = -1;
      if (steerRight) analogSteer = 1;
    }
    
    // Apply proportional steering: gentle tilt = gentle turn
    s.angle += this.turnRate * 3.8 * analogSteer * steerEffect * steerDir * dt;
    s.steeringInput += (analogSteer - s.steeringInput) * 10 * dt;

    while (s.angle > Math.PI) s.angle -= Math.PI * 2;
    while (s.angle < -Math.PI) s.angle += Math.PI * 2;

    const moveX = Math.cos(s.angle) * s.speed * dt;
    const moveY = Math.sin(s.angle) * s.speed * dt;

    const nextTerrain = course.getTerrainAt(s.x + moveX, s.y + moveY);
    if (nextTerrain === 'offtrack') {
      // FOOLPROOF COLLISION:
      // If moving here causes us to hit the wall, we instantly teleport back to the 
      // last known safe coordinate and bounce away. We don't even add moveX/moveY.
      
      const bounceForce = Math.max(Math.abs(s.speed), 80);
      const pushDirection = s.speed >= 0 ? -1 : 1;
      
      // Impulse in the opposite direction of movement
      s.knockbackVx = Math.cos(s.angle) * bounceForce * pushDirection;
      s.knockbackVy = Math.sin(s.angle) * bounceForce * pushDirection;
      
      s.speed *= 0.1; // Kill momentum
      
      // Teleport to safety
      s.x = s.lastValidX;
      s.y = s.lastValidY;
      
    } else {
      s.x += moveX;
      s.y += moveY;
    }

    // Apply knockback, but check if knockback pushes us into a wall!
    if (s.knockbackVx !== 0 || s.knockbackVy !== 0) {
      const kbX = s.knockbackVx * dt;
      const kbY = s.knockbackVy * dt;
      if (course.getTerrainAt(s.x + kbX, s.y + kbY) !== 'offtrack') {
        s.x += kbX;
        s.y += kbY;
      } else {
        // If knockback hits wall, kill knockback
        s.knockbackVx = 0;
        s.knockbackVy = 0;
      }
    }

    s.knockbackVx *= 0.8;
    s.knockbackVy *= 0.8;
    if (Math.abs(s.knockbackVx) < 0.5) s.knockbackVx = 0;
    if (Math.abs(s.knockbackVy) < 0.5) s.knockbackVy = 0;

    if (s.isAirborne) {
      s.jumpVelocity -= 200 * dt; 
      s.z += s.jumpVelocity * dt;
      s.airborneTimer -= dt;
      if (s.z <= 0) {
        s.z = 0;
        s.isAirborne = false;
        s.airborneTimer = 0;
        s.jumpVelocity = 0;
      }
    }
  }

  jump(): void {
    if (!this.state.isAirborne && this.state.spinTimer <= 0) {
      this.state.isAirborne = true;
      this.state.jumpVelocity = 200 * this.jumpPower;
      this.state.airborneTimer = 1.0;
      this.state.z = 1;
    }
  }

  applyKnockback(vx: number, vy: number): void {
    this.state.knockbackVx += vx;
    this.state.knockbackVy += vy;
    this.state.speed *= 0.5;
  }

  checkLap(course: CourseGenerator): boolean {
    const s = this.state;

    // ── Waypoint-based progress tracking ─────────────────────────────────
    // Find nearest waypoint index (robust: works regardless of AI path)
    const wps = course.waypoints;
    const total = wps.length;
    if (total === 0) return false;

    let nearestIdx = 0;
    let nearestDist = Infinity;
    // Search around last known index for efficiency
    const searchRange = Math.min(total, 20);
    const startSearch = ((s.checkpointIndex % total) - 5 + total) % total;
    for (let i = 0; i < searchRange; i++) {
      const idx = (startSearch + i) % total;
      const wp = wps[idx];
      const d = (s.x - wp.x) ** 2 + (s.y - wp.y) ** 2;
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = idx;
      }
    }
    // Also check full search if very far from last known
    if (nearestDist > 400 * 400) {
      for (let i = 0; i < total; i++) {
        const wp = wps[i];
        const d = (s.x - wp.x) ** 2 + (s.y - wp.y) ** 2;
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }
    }

    // Detect forward progress (waypoint index increasing, wrapping at 0)
    const prevIdx = s.checkpointIndex % total;
    const fwd = (nearestIdx - prevIdx + total) % total;
    const bwd = (prevIdx - nearestIdx + total) % total;
    
    // 1. Always update checkpointIndex so we know exactly where we are (forward OR backward)
    if (fwd < bwd && fwd < total / 2) {
      // Moving forward
      if (prevIdx > total * 0.8 && nearestIdx < total * 0.2) {
        s.checkpointIndex = (s.lap + 1) * total + nearestIdx;
      } else {
        s.checkpointIndex = s.lap * total + nearestIdx;
      }
    } else if (bwd < fwd && bwd < total / 2) {
      // Moving backward
      if (nearestIdx > total * 0.8 && prevIdx < total * 0.2) {
        s.checkpointIndex = (s.lap - 1) * total + nearestIdx;
      } else {
        s.checkpointIndex = s.lap * total + nearestIdx;
      }
    }

    // 2. Wrong way detection using dot product (velocity vs track direction)
    if (Math.abs(s.speed) > 10) {
      const nextIdx = (nearestIdx + 5) % total;
      const wp1 = wps[nearestIdx];
      const wp2 = wps[nextIdx];
      const trackDx = wp2.x - wp1.x;
      const trackDy = wp2.y - wp1.y;
      
      const velDx = Math.cos(s.angle) * Math.sign(s.speed);
      const velDy = Math.sin(s.angle) * Math.sign(s.speed);
      
      // Dot product
      const dot = trackDx * velDx + trackDy * velDy;
      s.wrongWay = dot < 0;
    } else {
      s.wrongWay = false;
    }

    // ── Lap trigger: must CROSS the start line (segment crossing test) ──────
    if (s.lapCooldown > 0) {
      // Still update prevX/prevY even during cooldown
      s.prevX = s.x;
      s.prevY = s.y;
      return false;
    }

    // Only check if we have done enough waypoints this lap
    const isNextLapIdx = s.checkpointIndex >= (s.lap + 1) * total;
    const waypointsThisLap = isNextLapIdx ? total : (s.checkpointIndex % total);
    
    if (waypointsThisLap > total * 0.4) {
      const sl = course.startLine;
      // Build a finite finish line segment perpendicular to the road direction
      // sl.angle is the direction the road goes at start. Perpendicular = angle + PI/2
      const lineHalfLen = 500; // half-width of finish line (must exceed widest road: 560px)
      const perpAngle = sl.angle + Math.PI / 2;
      const lx1 = sl.x + Math.cos(perpAngle) * lineHalfLen;
      const ly1 = sl.y + Math.sin(perpAngle) * lineHalfLen;
      const lx2 = sl.x - Math.cos(perpAngle) * lineHalfLen;
      const ly2 = sl.y - Math.sin(perpAngle) * lineHalfLen;

      // Segment intersection: does the kart's movement segment (prevX,prevY)->(x,y)
      // cross the finish line segment (lx1,ly1)->(lx2,ly2)?
      const crossed = segmentsCross(s.prevX, s.prevY, s.x, s.y, lx1, ly1, lx2, ly2);

      if (crossed) {
        s.lap++;
        s.lapCooldown = 4.0;
        s.prevX = s.x;
        s.prevY = s.y;
        return true;
      }
    }

    s.prevX = s.x;
    s.prevY = s.y;
    return false;
  }
}
