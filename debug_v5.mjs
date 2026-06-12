const S=2048,CX=S/2,CY=S/2;
function gen5(){const p=[],a=700,b=350,amp=80,n=5;for(let i=0;i<1200;i++){const t=(i/1200)*Math.PI*2;p.push({x:CX+a*Math.cos(t),y:CY+(b+amp*Math.sin(n*t))*Math.sin(t)});}return p;}
function gen6(){const p=[],R=550,a1=100,f1=9,a2=40,f2=3;for(let i=0;i<1400;i++){const t=(i/1400)*Math.PI*2;const r=R+a1*Math.sin(f1*t)+a2*Math.sin(f2*t+0.5);p.push({x:CX+r*Math.cos(t),y:CY+r*Math.sin(t)});}return p;}
function check(name,pts,roadW){
  const vH=roadW/2+12,minD=vH*2,total=pts.length,skipN=Math.floor(total*0.10);
  let worst=Infinity,wi=0,wj=0,olaps=0;
  const step=Math.max(1,Math.floor(total/600));
  for(let i=0;i<total;i+=step)for(let j=i+1;j<total;j+=step){
    const pD=Math.min(j-i,total-(j-i));if(pD<skipN)continue;
    const d=Math.sqrt((pts[i].x-pts[j].x)**2+(pts[i].y-pts[j].y)**2);
    if(d<worst){worst=d;wi=i;wj=j;}if(d<minD)olaps++;
  }
  const gap=worst-minD;
  console.log(`${gap>=0?'✅':'❌'} ${name}: closest=${worst.toFixed(0)}px gap=${gap.toFixed(0)}px overlaps=${olaps}`);
  if(gap<0)console.log(`   at (${pts[wi].x.toFixed(0)},${pts[wi].y.toFixed(0)}) vs (${pts[wj].x.toFixed(0)},${pts[wj].y.toFixed(0)})`);
  let oob=0;for(const p of pts)if(p.x-vH<0||p.x+vH>S||p.y-vH<0||p.y+vH>S)oob++;
  if(oob>0)console.log(`   ⚠️ ${oob}/${total} pts out of bounds`);
  else console.log(`   ✅ All points within canvas bounds`);
}
console.log('=== DEBUG v5 ===');
check('5. NEON SPIRAL (wavy oval)',gen5(),200);
check('6. LABYRINTH (9+3 wavy circle)',gen6(),185);
