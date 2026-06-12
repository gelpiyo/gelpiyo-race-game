const S = 2048, CX = S/2, CY = S/2;

function genSpiral() {
  const pts = [];
  const addLine = (x1,y1,x2,y2) => { const d=Math.hypot(x2-x1,y2-y1),n=Math.max(2,Math.floor(d/10)); for(let i=0;i<=n;i++) pts.push({x:x1+(x2-x1)*(i/n),y:y1+(y2-y1)*(i/n)}); };
  const addArc = (acx,acy,r,sa,ea) => { let d=ea-sa; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; const n=Math.max(12,Math.floor(Math.abs(d)*r/8)); for(let i=1;i<=n;i++){const t=sa+d*(i/n); pts.push({x:acx+r*Math.cos(t),y:acy+r*Math.sin(t)});} };
  const xL=500,xR=1548,rows=[350,750,1150,1550],r=200,PI=Math.PI;
  addLine(xL,rows[0],xR,rows[0]);
  addArc(xR,rows[0]+r,r,-PI/2,PI/2);
  addLine(xR,rows[1],xL,rows[1]);
  addArc(xL,rows[1]+r,r,PI/2,-PI/2);
  addLine(xL,rows[2],xR,rows[2]);
  addArc(xR,rows[2]+r,r,-PI/2,PI/2);
  addLine(xR,rows[3],xL,rows[3]);
  const bigR=(rows[3]-rows[0])/2,bigCY=(rows[3]+rows[0])/2;
  addArc(xL,bigCY,bigR,PI/2,-PI/2);
  return pts;
}

function genLabyrinth() {
  const pts = [];
  const addLine = (x1,y1,x2,y2) => { const d=Math.hypot(x2-x1,y2-y1),n=Math.max(2,Math.floor(d/10)); for(let i=0;i<=n;i++) pts.push({x:x1+(x2-x1)*(i/n),y:y1+(y2-y1)*(i/n)}); };
  const addArc = (acx,acy,r,sa,ea) => { let d=ea-sa; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; const n=Math.max(12,Math.floor(Math.abs(d)*r/8)); for(let i=1;i<=n;i++){const t=sa+d*(i/n); pts.push({x:acx+r*Math.cos(t),y:acy+r*Math.sin(t)});} };
  const xL=500,xR=1400,rows=[300,620,940,1260,1580],r=160,PI=Math.PI;
  addLine(xR,rows[0],xL,rows[0]);
  addArc(xL,rows[0]+r,r,-PI/2,-PI*3/2);
  addLine(xL,rows[1],xR,rows[1]);
  addArc(xR,rows[1]+r,r,-PI/2,PI/2);
  addLine(xR,rows[2],xL,rows[2]);
  addArc(xL,rows[2]+r,r,-PI/2,-PI*3/2);
  addLine(xL,rows[3],xR,rows[3]);
  addArc(xR,rows[3]+r,r,-PI/2,PI/2);
  addLine(xR,rows[4],xL,rows[4]);
  const bigR=(rows[4]-rows[0])/2,bigCY=(rows[4]+rows[0])/2;
  addArc(xL,bigCY,bigR,PI/2,-PI/2);
  return pts;
}

function check(name, pts, roadW) {
  const vHalf = roadW/2+12;
  const minSafe = vHalf*2;
  const total = pts.length;
  const skipN = Math.floor(total*0.12);
  let worst=Infinity, wi=0, wj=0, olaps=0;
  const step = Math.max(1,Math.floor(total/500));
  for(let i=0;i<total;i+=step) for(let j=i+1;j<total;j+=step){
    const pathD=Math.min(j-i,total-(j-i));
    if(pathD<skipN)continue;
    const d=Math.sqrt((pts[i].x-pts[j].x)**2+(pts[i].y-pts[j].y)**2);
    if(d<worst){worst=d;wi=i;wj=j;}
    if(d<minSafe)olaps++;
  }
  const gap=worst-minSafe;
  const s=gap>=0?'✅':'❌';
  console.log(`${s} ${name}: closest=${worst.toFixed(0)}px, gap=${gap.toFixed(0)}px, overlaps=${olaps}`);
  if(gap<0) console.log(`   at (${pts[wi].x.toFixed(0)},${pts[wi].y.toFixed(0)}) vs (${pts[wj].x.toFixed(0)},${pts[wj].y.toFixed(0)})`);
  
  // Bounds check
  let oob=0;
  for(const p of pts) if(p.x-vHalf<0||p.x+vHalf>S||p.y-vHalf<0||p.y+vHalf>S) oob++;
  if(oob>0) console.log(`   ⚠️ ${oob}/${total} points out of canvas bounds`);
  
  // Check if the big closing semicircle overlaps the small semicircles
  // By reporting the closest point between the first 60% and last 20% of the path
  const firstEnd = Math.floor(total*0.6);
  const lastStart = Math.floor(total*0.8);
  let closeD=Infinity, ci=0, cj=0;
  for(let i=0;i<firstEnd;i+=step) for(let j=lastStart;j<total;j+=step){
    const d=Math.sqrt((pts[i].x-pts[j].x)**2+(pts[i].y-pts[j].y)**2);
    if(d<closeD){closeD=d;ci=i;cj=j;}
  }
  const closeGap=closeD-minSafe;
  if(closeGap<0) {
    console.log(`   ❌ Big arc overlap: (${pts[ci].x.toFixed(0)},${pts[ci].y.toFixed(0)}) vs (${pts[cj].x.toFixed(0)},${pts[cj].y.toFixed(0)}), gap=${closeGap.toFixed(0)}px`);
  } else {
    console.log(`   ✅ Big closing arc gap: ${closeGap.toFixed(0)}px`);
  }
}

console.log('=== COURSE 5 & 6 OVERLAP DEBUG v3 ===');
check('5. NEON SPIRAL (4-row)', genSpiral(), 200);
check('6. LABYRINTH (5-row)', genLabyrinth(), 185);
console.log('=====================================');
