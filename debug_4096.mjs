const S=4096,CX=S/2,CY=S/2;
function gen1(){const r=S*0.35,p=[];for(let i=0;i<800;i++){const t=(i/800)*Math.PI*2;p.push({x:CX+r*Math.cos(t),y:CY+r*Math.sin(t)});}return p;}
function gen2(){const rx=S*0.38,ry=S*0.26,p=[];for(let i=0;i<1000;i++){const t=(i/1000)*Math.PI*2;let x=CX+rx*Math.cos(t),y=CY+ry*Math.sin(t);const amp=ry*0.18;if(t>0.1&&t<0.9)x+=amp*Math.sin(t*3.5)*Math.exp(-((t-0.5)**2)*3);if(t>Math.PI+0.1&&t<Math.PI+0.9)x-=amp*Math.sin((t-Math.PI)*3.5)*Math.exp(-(((t-Math.PI)-0.5)**2)*3);p.push({x,y});}return p;}
function gen3(){const r=S*0.28,p=[];for(let i=0;i<1200;i++){const t=(i/1200)*Math.PI*2;const pinch=1-0.6*Math.sin(t)**2;const sc=r*1.6;p.push({x:CX+sc*Math.cos(t),y:CY+sc*Math.sin(t)*pinch});}return p;}
function gen4(){const r=S*0.32,p=[];for(let i=0;i<1200;i++){const t=(i/1200)*Math.PI*2;const rad=r*(0.9+0.3*Math.sin(7*t));p.push({x:CX+rad*Math.cos(t),y:CY+rad*Math.sin(t)});}return p;}
function gen5(){const _r=S*0.36,R=_r*0.95,amp=_r*0.16,n=11,sx=1.3,sy=0.85,p=[];for(let i=0;i<1400;i++){const t=(i/1400)*Math.PI*2;const r=R+amp*Math.sin(n*t);p.push({x:CX+r*Math.cos(t)*sx,y:CY+r*Math.sin(t)*sy});}return p;}
function gen6(){const _r=S*0.38,R=_r*0.9,a1=_r*0.16,f1=9,a2=_r*0.06,f2=3,p=[];for(let i=0;i<1400;i++){const t=(i/1400)*Math.PI*2;const r=R+a1*Math.sin(f1*t)+a2*Math.sin(f2*t+0.5);p.push({x:CX+r*Math.cos(t),y:CY+r*Math.sin(t)});}return p;}

function check(name,pts,roadW){
  const vH=roadW/2+24,minD=vH*2,total=pts.length,skipN=Math.floor(total*0.10);
  let worst=Infinity,wi=0,wj=0,olaps=0;
  const step=Math.max(1,Math.floor(total/600));
  for(let i=0;i<total;i+=step)for(let j=i+1;j<total;j+=step){
    const pD=Math.min(j-i,total-(j-i));if(pD<skipN)continue;
    const d=Math.sqrt((pts[i].x-pts[j].x)**2+(pts[i].y-pts[j].y)**2);
    if(d<worst){worst=d;wi=i;wj=j;}if(d<minD)olaps++;
  }
  const gap=worst-minD;
  console.log(`${gap>=0?'✅':'❌'} ${name}: closest=${worst.toFixed(0)}px gap=${gap.toFixed(0)}px roadW=${roadW} overlaps=${olaps}`);
  if(gap<0)console.log(`   at (${pts[wi].x.toFixed(0)},${pts[wi].y.toFixed(0)}) vs (${pts[wj].x.toFixed(0)},${pts[wj].y.toFixed(0)})`);
  let oob=0;for(const p of pts)if(p.x-vH<0||p.x+vH>S||p.y-vH<0||p.y+vH>S)oob++;
  if(oob>0)console.log(`   ⚠️ ${oob}/${total} pts out of bounds`);
}

console.log('=== ALL COURSES @ 4096x4096 ===');
check('1. CYBER RING',gen1(),560);
check('2. SUNSET OVAL',gen2(),520);
check('3. GLACIER PASS',gen3(),480);
check('4. VOLCANO INFERNO',gen4(),420);
check('5. NEON SPIRAL',gen5(),400);
check('6. LABYRINTH',gen6(),370);
console.log('================================');
