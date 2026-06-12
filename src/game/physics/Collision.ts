export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function circlesOverlap(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  return distance(x1, y1, x2, y2) < r1 + r2;
}

export function knockbackVector(
  x1: number, y1: number,
  x2: number, y2: number,
  force: number
): { vx: number; vy: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { vx: force, vy: 0 };
  return {
    vx: (dx / dist) * force,
    vy: (dy / dist) * force,
  };
}

export function separateCircles(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) {
    return { x1: x1 - r1, y1, x2: x2 + r2, y2 };
  }
  const overlap = (r1 + r2) - dist;
  if (overlap <= 0) return { x1, y1, x2, y2 };
  const nx = dx / dist;
  const ny = dy / dist;
  const half = overlap / 2;
  return {
    x1: x1 - nx * half,
    y1: y1 - ny * half,
    x2: x2 + nx * half,
    y2: y2 + ny * half,
  };
}
