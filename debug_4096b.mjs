const S=4096,CX=S/2,CY=S/2;
function gen3(){const r=S*0.24,p=[];for(let i=0;i<1200;i++){const t=(i/1200)*Math.PI*2;const pinch=1-0.6*Math.sin(t)**2;const sc=r*1.6;p.push({x:CX+sc*Math.cos(t),y:CY+sc*Math.sin(t)*pinch});}return p;}
function gen5(){const _r=S*0.36,R=_r*0.95,amp=_r*0.16,n=11,sx=1.2,sy=0.85,p=[];for(let i=0;i<1400;i++){const t=(i/1400)*Math.PI*2;const r=R+amp*Math.sin(n*t);p.push({x:CX+r*Math.cos(t)*sx,y:CY+r*Math.sin(t)*sy});}return p;}
function check(name,pts,roadW){
  const vH=roadW/2+24,minD=vH*2,total=pts.length;
  let oob=0;for(const p of pts)if(p.x-vH<0||p.x+vH>S||p.y-vH<0||p.y+vH>S)oob++;
  console.log(`${oob===0?'✅':'⚠️'} ${name}: ${oob}/${total} pts out of bounds`);
}
check('3. GLACIER PASS',gen3(),480);
check('5. NEON SPIRAL',gen5(),400);
