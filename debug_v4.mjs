const S=2048,CX=S/2,CY=S/2;
function genSpiral(){
  const pts=[],PI=Math.PI;
  const addLine=(x1,y1,x2,y2)=>{const d=Math.hypot(x2-x1,y2-y1),n=Math.max(2,Math.floor(d/10));for(let i=0;i<=n;i++)pts.push({x:x1+(x2-x1)*(i/n),y:y1+(y2-y1)*(i/n)});};
  const addArc=(acx,acy,r,sa,ea)=>{let d=ea-sa;while(d>PI)d-=PI*2;while(d<-PI)d+=PI*2;const n=Math.max(15,Math.floor(Math.abs(d)*r/6));for(let i=1;i<=n;i++){const t=sa+d*(i/n);pts.push({x:acx+r*Math.cos(t),y:acy+r*Math.sin(t)});}};
  const yTop=400,yBot=1648,midY=(yTop+yBot)/2,semiR=(yBot-yTop)/2,xLeft=500,xRight=1548;
  const cAmp=130,cLen=180;
  addLine(xLeft,yTop,xRight-cLen*2,yTop);
  addLine(xRight-cLen*2,yTop,xRight-cLen,yTop+cAmp);
  addLine(xRight-cLen,yTop+cAmp,xRight,yTop);
  addArc(xRight,midY,semiR,-PI/2,PI/2);
  addLine(xRight,yBot,xLeft+cLen*2,yBot);
  addLine(xLeft+cLen*2,yBot,xLeft+cLen,yBot-cAmp);
  addLine(xLeft+cLen,yBot-cAmp,xLeft,yBot);
  addArc(xLeft,midY,semiR,PI/2,-PI/2);
  return pts;
}
function genLab(){
  const pts=[],PI=Math.PI;
  const addLine=(x1,y1,x2,y2)=>{const d=Math.hypot(x2-x1,y2-y1),n=Math.max(2,Math.floor(d/10));for(let i=0;i<=n;i++)pts.push({x:x1+(x2-x1)*(i/n),y:y1+(y2-y1)*(i/n)});};
  const r=700,cAmp=120,cLen=150,cx=CX,cy=CY;
  for(let i=0;i<=300;i++){const t=-PI*0.6+(PI*1.2)*(i/300);pts.push({x:cx+r*0.85*Math.cos(t),y:cy+r*Math.sin(t)});}
  let lp=pts[pts.length-1];
  addLine(lp.x,lp.y,lp.x-cLen,lp.y-cAmp);
  addLine(lp.x-cLen,lp.y-cAmp,lp.x-cLen*2,lp.y);
  addLine(lp.x-cLen*2,lp.y,lp.x-cLen*3,lp.y+cAmp);
  addLine(lp.x-cLen*3,lp.y+cAmp,lp.x-cLen*4,lp.y);
  const ec=pts[pts.length-1];
  const acx=cx-r*0.3,acy=cy;
  const arcR=Math.hypot(ec.x-acx,ec.y-acy);
  const sa=Math.atan2(ec.y-acy,ec.x-acx);
  const ea=Math.atan2(pts[0].y-acy,pts[0].x-acx);
  let diff=ea-sa;while(diff>0)diff-=PI*2;
  for(let i=1;i<=200;i++){const t=sa+diff*(i/200);pts.push({x:acx+arcR*Math.cos(t),y:acy+arcR*Math.sin(t)});}
  return pts;
}
function check(name,pts,roadW){
  const vH=roadW/2+12,minD=vH*2,total=pts.length,skipN=Math.floor(total*0.12);
  let worst=Infinity,wi=0,wj=0,olaps=0;
  const step=Math.max(1,Math.floor(total/500));
  for(let i=0;i<total;i+=step)for(let j=i+1;j<total;j+=step){
    const pD=Math.min(j-i,total-(j-i));if(pD<skipN)continue;
    const d=Math.sqrt((pts[i].x-pts[j].x)**2+(pts[i].y-pts[j].y)**2);
    if(d<worst){worst=d;wi=i;wj=j;}if(d<minD)olaps++;
  }
  const gap=worst-minD;
  console.log(`${gap>=0?'✅':'❌'} ${name}: closest=${worst.toFixed(0)}px gap=${gap.toFixed(0)}px overlaps=${olaps}`);
  if(gap<0)console.log(`   at (${pts[wi].x.toFixed(0)},${pts[wi].y.toFixed(0)}) vs (${pts[wj].x.toFixed(0)},${pts[wj].y.toFixed(0)})`);
  let oob=0;for(const p of pts)if(p.x-vH<0||p.x+vH>S||p.y-vH<0||p.y+vH>S)oob++;
  if(oob>0)console.log(`   ⚠️ ${oob}/${total} points near edge`);
}
console.log('=== DEBUG v4 ===');
check('5. NEON SPIRAL',genSpiral(),200);
check('6. LABYRINTH',genLab(),185);
