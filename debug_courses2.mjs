// Debug v2: fixed neighbor skip logic
const S = 2048;
const CX = S / 2, CY = S / 2;

function generateCirclePath() {
  const r = S * 0.35, pts = [];
  for (let i = 0; i < 800; i++) {
    const t = (i / 800) * Math.PI * 2;
    pts.push({ x: CX + r * Math.cos(t), y: CY + r * Math.sin(t) });
  }
  return pts;
}

function generateSunsetOvalPath() {
  const rx = S * 0.38, ry = S * 0.26, pts = [];
  for (let i = 0; i < 1000; i++) {
    const t = (i / 1000) * Math.PI * 2;
    let x = CX + rx * Math.cos(t), y = CY + ry * Math.sin(t);
    const amp = ry * 0.18;
    if (t > 0.1 && t < 0.9) x += amp * Math.sin(t * 3.5) * Math.exp(-((t - 0.5) ** 2) * 3);
    if (t > Math.PI + 0.1 && t < Math.PI + 0.9) x -= amp * Math.sin((t - Math.PI) * 3.5) * Math.exp(-(((t - Math.PI) - 0.5) ** 2) * 3);
    pts.push({ x, y });
  }
  return pts;
}

function generateFigure8Path() {
  const r = S * 0.28, pts = [];
  for (let i = 0; i < 1200; i++) {
    const t = (i / 1200) * Math.PI * 2;
    const pinch = 1 - 0.6 * Math.sin(t) ** 2;
    const scale = r * 1.6;
    pts.push({ x: CX + scale * Math.cos(t), y: CY + scale * Math.sin(t) * pinch });
  }
  return pts;
}

function generateVolcanoPath() {
  const r = S * 0.32, pts = [];
  for (let i = 0; i < 1200; i++) {
    const t = (i / 1200) * Math.PI * 2;
    const rad = r * (0.9 + 0.3 * Math.sin(7 * t));
    pts.push({ x: CX + rad * Math.cos(t), y: CY + rad * Math.sin(t) });
  }
  return pts;
}

function generateSpiralPath() {
  const pts = [];
  const addLine = (x1, y1, x2, y2) => {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(2, Math.floor(dist / 10));
    for (let i = 0; i <= steps; i++) pts.push({ x: x1 + (x2 - x1) * (i / steps), y: y1 + (y2 - y1) * (i / steps) });
  };
  const addArc = (acx, acy, radius, startAngle, endAngle) => {
    let diff = endAngle - startAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steps = Math.max(10, Math.floor((Math.abs(diff) * radius) / 8));
    for (let i = 1; i <= steps; i++) {
      const t = startAngle + diff * (i / steps);
      pts.push({ x: acx + radius * Math.cos(t), y: acy + radius * Math.sin(t) });
    }
  };
  const xLeft = 400, xRight = 1648, rows = [524, 1024, 1524], r = 250, PI = Math.PI;
  addLine(xLeft, rows[0], xRight, rows[0]);
  addArc(xRight, rows[0] + r, r, -PI / 2, PI / 2);
  addLine(xRight, rows[1], xLeft, rows[1]);
  addArc(xLeft, rows[1] + r, r, -PI / 2, -PI * 3 / 2);
  addLine(xLeft, rows[2], xRight, rows[2]);
  const outerRight = xRight + 300, outerTop = rows[0] - 300, outerLeft = xLeft - 300;
  addArc(xRight, rows[2] + 300, 300, -PI / 2, 0);
  addLine(outerRight, rows[2] + 300, outerRight, outerTop + 300);
  addArc(outerRight - 300, outerTop + 300, 300, 0, -PI / 2);
  addLine(outerRight - 300, outerTop, outerLeft + 300, outerTop);
  addArc(outerLeft + 300, outerTop + 300, 300, -PI / 2, PI);
  addLine(outerLeft, outerTop + 300, outerLeft, rows[0] - 300);
  addArc(outerLeft + 300, rows[0], 300, PI, PI / 2);
  return pts;
}

function generateLabyrinthPath() {
  const pts = [];
  const addLine = (x1, y1, x2, y2) => {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(2, Math.floor(dist / 10));
    for (let i = 0; i <= steps; i++) pts.push({ x: x1 + (x2 - x1) * (i / steps), y: y1 + (y2 - y1) * (i / steps) });
  };
  const addArc = (acx, acy, radius, startAngle, endAngle) => {
    let diff = endAngle - startAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steps = Math.max(5, Math.floor((Math.abs(diff) * radius) / 10));
    for (let i = 1; i <= steps; i++) {
      const t = startAngle + diff * (i / steps);
      pts.push({ x: acx + radius * Math.cos(t), y: acy + radius * Math.sin(t) });
    }
  };
  const rows = [400, 800, 1200, 1600], xLeft = 500, xRight = 1500, r = 200, PI = Math.PI;
  addLine(xRight, rows[0], xLeft, rows[0]);
  addArc(xLeft, rows[0] + r, r, -PI / 2, PI / 2);
  addLine(xLeft, rows[1], xRight, rows[1]);
  addArc(xRight, rows[1] + r, r, -PI / 2, PI / 2);
  addLine(xRight, rows[2], xLeft, rows[2]);
  addArc(xLeft, rows[2] + r, r, -PI / 2, PI / 2);
  addLine(xLeft, rows[3], xRight, rows[3]);
  addArc(xRight, rows[3] + r, r, -PI / 2, 0);
  addLine(xRight + r, rows[3] + r, 1850 - r, rows[3] + r);
  addArc(1850 - r, rows[3], r, PI / 2, 0);
  addLine(1850, rows[3], 1850, 150 + r);
  addArc(1850 - r, 150 + r, r, 0, -PI / 2);
  addLine(1850 - r, 150, xRight + r, 150);
  addArc(xRight, 150 + r, r, -PI / 2, PI);
  addLine(xRight - r, 150 + r, xRight - r, rows[0] - r);
  addArc(xRight, rows[0], r, PI, PI / 2);
  return pts;
}

function checkOverlap(name, pts, roadWidth) {
  const visualHalf = roadWidth / 2 + 12; // +12 for glow
  const minSafeDist = visualHalf * 2; // Two roads' visual half
  const total = pts.length;
  
  // For closed-loop courses, skip a percentage of neighbors in BOTH directions
  // A circle has all points as "neighbors" continuously—need large skip
  const skipPct = 0.15; // Skip 15% of total points in each direction
  const skipN = Math.floor(total * skipPct);
  
  let worstDist = Infinity;
  let worstI = 0, worstJ = 0;
  let overlapCount = 0;
  
  const step = Math.max(1, Math.floor(total / 400));
  
  for (let i = 0; i < total; i += step) {
    for (let j = i + 1; j < total; j += step) {
      // Path distance in both directions (it's a closed loop)
      const fwd = j - i;
      const bwd = total - fwd;
      const pathDist = Math.min(fwd, bwd);
      
      if (pathDist < skipN) continue; // Skip nearby path points
      
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < worstDist) {
        worstDist = dist;
        worstI = i;
        worstJ = j;
      }
      if (dist < minSafeDist) {
        overlapCount++;
      }
    }
  }
  
  const gap = worstDist - minSafeDist;
  const status = gap >= 0 ? '✅' : '❌';
  
  console.log(`\n${status} ${name}`);
  console.log(`   Points: ${total} | Road: ${roadWidth}px | Visual: ${visualHalf * 2}px`);
  console.log(`   Closest non-adjacent: ${worstDist.toFixed(0)}px → gap: ${gap.toFixed(0)}px`);
  if (gap < 0) {
    console.log(`   ⚠️ OVERLAP at (${pts[worstI].x.toFixed(0)},${pts[worstI].y.toFixed(0)}) vs (${pts[worstJ].x.toFixed(0)},${pts[worstJ].y.toFixed(0)})`);
    console.log(`   Path indices: ${worstI} vs ${worstJ} (pathDist=${Math.min(worstJ - worstI, total - (worstJ - worstI))})`);
  }
  if (overlapCount > 0) console.log(`   Overlap samples: ${overlapCount}`);
  
  // Bounds
  let oob = 0;
  for (const p of pts) if (p.x - visualHalf < 0 || p.x + visualHalf > S || p.y - visualHalf < 0 || p.y + visualHalf > S) oob++;
  if (oob > 0) console.log(`   ⚠️ ${oob} points out of canvas bounds`);
  
  return { name, gap, overlapCount, worstI, worstJ };
}

console.log('============================================');
console.log('  COURSE OVERLAP DEBUGGER v2');
console.log('  Canvas: 2048x2048 | Skip: 15% neighbors');
console.log('============================================');

checkOverlap('1. CYBER RING',     generateCirclePath(),     280);
checkOverlap('2. SUNSET OVAL',    generateSunsetOvalPath(), 260);
checkOverlap('3. GLACIER PASS',   generateFigure8Path(),    240);
checkOverlap('4. VOLCANO INFERNO',generateVolcanoPath(),    210);
checkOverlap('5. NEON SPIRAL',    generateSpiralPath(),     200);
checkOverlap('6. LABYRINTH',      generateLabyrinthPath(),  185);

console.log('\n============================================');
