// ══════════════════════════════════════════════════════════
// TREES.JS — Arbres procéduraux
// ══════════════════════════════════════════════════════════

// ══ ARBRES PROCÉDURAUX ═══════════════════════════════════
// Arbres rendus comme triangles simples près de la caméra
// Placement déterministe par hash de position → stable frame à frame
function treeHash(x,y){
  let h=x*374761393+y*668265263;
  h=(h^(h>>13))*1274126177;
  return(h^(h>>16))&0x7fffffff;
}

function drawTrees(T){
  const TREE_RANGE=420;  // distance max de rendu
  const TREE_STEP=18;    // grille d'échantillonnage
  const ox=Math.round(pl.x/TREE_STEP)*TREE_STEP;
  const oy=Math.round(pl.y/TREE_STEP)*TREE_STEP;
  const n=Math.ceil(TREE_RANGE/TREE_STEP);
  const fX=Math.sin(cam.cyaw), fY=Math.cos(cam.cyaw);

  const trees=[];
  for(let r=-n;r<=n;r++){
    for(let c=-n;c<=n;c++){
      const wx=ox+c*TREE_STEP, wy=oy+r*TREE_STEP;
      const dx=wx-pl.x, dy=wy-pl.y;
      const d2=dx*dx+dy*dy;
      if(d2>TREE_RANGE*TREE_RANGE) continue;
      if(dx*fX+dy*fY < -TREE_STEP*2) continue; // behind camera

      const h=terrainH(wx,wy);
      // Trees only in forest/prairie biomes (h 25-280)
      if(h<25||h>280) continue;

      const hash=treeHash(wx,wy);
      const density=(h>100&&h<220)?0.65:(h>32&&h<100)?0.40:0.20;
      if((hash%1000)/1000>density) continue;

      // Offset position within cell for variety
      const offX=((hash>>4)%100-50)*0.28;
      const offY=((hash>>10)%100-50)*0.28;
      const twx=wx+offX, twy=wy+offY;
      const th=terrainH(twx,twy);
      if(th<20||th>290) continue;

      // Tree size varies
      const treeH=3.5+((hash>>16)%100)*0.055;
      const treeW=treeH*0.45;
      const trunkH=treeH*0.30;

      // Is it conifer or deciduous?
      const isConifer=(h>140)||((hash>>20)%3===0);

      const base=project(twx,twy,th);
      const top=project(twx,twy,th+treeH);
      if(!base||!top) continue;
      if(base.d<8||base.d>TREE_RANGE) continue; // trop proche = artefacts

      trees.push({twx,twy,th,treeH,treeW,trunkH,isConifer,base,top,d:base.d});
    }
  }

  // Sort back to front
  trees.sort((a,b)=>b.d-a.d);

  for(const t of trees){
    const fogF=Math.pow(Math.min(1,t.d/TREE_RANGE),0.7);
    if(fogF>0.95) continue;

    const sx=t.base.sx, sy=t.base.sy;
    const topSy=t.top.sy;
    const scaleH=Math.abs(sy-topSy);
    const scaleW=scaleH*0.45;

    if(scaleH<2) continue;

    const trunkBot=sy;
    const trunkTop=sy-(scaleH*0.30);
    const trunkW=Math.max(1,scaleW*0.15);

    // Trunk
    const trunkR=Math.round(lerp(72,FOG_R,fogF));
    const trunkG=Math.round(lerp(50,FOG_G,fogF));
    const trunkB=Math.round(lerp(30,FOG_B,fogF));
    ctx.fillStyle=`rgb(${trunkR},${trunkG},${trunkB})`;
    ctx.fillRect(sx-trunkW/2, trunkTop, trunkW, trunkBot-trunkTop);

    // Canopy
    if(t.isConifer){
      // Conifer: triangle
      const gr=Math.round(lerp(28+((t.twx*7)&15),FOG_R,fogF));
      const gg=Math.round(lerp(68+((t.twy*11)&15),FOG_G,fogF));
      const gb=Math.round(lerp(22,FOG_B,fogF));
      ctx.fillStyle=`rgb(${gr},${gg},${gb})`;
      ctx.beginPath();
      ctx.moveTo(sx, topSy);
      ctx.lineTo(sx-scaleW*0.5, trunkTop+scaleH*0.08);
      ctx.lineTo(sx+scaleW*0.5, trunkTop+scaleH*0.08);
      ctx.closePath();
      ctx.fill();
    } else {
      // Deciduous: rounded blob (ellipse approximation with circle)
      const cr=scaleW*0.55, cy2=trunkTop-cr*0.3;
      const gr=Math.round(lerp(42+((t.twx*13)&15),FOG_R,fogF));
      const gg=Math.round(lerp(95+((t.twy*7)&20),FOG_G,fogF));
      const gb=Math.round(lerp(18,FOG_B,fogF));
      ctx.fillStyle=`rgb(${gr},${gg},${gb})`;
      ctx.beginPath();
      ctx.ellipse(sx, cy2, cr, cr*1.1, 0, 0, Math.PI*2);
      ctx.fill();
      // Highlight
      const hr=Math.round(lerp(62+((t.twx*3)&10),FOG_R,fogF));
      const hg=Math.round(lerp(118+((t.twy*5)&12),FOG_G,fogF));
      const hb=Math.round(lerp(28,FOG_B,fogF));
      ctx.fillStyle=`rgba(${hr},${hg},${hb},0.5)`;
      ctx.beginPath();
      ctx.ellipse(sx-cr*0.2, cy2-cr*0.25, cr*0.55, cr*0.55, 0, 0, Math.PI*2);
      ctx.fill();
    }
  }
}
