import { COURSE_TEX_SIZE } from '../config/GameConfig';
import type { CourseDef } from '../config/CourseConfig';

export interface CoursePoint {
  x: number;
  y: number;
}

export class CourseGenerator {
  private size: number;
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public imageData!: ImageData;
  public collisionData!: Uint8ClampedArray;
  public waypoints: CoursePoint[] = [];
  public itemSpawns: CoursePoint[] = [];
  public startLine: { x: number; y: number; angle: number } = { x: 0, y: 0, angle: 0 };
  public checkpoints: CoursePoint[] = [];
  public courseId: string = 'cyber_ring';

  constructor(size: number = COURSE_TEX_SIZE) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d')!;
  }

  generate(courseDefOrGround?: CourseDef | HTMLImageElement, trackTex?: HTMLImageElement): HTMLCanvasElement {
    if (!courseDefOrGround || courseDefOrGround instanceof HTMLImageElement) {
      return this.generateCourse(null, courseDefOrGround as HTMLImageElement | undefined, trackTex);
    }
    return this.generateCourse(courseDefOrGround as CourseDef, undefined, trackTex);
  }

  private generateCourse(courseDef: CourseDef | null, groundTex?: HTMLImageElement, trackTex?: HTMLImageElement): HTMLCanvasElement {
    const s = this.size;
    const cx = s / 2;
    const cy = s / 2;

    const bgColor = courseDef?.bgColor ?? '#0f172a';
    const glowColor = courseDef?.glowColor ?? '#0ea5e9';
    const roadColor = courseDef?.roadColor ?? '#1e293b';
    const centerLineColor = courseDef?.centerLineColor ?? '#0ea5e9';
    this.courseId = courseDef?.id ?? 'cyber_ring';

    // Background
    if (groundTex) {
      const pat = this.ctx.createPattern(groundTex, 'repeat');
      this.ctx.fillStyle = pat || bgColor;
    } else {
      this.ctx.fillStyle = bgColor;
    }
    this.ctx.fillRect(0, 0, s, s);

    // Grid
    this.ctx.strokeStyle = `${glowColor}18`;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let i = 0; i <= s; i += 200) {
      this.ctx.moveTo(i, 0); this.ctx.lineTo(i, s);
      this.ctx.moveTo(0, i); this.ctx.lineTo(s, i);
    }
    this.ctx.stroke();

    let pathPoints: CoursePoint[];
    let roadWidth: number;

    switch (this.courseId) {
      case 'sunset_oval':
        pathPoints = this.generateSunsetOvalPath(cx, cy, s * 0.38, s * 0.26);
        roadWidth = 520;
        break;
      case 'glacier_pass':
        pathPoints = this.generateFigure8Path(cx, cy, s * 0.24);
        roadWidth = 480;
        break;
      case 'volcano_inferno':
        pathPoints = this.generateVolcanoPath(cx, cy, s * 0.32);
        roadWidth = 420;
        break;
      case 'neon_spiral':
        pathPoints = this.generateSpiralChicanePath(cx, cy, s * 0.36);
        roadWidth = 400;
        break;
      case 'labyrinth':
        pathPoints = this.generateLabyrinthPath(cx, cy, s * 0.38);
        roadWidth = 370;
        break;
      default:
        pathPoints = this.generateCirclePath(cx, cy, s * 0.35);
        roadWidth = 560;
    }

    // Course decoration (drawn BEFORE the track so it doesn't overlap the drivable area)
    this.drawCourseDecoration(this.ctx, pathPoints, this.courseId, s, glowColor);

    // Neon glow under track
    this.ctx.save();
    this.ctx.shadowBlur = 110;
    this.ctx.shadowColor = glowColor;
    this.drawPath(this.ctx, pathPoints, roadWidth + 48, glowColor);
    this.ctx.restore();

    // Main road
    this.ctx.save();
    if (trackTex && this.courseId === 'cyber_ring') {
      const pat = this.ctx.createPattern(trackTex, 'repeat');
      this.ctx.strokeStyle = pat || roadColor;
    } else {
      this.ctx.strokeStyle = roadColor;
    }
    this.ctx.lineWidth = roadWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i++) this.ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    this.ctx.stroke();
    this.ctx.restore();

    // Center line
    this.drawDashedCenterLine(this.ctx, pathPoints, centerLineColor, 8, 80, 80);

    // Curbs
    this.drawCurbs(this.ctx, pathPoints, roadWidth, courseDef);

    // Start line
    const sp = pathPoints[0];
    const spNext = pathPoints[1];
    const startAngle = Math.atan2(spNext.y - sp.y, spNext.x - sp.x);
    this.startLine = { x: sp.x, y: sp.y, angle: startAngle };
    this.drawStartLine(this.ctx, sp, startAngle, roadWidth, glowColor);

    this.imageData = this.ctx.getImageData(0, 0, s, s);

    // Collision canvas
    const collCanvas = document.createElement('canvas');
    collCanvas.width = s; collCanvas.height = s;
    const cctx = collCanvas.getContext('2d')!;
    cctx.fillStyle = '#000000';
    cctx.fillRect(0, 0, s, s);
    this.drawPath(cctx, pathPoints, roadWidth + 40, '#FFFFFF');
    this.collisionData = cctx.getImageData(0, 0, s, s).data;

    // Waypoints
    this.waypoints = [];
    const wpInterval = Math.floor(pathPoints.length / 80);
    for (let i = 0; i < pathPoints.length; i += wpInterval) this.waypoints.push({ ...pathPoints[i] });

    this.checkpoints = [];
    const cpInterval = Math.floor(pathPoints.length / 10);
    for (let i = 0; i < 10; i++) this.checkpoints.push({ ...pathPoints[i * cpInterval] });

    this.itemSpawns = [];
    const itemInterval = Math.floor(pathPoints.length / 8);
    for (let i = 0; i < 8; i++) {
      const idx = (i * itemInterval + Math.floor(itemInterval / 2)) % pathPoints.length;
      this.itemSpawns.push({ ...pathPoints[idx] });
    }

    return this.canvas;
  }

  // ── Path generators ──────────────────────────────────────────────────────

  private generateCirclePath(cx: number, cy: number, r: number): CoursePoint[] {
    const pts: CoursePoint[] = [];
    for (let i = 0; i < 800; i++) {
      const t = (i / 800) * Math.PI * 2;
      pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
    }
    return pts;
  }

  private generateSunsetOvalPath(cx: number, cy: number, rx: number, ry: number): CoursePoint[] {
    const pts: CoursePoint[] = [];
    for (let i = 0; i < 1000; i++) {
      const t = (i / 1000) * Math.PI * 2;
      let x = cx + rx * Math.cos(t);
      let y = cy + ry * Math.sin(t);
      const amp = ry * 0.18;
      if (t > 0.1 && t < 0.9) x += amp * Math.sin(t * 3.5) * Math.exp(-((t - 0.5) ** 2) * 3);
      if (t > Math.PI + 0.1 && t < Math.PI + 0.9) x -= amp * Math.sin((t - Math.PI) * 3.5) * Math.exp(-(((t - Math.PI) - 0.5) ** 2) * 3);
      pts.push({ x, y });
    }
    return pts;
  }

  // Peanut/Dumbbell shape (no crossing!)
  private generateFigure8Path(cx: number, cy: number, r: number): CoursePoint[] {
    const pts: CoursePoint[] = [];
    for (let i = 0; i < 1200; i++) {
      const t = (i / 1200) * Math.PI * 2;
      // Wavy circle that pinches in the middle but DOES NOT cross
      const pinch = 1 - 0.6 * Math.sin(t)**2; 
      const scale = r * 1.6;
      pts.push({ x: cx + scale * Math.cos(t), y: cy + scale * Math.sin(t) * pinch });
    }
    return pts;
  }

  // Wavy star polygon (guaranteed non-crossing)
  private generateVolcanoPath(cx: number, cy: number, r: number): CoursePoint[] {
    const pts: CoursePoint[] = [];
    const numBumps = 7;
    for (let i = 0; i < 1200; i++) {
      const t = (i / 1200) * Math.PI * 2;
      const rad = r * (0.9 + 0.3 * Math.sin(numBumps * t));
      pts.push({ x: cx + rad * Math.cos(t), y: cy + rad * Math.sin(t) });
    }
    return pts;
  }

      // Course 5: S-Circuit — oval-shaped wavy circle (11 bumps, stretched)
  // Uses _r parameter for scale-independent sizing
  private generateSpiralChicanePath(cx: number, cy: number, _r: number): CoursePoint[] {
    const pts: CoursePoint[] = [];
    const R = _r * 0.88;
    const amp = _r * 0.14;
    const n = 11;
    const stretchX = 1.15;
    const stretchY = 0.85;
    const numPts = 1400;

    for (let i = 0; i < numPts; i++) {
      const t = (i / numPts) * Math.PI * 2;
      const r = R + amp * Math.sin(n * t);
      const x = cx + r * Math.cos(t) * stretchX;
      const y = cy + r * Math.sin(t) * stretchY;
      pts.push({ x, y });
    }
    return pts;
  }


  // Course 6: Labyrinth Circuit — complex wavy circle (9 bumps + 3 wobbles)
  // Uses _r parameter for scale-independent sizing
  private generateLabyrinthPath(cx: number, cy: number, _r: number): CoursePoint[] {
    const pts: CoursePoint[] = [];
    const R = _r * 0.9;
    const amp1 = _r * 0.16, freq1 = 9;   // primary bumps (tight corners)
    const amp2 = _r * 0.06,  freq2 = 3;   // secondary wobble (wide sweeps)
    const numPts = 1400;

    for (let i = 0; i < numPts; i++) {
      const t = (i / numPts) * Math.PI * 2;
      const r = R + amp1 * Math.sin(freq1 * t) + amp2 * Math.sin(freq2 * t + 0.5);
      const x = cx + r * Math.cos(t);
      const y = cy + r * Math.sin(t);
      pts.push({ x, y });
    }
    return pts;
  }




  private catmullRomPath(corners: CoursePoint[], totalPts: number): CoursePoint[] {
    const pts: CoursePoint[] = [];
    const n = corners.length;
    const ptsPerSeg = Math.floor(totalPts / n);
    for (let i = 0; i < n; i++) {
      const p0 = corners[(i - 1 + n) % n];
      const p1 = corners[i];
      const p2 = corners[(i + 1) % n];
      const p3 = corners[(i + 2) % n];
      for (let j = 0; j < ptsPerSeg; j++) {
        const t = j / ptsPerSeg;
        const t2 = t * t, t3 = t2 * t;
        const x = 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
        const y = 0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3);
        pts.push({ x, y });
      }
    }
    return pts;
  }

  // ── Decoration ──────────────────────────────────────────────────────────

  private drawCourseDecoration(ctx: CanvasRenderingContext2D, _pts: CoursePoint[], courseId: string, s: number, glowColor: string): void {
    switch (courseId) {
      case 'sunset_oval': {
        const g = ctx.createRadialGradient(s/2, 0, 0, s/2, s/2, s*0.7);
        g.addColorStop(0, 'rgba(251,146,60,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
        break;
      }
      case 'glacier_pass': {
        ctx.save();
        for (let i = 0; i < 200; i++) {
          ctx.fillStyle = `rgba(165,243,252,${Math.random()*0.2})`;
          ctx.beginPath();
          ctx.arc(Math.random()*s, Math.random()*s, Math.random()*3+1, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'volcano_inferno': {
        const lg = ctx.createRadialGradient(s/2,s/2,s*0.1,s/2,s/2,s*0.6);
        lg.addColorStop(0,'rgba(239,68,68,0.15)'); lg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = lg; ctx.fillRect(0,0,s,s);
        ctx.save();
        ctx.strokeStyle = 'rgba(251,146,60,0.25)'; ctx.lineWidth = 2;
        for (let i = 0; i < 30; i++) {
          const sx = Math.random()*s, sy = Math.random()*s;
          ctx.beginPath(); ctx.moveTo(sx, sy);
          let cx2=sx, cy2=sy;
          for (let j = 0; j < 4; j++) { cx2+=(Math.random()-0.5)*120; cy2+=(Math.random()-0.5)*120; ctx.lineTo(cx2,cy2); }
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'neon_spiral': {
        // Pulsing purple aura rings
        ctx.save();
        for (let ring = 0; ring < 5; ring++) {
          const rr = s * (0.15 + ring * 0.07);
          const g2 = ctx.createRadialGradient(s/2,s/2,rr-8,s/2,s/2,rr+8);
          g2.addColorStop(0,'rgba(0,0,0,0)');
          g2.addColorStop(0.5,`rgba(168,85,247,${0.08 - ring*0.01})`);
          g2.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle = g2; ctx.fillRect(0,0,s,s);
        }
        ctx.restore();
        break;
      }
      case 'labyrinth': {
        // Matrix green rain dots
        ctx.save();
        for (let i = 0; i < 400; i++) {
          ctx.fillStyle = `rgba(16,185,129,${Math.random()*0.15})`;
          ctx.font = `${Math.random()*10+8}px monospace`;
          ctx.fillText(Math.random()>0.5?'1':'0', Math.random()*s, Math.random()*s);
        }
        ctx.restore();
        break;
      }
    }
  }

  // ── Draw helpers ─────────────────────────────────────────────────────────

  private drawPath(ctx: CanvasRenderingContext2D, pts: CoursePoint[], width: number, color: string): void {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath(); ctx.stroke();
  }

  private drawDashedCenterLine(ctx: CanvasRenderingContext2D, pts: CoursePoint[], color: string, w: number, dashLen: number, gapLen: number): void {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.shadowBlur = 10; ctx.shadowColor = color;
    ctx.setLineDash([dashLen, gapLen]);
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath(); ctx.stroke();
    ctx.restore();
  }

  private drawCurbs(ctx: CanvasRenderingContext2D, pts: CoursePoint[], roadWidth: number, courseDef?: CourseDef | null): void {
    const curbWidth = 16;
    const half = roadWidth / 2;
    const colorA = courseDef?.accentColor ?? '#ffffff';
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], pN = pts[(i+1)%pts.length];
        const dx = pN.x-p.x, dy = pN.y-p.y, len = Math.sqrt(dx*dx+dy*dy);
        if (len === 0) continue;
        const nx = -dy/len*side, ny = dx/len*side;
        const cx = p.x + nx*(half+curbWidth/2);
        const cy = p.y + ny*(half+curbWidth/2);
        ctx.fillStyle = (i%20)<10 ? colorA : '#000000';
        ctx.fillRect(cx-8, cy-8, 16, 16);
      }
    }
  }

  private drawStartLine(ctx: CanvasRenderingContext2D, pos: CoursePoint, angle: number, roadWidth: number, glowColor: string): void {
    ctx.save();
    ctx.translate(pos.x, pos.y); ctx.rotate(angle + Math.PI/2);
    const w = roadWidth, h = 40;
    ctx.fillStyle = glowColor; ctx.shadowBlur = 20; ctx.shadowColor = glowColor;
    ctx.fillRect(-w/2, -h/2, w, h); ctx.shadowBlur = 0;
    ctx.fillStyle = '#020617';
    const sq = 10;
    for (let y = -h/2; y < h/2; y += sq) for (let x = -w/2; x < w/2; x += sq)
      if ((Math.floor(x/sq)+Math.floor(y/sq))%2===0) ctx.fillRect(x, y, sq, sq);
    ctx.restore();
  }

  // ── Terrain query ─────────────────────────────────────────────────────────

  getTerrainAt(x: number, y: number): 'road' | 'grass' | 'offtrack' {
    if (!this.collisionData) return 'offtrack';
    const s = this.size;
    const px = ((Math.floor(x)%s)+s)%s, py = ((Math.floor(y)%s)+s)%s;
    return this.collisionData[(py*s+px)*4] > 128 ? 'road' : 'offtrack';
  }

  getPixelColor(x: number, y: number): [number,number,number,number] {
    if (!this.imageData) return [15,23,42,255];
    const s = this.size;
    const px = ((Math.floor(x)%s)+s)%s, py = ((Math.floor(y)%s)+s)%s;
    const idx = (py*s+px)*4;
    return [this.imageData.data[idx], this.imageData.data[idx+1], this.imageData.data[idx+2], this.imageData.data[idx+3]];
  }

  /** Free canvas memory. Must be called before discarding the instance. */
  dispose(): void {
    this.canvas.width = 0;
    this.canvas.height = 0;
    (this as any).imageData = null;
    (this as any).collisionData = null;
  }

}
