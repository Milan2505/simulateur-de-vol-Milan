// ══════════════════════════════════════════════════════════
// RIVERS.JS — Rivières procédurales
// ══════════════════════════════════════════════════════════

// ══ RIVIÈRES PROCÉDURALES ════════════════════════════════
// Rivières qui suivent les vallées — rendues comme des bandes bleues sur le terrain
function drawRivers(){
  const RIVER_RANGE=3000;
  const fX=Math.sin(cam.cyaw), fY=Math.cos(cam.cyaw);

  // 6 rivières fixes dans le monde, chacune définie par un point de départ + direction
  const RIVERS=[
    {sx:800,sy:1200,  dir:0.8,  len:8000,  width:6},
    {sx:3200,sy:800,  dir:1.4,  len:6000,  width:5},
    {sx:6000,sy:2000, dir:2.2,  len:7000,  width:7},
    {sx:-2000,sy:4000,dir:0.3,  len:9000,  width:8},
    {sx:2000,sy:6000, dir:1.8,  len:5000,  width:5},
    {sx:8000,sy:5000, dir:2.8,  len:6000,  width:6},
  ];

  for(const riv of RIVERS){
    const steps=Math.floor(riv.len/30);
    let rx=riv.sx, ry=riv.sy;
    let dir=riv.dir;

    for(let i=0;i<steps;i++){
      const dx=rx-pl.x, dy=ry-pl.y;
      const d2=dx*dx+dy*dy;
      if(d2>RIVER_RANGE*RIVER_RANGE){ rx+=Math.sin(dir)*30; ry+=Math.cos(dir)*30; dir+=Math.sin(i*0.15)*0.08; continue; }

      const h=terrainH(rx,ry);
      if(h<2){ rx+=Math.sin(dir)*30; ry+=Math.cos(dir)*30; dir+=Math.sin(i*0.15)*0.08; continue; } // skip ocean

      // Meander
      dir+=Math.sin(i*0.15+riv.sx*0.001)*0.08;
      // Follow downhill slightly
      const hL=terrainH(rx-8,ry), hR=terrainH(rx+8,ry);
      const hF=terrainH(rx,ry+8), hB=terrainH(rx,ry-8);
      dir+=((hR-hL)*0.002)+((hF-hB)*0.001);

      const nx=rx+Math.sin(dir)*30, ny=ry+Math.cos(dir)*30;
      const perpX=-Math.cos(dir)*riv.width, perpY=Math.sin(dir)*riv.width;

      const fogF=Math.pow(Math.min(1,Math.sqrt(d2)/RIVER_RANGE),0.6);

      // Rivière DRAPÉE sur le terrain : chaque coin suit le sol réel à sa position
      // (avant, les bords prenaient la hauteur de l'axe → ils flottaient en dévers).
      const OFF=0.25;  // léger décalage anti z-fighting
      const z1=terrainH(rx+perpX,ry+perpY)+OFF;
      const z2=terrainH(rx-perpX,ry-perpY)+OFF;
      const z3=terrainH(nx-perpX,ny-perpY)+OFF;
      const z4=terrainH(nx+perpX,ny+perpY)+OFF;

      // Occlusion (segments lointains seulement) : pas de rivière à travers les montagnes
      if(d2>350*350 && terrainOccluded(rx,ry,(z1+z2)*0.5)){ rx=nx; ry=ny; continue; }

      const p1=project(rx+perpX,ry+perpY,z1);
      const p2=project(rx-perpX,ry-perpY,z2);
      const p3=project(nx-perpX,ny-perpY,z3);
      const p4=project(nx+perpX,ny+perpY,z4);

      if(p1&&p2&&p3&&p4){
        const wr=Math.round(lerp(28,FOG_R,fogF));
        const wg=Math.round(lerp(62,FOG_G,fogF));
        const wb=Math.round(lerp(120,FOG_B,fogF));
        ctx.fillStyle=`rgb(${wr},${wg},${wb})`;
        ctx.beginPath();
        ctx.moveTo(p1.sx,p1.sy); ctx.lineTo(p2.sx,p2.sy);
        ctx.lineTo(p3.sx,p3.sy); ctx.lineTo(p4.sx,p4.sy);
        ctx.closePath(); ctx.fill();
      }

      rx=nx; ry=ny;
    }
  }
}
