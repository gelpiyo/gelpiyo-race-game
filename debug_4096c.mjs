const S=4096,CX=S/2,CY=S/2;
function gen5(){const _r=S*0.36,R=_r*0.88,amp=_r*0.14,n=11,sx=1.15,sy=0.85,p=[];for(let i=0;i<1400;i++){const t=(i/1400)*Math.PI*2;const r=R+amp*Math.sin(n*t);p.push({x:CX+r*Math.cos(t)*sx,y:CY+r*Math.sin(t)*sy});}return p;}
function check(pts,roadW){
  const vH=roadW/2+24,minD=vH*2,total=pts.length,skipN=Math.floor(total*0.10);
  let worst=Infinity,olaps=0,oob=0;
  const step=Math.max(1,Math.floor(total/600));
  for(let i=0;i<total;i+=step)for(let j=i+1;j<total;j+=step){
    const pD=Math.min(j-i,total-(j-i));if(pD<skipN)continue;
    const d=Math.sqrt((pts[i].x-pts[j].x)**2+(pts[i].y-pts[j].y)**2);
    if(d<worst)worst=d;if(d<minD)olaps++;
  }
  for(const p of pts)if(p.x-vH<0||p.x+vH>S||p.y-vH<0||p.y+vH>S)oob++;
  console.log(`closest=${worst.toFixed(0)} gap=${(worst-minD).toFixed(0)} overlaps=${olaps} oob=${oob}/${total}`);
}
check(gen5(),400);
