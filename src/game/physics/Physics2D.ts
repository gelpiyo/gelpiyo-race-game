import { Kart } from '../entities/Kart';
import { circlesOverlap, knockbackVector, separateCircles } from './Collision';

export class Physics2D {
  resolveKartCollisions(karts: Kart[]): void {
    for (let i = 0; i < karts.length; i++) {
      for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i];
        const b = karts[j];

        // Skip if either is airborne
        if (a.state.isAirborne || b.state.isAirborne) continue;

        if (circlesOverlap(
          a.state.x, a.state.y, a.radius,
          b.state.x, b.state.y, b.radius
        )) {
          // Rigid Body Separation: force them apart completely so they never overlap
          const sep = separateCircles(
            a.state.x, a.state.y, a.radius,
            b.state.x, b.state.y, b.radius
          );
          a.state.x = sep.x1;
          a.state.y = sep.y1;
          b.state.x = sep.x2;
          b.state.y = sep.y2;

          // Apply knockback based on collision force to simulate bumper cars
          const baseForce = 240; // Increased to ensure they push each other away noticeably
          
          // Skip knockback for invincible karts
          const aInvincible = a.state.invincibleTimer > 0;
          const bInvincible = b.state.invincibleTimer > 0;

          if (!aInvincible) {
            const forceOnA = knockbackVector(
              b.state.x, b.state.y,
              a.state.x, a.state.y,
              baseForce * b.collisionForce
            );
            a.applyKnockback(forceOnA.vx, forceOnA.vy);
          }

          if (!bInvincible) {
            const forceOnB = knockbackVector(
              a.state.x, a.state.y,
              b.state.x, b.state.y,
              baseForce * a.collisionForce
            );
            b.applyKnockback(forceOnB.vx, forceOnB.vy);
          }

          // Invincible kart hits non-invincible: spin the other
          if (aInvincible && !bInvincible) {
            b.state.spinTimer = 1.5;
          }
          if (bInvincible && !aInvincible) {
            a.state.spinTimer = 1.5;
          }
        }
      }
    }
  }
}
