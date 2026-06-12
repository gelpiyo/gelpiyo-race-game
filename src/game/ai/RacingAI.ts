import type { CoursePoint } from '../course/CourseGenerator';

export class RacingAI {
  private waypoints: CoursePoint[] = [];
  private currentWaypointIdx: number = 0;
  private rubberBandTarget: number = 1.0;

  constructor(waypoints: CoursePoint[]) {
    this.waypoints = waypoints;
    this.currentWaypointIdx = 0;
  }

  update(
    kartX: number,
    kartY: number,
    kartAngle: number,
    kartSpeed: number,
    playerX: number,
    playerY: number,
    playerLap: number,
    npcLap: number
  ): { accel: boolean; brake: boolean; left: boolean; right: boolean; jump: boolean } {
    if (this.waypoints.length === 0) {
      return { accel: true, brake: false, left: false, right: false, jump: false };
    }

    // Find target waypoint
    const target = this.waypoints[this.currentWaypointIdx];
    const dx = target.x - kartX;
    const dy = target.y - kartY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Advance to next waypoint when close enough
    if (dist < 100) {
      this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.waypoints.length;
    }

    // Calculate desired angle to waypoint
    const desiredAngle = Math.atan2(dy, dx);
    let angleDiff = desiredAngle - kartAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Steering
    const steerThreshold = 0.15;
    const left = angleDiff < -steerThreshold;
    const right = angleDiff > steerThreshold;

    // Rubber banding - adjust speed relative to player
    const distToPlayer = Math.sqrt((kartX - playerX) ** 2 + (kartY - playerY) ** 2);
    const lapDiff = npcLap - playerLap;

    if (lapDiff > 0 || (lapDiff === 0 && distToPlayer > 400)) {
      // NPC is ahead - slow down slightly
      this.rubberBandTarget = 0.75 + Math.random() * 0.1;
    } else if (lapDiff < 0 || (lapDiff === 0 && distToPlayer > 400)) {
      // NPC is behind - speed up
      this.rubberBandTarget = 1.1 + Math.random() * 0.15;
    } else {
      this.rubberBandTarget = 0.9 + Math.random() * 0.1;
    }

    // Brake if turning too sharply at high speed
    const brake = Math.abs(angleDiff) > 1.2 && kartSpeed > 120;
    const accel = !brake;

    // Random jump (very rare)
    const jump = Math.random() < 0.001;

    return { accel, brake, left, right, jump };
  }

  getRubberBandMultiplier(): number {
    return this.rubberBandTarget;
  }

  setStartWaypoint(kartX: number, kartY: number): void {
    // Find nearest waypoint
    let minDist = Infinity;
    let nearestIdx = 0;
    for (let i = 0; i < this.waypoints.length; i++) {
      const dx = this.waypoints[i].x - kartX;
      const dy = this.waypoints[i].y - kartY;
      const d = dx * dx + dy * dy;
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    }
    this.currentWaypointIdx = (nearestIdx + 2) % this.waypoints.length;
  }
}
