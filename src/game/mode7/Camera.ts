export class Camera {
  public x: number = 0;
  public y: number = 0;
  public angle: number = 0;
  public height: number = 150; // Increased height (was 80)
  public distance: number = 200; // Pulled back (was 100)
  public fov: number = 300; // Slightly wider FOV (was 256)
  
  // Smoothing
  public currentX: number = 0;
  public currentY: number = 0;
  public currentAngle: number = 0;

  reset(x: number, y: number, angle: number): void {
    this.x = x - Math.cos(angle) * this.distance;
    this.y = y - Math.sin(angle) * this.distance;
    this.angle = angle;
    this.currentX = this.x;
    this.currentY = this.y;
    this.currentAngle = this.angle;
  }

  follow(targetX: number, targetY: number, targetAngle: number, speed: number): void {
    const dynamicDistance = this.distance + Math.max(0, speed * 0.2);
    
    const desiredX = targetX - Math.cos(targetAngle) * dynamicDistance;
    const desiredY = targetY - Math.sin(targetAngle) * dynamicDistance;

    // Smooth position
    this.currentX += (desiredX - this.currentX) * 0.15;
    this.currentY += (desiredY - this.currentY) * 0.15;

    // Smooth angle (handle wrap around)
    let angleDiff = targetAngle - this.currentAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.currentAngle += angleDiff * 0.15;

    this.x = this.currentX;
    this.y = this.currentY;
    this.angle = this.currentAngle;
  }
}
