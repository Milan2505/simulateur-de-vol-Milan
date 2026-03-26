// ══════════════════════════════════════════════════════════
// AIRPORTS.JS — Données aéroports + rendu pistes + bâtiments
// ══════════════════════════════════════════════════════════

// ══ AÉROPORTS ═══════════════════════════════════════
// Pistes placées manuellement dans des zones plates/côtières
// Format : { wx, wy, heading(rad), length, width, name }
// heading = direction de la piste en radians (0=Nord, PI/2=Est)

// On place les pistes à une hauteur fixe légèrement au-dessus du terrain
// pour éviter le z-fighting (terrain + 1.5u)
const AIRPORTS=[
  { wx:  1200, wy:  2800, hdg: 0.38, len:420, wid:28, name:'LFML' },
  { wx:  4800, wy:  3200, hdg: 1.22, len:380, wid:24, name:'LFMN' },
  { wx:  7600, wy:  1200, hdg: 2.85, len:460, wid:30, name:'LIMC' },
  { wx:  1200, wy:  7600, hdg: 0.72, len:350, wid:22, name:'LSGG' },
  { wx:  4800, wy:  3600, hdg: 1.57, len:500, wid:32, name:'LFLL' },
  // Nouveaux aéroports
  { wx: -3500, wy:  1500, hdg: 0.15, len:550, wid:32, name:'LFPG' },
  { wx: -1800, wy:  5200, hdg: 1.85, len:400, wid:26, name:'LFBO' },
  { wx:  9500, wy:  4800, hdg: 0.52, len:480, wid:30, name:'LIRF' },
  { wx:  6200, wy:  7200, hdg: 2.10, len:360, wid:24, name:'LIRN' },
  { wx: -4200, wy: -2800, hdg: 0.90, len:420, wid:26, name:'LEBL' },
  { wx:  2400, wy: -3200, hdg: 1.20, len:380, wid:24, name:'LFMK' },
  { wx:  8800, wy: -1600, hdg: 2.50, len:440, wid:28, name:'LIPZ' },
  { wx: -6000, wy:  3400, hdg: 0.35, len:520, wid:30, name:'LFBD' },
  { wx:  3200, wy:  9800, hdg: 1.65, len:350, wid:22, name:'LSZH' },
  { wx: -2400, wy: -5500, hdg: 0.70, len:460, wid:28, name:'LEMD' },
];

// Hauteur de piste : terrain + offset pour être dessus
function runwayZ(ap){
  // Échantillonne 9 points sur la piste et prend le maximum
  const cx=Math.sin(ap.hdg), cy=Math.cos(ap.hdg);
  const px=-cy, py=cx;
  const hl=ap.len/2, hw=ap.wid/2;
  let maxH=0;
  for(let ti=-1;ti<=1;ti++) for(let wi=-1;wi<=1;wi++){
    const wx=ap.wx+cx*hl*ti*0.9+px*hw*wi*0.9;
    const wy=ap.wy+cy*hl*ti*0.9+py*hw*wi*0.9;
    maxH=Math.max(maxH, terrainH(wx,wy));
  }
  return Math.max(14, maxH)+2.0;
}

// Projette un point 3D monde et retourne {sx,sy,d} ou null
function prj(wx,wy,wz){ return project(wx,wy,wz); }

// Dessine un quad monde flat avec couleur et distance fog
function drawFlatQuad(col, p1,p2,p3,p4, fogF){
  const a=prj(...p1), b=prj(...p2), c=prj(...p3), d=prj(...p4);
  if(!a||!b||!c||!d) return;
  // Fog
  const f=fogF||0;
  ctx.beginPath();
  ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy);
  ctx.lineTo(c.sx,c.sy); ctx.lineTo(d.sx,d.sy);
  ctx.closePath();
  ctx.fillStyle=col; ctx.fill();
}

function drawAirports(){
  const FAR=12000;
  AIRPORTS.forEach(ap=>{
    // Vecteurs direction piste et perpendiculaire
    const cx=Math.sin(ap.hdg), cy=Math.cos(ap.hdg); // axe piste
    const px=-cy, py=cx;                              // perpendiculaire
    const hl=ap.len/2, hw=ap.wid/2;

    // Centre et distance caméra
    const dxc=ap.wx-pl.x, dyc=ap.wy-pl.y;
    const dc=Math.sqrt(dxc*dxc+dyc*dyc);
    if(dc>FAR) return;
    const fogF=Math.pow(Math.min(1,dc/FAR), 0.6);
    const lite=Math.max(0.55, 1-fogF*0.5);

    const z=runwayZ(ap);

    // ── 0. JUPES LATÉRALES : comblent le vide entre piste et terrain ──
    // 4 côtés de la piste, chaque jupe descend au terrain local
    {
      const SKIRT_W=ap.wid*0.8; // largeur de la jupe de chaque côté
      const sides=[
        { sign:+1, axis:'lat' },  // côté droit
        { sign:-1, axis:'lat' },  // côté gauche
        { sign:+1, axis:'lon' },  // extrémité avant
        { sign:-1, axis:'lon' },  // extrémité arrière
      ];
      const grassLite=Math.round(88*lite), grassG=Math.round(118*lite), grassB=Math.round(52*lite);
      const grassCol=`rgb(${grassLite},${grassG},${grassB})`;
      // Côtés latéraux
      for(const sign of [+1,-1]){
        const steps=8;
        for(let si=0;si<steps;si++){
          const t0=-1+si*2/steps, t1=-1+(si+1)*2/steps;
          const wx0=ap.wx+cx*hl*t0, wy0=ap.wy+cy*hl*t0;
          const wx1=ap.wx+cx*hl*t1, wy1=ap.wy+cy*hl*t1;
          const edgeX0=wx0+px*hw*sign, edgeY0=wy0+py*hw*sign;
          const edgeX1=wx1+px*hw*sign, edgeY1=wy1+py*hw*sign;
          const outerX0=edgeX0+px*SKIRT_W*sign, outerY0=edgeY0+py*SKIRT_W*sign;
          const outerX1=edgeX1+px*SKIRT_W*sign, outerY1=edgeY1+py*SKIRT_W*sign;
          const tg0=terrainH(outerX0,outerY0), tg1=terrainH(outerX1,outerY1);
          drawFlatQuad(grassCol,
            [edgeX0,edgeY0,z],[edgeX1,edgeY1,z],
            [outerX1,outerY1,Math.min(z,tg1+0.1)],[outerX0,outerY0,Math.min(z,tg0+0.1)], fogF);
        }
      }
      // Extrémités longitudinales
      for(const sign of [+1,-1]){
        const endX=ap.wx+cx*hl*sign, endY=ap.wy+cy*hl*sign;
        const steps=4;
        for(let si=0;si<steps;si++){
          const w0=-1+si*2/steps, w1=-1+(si+1)*2/steps;
          const ex0=endX+px*hw*w0, ey0=endY+py*hw*w0;
          const ex1=endX+px*hw*w1, ey1=endY+py*hw*w1;
          const ox0=ex0+cx*SKIRT_W*sign, oy0=ey0+cy*SKIRT_W*sign;
          const ox1=ex1+cx*SKIRT_W*sign, oy1=ey1+cy*SKIRT_W*sign;
          const tg0=terrainH(ox0,oy0), tg1=terrainH(ox1,oy1);
          drawFlatQuad(grassCol,
            [ex0,ey0,z],[ex1,ey1,z],
            [ox1,oy1,Math.min(z,tg1+0.1)],[ox0,oy0,Math.min(z,tg0+0.1)], fogF);
        }
      }
    }

    // ── 1. Dalle béton en bandelettes (évite near-plane culling)
    const gv=Math.round(58*lite); const gbv=Math.round(52*lite);
    const asphalt=`rgb(${gv},${gv},${gbv})`;
    const NSTRIP=16;
    for(let si=0;si<NSTRIP;si++){
      const t0=-1+si*2/NSTRIP, t1=-1+(si+1)*2/NSTRIP; // t ∈ [-1,1]
      const A=[ap.wx + cx*hl*t1 + px*hw, ap.wy + cy*hl*t1 + py*hw, z];
      const B=[ap.wx + cx*hl*t1 - px*hw, ap.wy + cy*hl*t1 - py*hw, z];
      const C=[ap.wx + cx*hl*t0 - px*hw, ap.wy + cy*hl*t0 - py*hw, z];
      const D=[ap.wx + cx*hl*t0 + px*hw, ap.wy + cy*hl*t0 + py*hw, z];
      drawFlatQuad(asphalt, A,B,C,D, fogF);
    }

    // Bandes de sécurité latérales (herbe pelée / gravier)
    const sw=ap.wid*0.6;
    const grav=`rgba(${Math.round(110*lite)},${Math.round(105*lite)},${Math.round(80*lite)},0.85)`;
    const AL=[ap.wx + cx*hl + px*(hw+sw), ap.wy + cy*hl + py*(hw+sw), z-.3];
    const BL=[ap.wx + cx*hl + px*hw,      ap.wy + cy*hl + py*hw,      z-.3];
    const CL=[ap.wx - cx*hl + px*hw,      ap.wy - cy*hl + py*hw,      z-.3];
    const DL=[ap.wx - cx*hl + px*(hw+sw), ap.wy - cy*hl + py*(hw+sw), z-.3];
    drawFlatQuad(grav, AL,BL,CL,DL, fogF);
    const AR=[ap.wx + cx*hl - px*hw,      ap.wy + cy*hl - py*hw,      z-.3];
    const BR=[ap.wx + cx*hl - px*(hw+sw), ap.wy + cy*hl - py*(hw+sw), z-.3];
    const CR=[ap.wx - cx*hl - px*(hw+sw), ap.wy - cy*hl - py*(hw+sw), z-.3];
    const DR=[ap.wx - cx*hl - px*hw,      ap.wy - cy*hl - py*hw,      z-.3];
    drawFlatQuad(grav, AR,BR,CR,DR, fogF);

    // ── Talus de raccordement piste ↔ terrain ─────────────
    // Chaque côté de la piste est relié au terrain par N quads inclinés.
    // On utilise terrainH() aux pieds du talus pour coller exactement au sol.
    const TALUS_W = ap.wid * 1.4;  // largeur du talus (au-delà des bandes de sécurité)
    const TALUS_N = 12;             // nombre de tranches longitudinales
    const grass_r=Math.round(72*lite), grass_g=Math.round(98*lite), grass_b=Math.round(38*lite);
    const grassCol=`rgb(${grass_r},${grass_g},${grass_b})`;
    // Côté gauche (+px)
    for(let si=0;si<TALUS_N;si++){
      const t0=-1+si*2/TALUS_N, t1=-1+(si+1)*2/TALUS_N;
      const bx0=ap.wx+cx*hl*t0, by0=ap.wy+cy*hl*t0;
      const bx1=ap.wx+cx*hl*t1, by1=ap.wy+cy*hl*t1;
      // Bord haut (sur le bord de la piste + bande de sécurité, à z piste)
      const topW=hw+ap.wid*0.55;
      const TL0=[bx0+px*topW, by0+py*topW, z];
      const TL1=[bx1+px*topW, by1+py*topW, z];
      // Pied du talus : terrain réel à TALUS_W du bord
      const footW=hw+TALUS_W;
      const gzL0=terrainH(bx0+px*footW, by0+py*footW);
      const gzL1=terrainH(bx1+px*footW, by1+py*footW);
      const BL0=[bx0+px*footW, by0+py*footW, Math.min(z, gzL0)];
      const BL1=[bx1+px*footW, by1+py*footW, Math.min(z, gzL1)];
      drawFlatQuad(grassCol, TL1,TL0,BL0,BL1, fogF);
    }
    // Côté droit (-px)
    for(let si=0;si<TALUS_N;si++){
      const t0=-1+si*2/TALUS_N, t1=-1+(si+1)*2/TALUS_N;
      const bx0=ap.wx+cx*hl*t0, by0=ap.wy+cy*hl*t0;
      const bx1=ap.wx+cx*hl*t1, by1=ap.wy+cy*hl*t1;
      const topW=hw+ap.wid*0.55;
      const TR0=[bx0-px*topW, by0-py*topW, z];
      const TR1=[bx1-px*topW, by1-py*topW, z];
      const footW=hw+TALUS_W;
      const gzR0=terrainH(bx0-px*footW, by0-py*footW);
      const gzR1=terrainH(bx1-px*footW, by1-py*footW);
      const BR0=[bx0-px*footW, by0-py*footW, Math.min(z, gzR0)];
      const BR1=[bx1-px*footW, by1-py*footW, Math.min(z, gzR1)];
      drawFlatQuad(grassCol, TR0,TR1,BR1,BR0, fogF);
    }
    // Bout début piste
    {
      const topW=hw+ap.wid*0.55;
      const footW=hw+TALUS_W;
      const bx=ap.wx-cx*hl, by=ap.wy-cy*hl;
      for(let wi=-1;wi<=0;wi++){
        const s0=wi*(topW), s1=(wi+1)*(topW);
        const f0=wi*(footW), f1=(wi+1)*(footW);
        const gz0=terrainH(bx-cx*TALUS_W+px*f0, by-cy*TALUS_W+py*f0);
        const gz1=terrainH(bx-cx*TALUS_W+px*f1, by-cy*TALUS_W+py*f1);
        drawFlatQuad(grassCol,
          [bx+px*s1,by+py*s1,z],[bx+px*s0,by+py*s0,z],
          [bx-cx*TALUS_W+px*f0,by-cy*TALUS_W+py*f0,Math.min(z,gz0)],
          [bx-cx*TALUS_W+px*f1,by-cy*TALUS_W+py*f1,Math.min(z,gz1)], fogF);
      }
      for(let wi=0;wi<=1;wi++){
        const s0=wi*(topW), s1=(wi+1)*(topW);
        const f0=wi*(footW), f1=(wi+1)*(footW);
        const gz0=terrainH(bx-cx*TALUS_W+px*f0, by-cy*TALUS_W+py*f0);
        const gz1=terrainH(bx-cx*TALUS_W+px*f1, by-cy*TALUS_W+py*f1);
        drawFlatQuad(grassCol,
          [bx+px*s0,by+py*s0,z],[bx+px*s1,by+py*s1,z],
          [bx-cx*TALUS_W+px*f1,by-cy*TALUS_W+py*f1,Math.min(z,gz1)],
          [bx-cx*TALUS_W+px*f0,by-cy*TALUS_W+py*f0,Math.min(z,gz0)], fogF);
      }
    }
    // Bout fin piste
    {
      const topW=hw+ap.wid*0.55;
      const footW=hw+TALUS_W;
      const bx=ap.wx+cx*hl, by=ap.wy+cy*hl;
      for(let wi=-1;wi<=0;wi++){
        const s0=wi*(topW), s1=(wi+1)*(topW);
        const f0=wi*(footW), f1=(wi+1)*(footW);
        const gz0=terrainH(bx+cx*TALUS_W+px*f0, by+cy*TALUS_W+py*f0);
        const gz1=terrainH(bx+cx*TALUS_W+px*f1, by+cy*TALUS_W+py*f1);
        drawFlatQuad(grassCol,
          [bx+px*s0,by+py*s0,z],[bx+px*s1,by+py*s1,z],
          [bx+cx*TALUS_W+px*f1,by+cy*TALUS_W+py*f1,Math.min(z,gz1)],
          [bx+cx*TALUS_W+px*f0,by+cy*TALUS_W+py*f0,Math.min(z,gz0)], fogF);
      }
      for(let wi=0;wi<=1;wi++){
        const s0=wi*(topW), s1=(wi+1)*(topW);
        const f0=wi*(footW), f1=(wi+1)*(footW);
        const gz0=terrainH(bx+cx*TALUS_W+px*f0, by+cy*TALUS_W+py*f0);
        const gz1=terrainH(bx+cx*TALUS_W+px*f1, by+cy*TALUS_W+py*f1);
        drawFlatQuad(grassCol,
          [bx+px*s1,by+py*s1,z],[bx+px*s0,by+py*s0,z],
          [bx+cx*TALUS_W+px*f0,by+cy*TALUS_W+py*f0,Math.min(z,gz0)],
          [bx+cx*TALUS_W+px*f1,by+cy*TALUS_W+py*f1,Math.min(z,gz1)], fogF);
      }
    }

    if(dc>3500) return; // marquages visibles seulement de près

    const wz=z+0.2; // blanc légèrement au-dessus de l'asphalte
    const wv=Math.round(240*lite);
    const white=`rgba(${wv},${wv},${wv},0.92)`;
    const yellow=`rgba(${Math.round(230*lite)},${Math.round(200*lite)},${Math.round(30*lite)},0.88)`;

    // ── 2. Ligne centrale (pointillés jaunes)
    const dashN=Math.floor(ap.len/28);
    const dashL=ap.len/dashN, dashOn=dashL*0.55;
    const lw=ap.wid*0.045; // demi-largeur trait
    for(let i=0;i<dashN;i++){
      const t0=(i/dashN-.5)*ap.len;
      const t1=t0+dashOn;
      const lx0=ap.wx+cx*t0, ly0=ap.wy+cy*t0;
      const lx1=ap.wx+cx*t1, ly1=ap.wy+cy*t1;
      drawFlatQuad(yellow,
        [lx0+px*lw, ly0+py*lw, wz],[lx0-px*lw, ly0-py*lw, wz],
        [lx1-px*lw, ly1-py*lw, wz],[lx1+px*lw, ly1+py*lw, wz], fogF);
    }

    // ── 3. Seuils de piste (barres blanches transversales)
    const thN=6; // nb de barres par seuil
    const thW=hw*0.78; // largeur totale des barres
    const thH=ap.len*0.04; // longueur de chaque barre
    const thGap=thW/(thN-.5)/thN;
    const barW=thW/thN - thGap;
    for(let s=-1;s<=1;s+=2){ // les deux bouts
      const tx=ap.wx + cx*hl*s*0.88;
      const ty=ap.wy + cy*hl*s*0.88;
      for(let b=0;b<thN;b++){
        const bo=(b/(thN-1)-.5)*thW*2;
        const bx=tx+px*bo, by=ty+py*bo;
        drawFlatQuad(white,
          [bx+px*barW+cx*s*thH, by+py*barW+cy*s*thH, wz],
          [bx-px*barW+cx*s*thH, by-py*barW+cy*s*thH, wz],
          [bx-px*barW,          by-py*barW,            wz],
          [bx+px*barW,          by+py*barW,            wz], fogF);
      }
    }

    // ── 4. Numéros de piste (bandes en croix simulées, 2 extrémités)
    const numW=hw*0.35, numH=ap.len*0.055;
    for(let s=-1;s<=1;s+=2){
      const tx=ap.wx + cx*(hl*s*0.75);
      const ty=ap.wy + cy*(hl*s*0.75);
      // Croix stylisée représentant le chiffre
      // Barre horizontale
      drawFlatQuad(white,
        [tx+px*numW+cx*numH*.2, ty+py*numW+cy*numH*.2, wz],
        [tx-px*numW+cx*numH*.2, ty-py*numW+cy*numH*.2, wz],
        [tx-px*numW-cx*numH*.2, ty-py*numW-cy*numH*.2, wz],
        [tx+px*numW-cx*numH*.2, ty+py*numW-cy*numH*.2, wz], fogF);
      // Barre verticale
      drawFlatQuad(white,
        [tx+px*numH*.2+cx*numH*.6, ty+py*numH*.2+cy*numH*.6, wz],
        [tx-px*numH*.2+cx*numH*.6, ty-py*numH*.2+cy*numH*.6, wz],
        [tx-px*numH*.2-cx*numH*.6, ty-py*numH*.2-cy*numH*.6, wz],
        [tx+px*numH*.2-cx*numH*.6, ty+py*numH*.2-cy*numH*.6, wz], fogF);
    }

    // ── 5. Feux de bord de piste (points rouges/blancs)
    if(dc<1800){
      const lightN=Math.floor(ap.len/40);
      for(let i=0;i<=lightN;i++){
        const t=(i/lightN-.5)*ap.len;
        for(let side=-1;side<=1;side+=2){
          const lx=ap.wx+cx*t+px*(hw+2)*side;
          const ly=ap.wy+cy*t+py*(hw+2)*side;
          const lpr=project(lx,ly,z+0.5);
          if(!lpr||lpr.d>1800) continue;
          const r=Math.max(1.5, 5/lpr.d*40);
          const isEnd=i===0||i===lightN;
          ctx.beginPath();
          ctx.arc(lpr.sx,lpr.sy,r,0,Math.PI*2);
          ctx.fillStyle=isEnd?`rgba(255,80,60,${0.9-fogF*.4})`:`rgba(255,240,180,${0.85-fogF*.4})`;
          ctx.fill();
        }
      }
    }

    // ── 6. Panneau nom de l'aéroport (proche seulement)
    if(dc<600){
      const npr=project(ap.wx+px*hw*2.2, ap.wy+py*hw*2.2, z+4);
      if(npr){
        ctx.save();
        ctx.font=`bold ${Math.round(18/npr.d*120)}px monospace`;
        ctx.fillStyle=`rgba(255,240,120,${Math.max(0,1-dc/600)})`;
        ctx.textAlign='center';
        ctx.fillText(ap.name, npr.sx, npr.sy);
        ctx.restore();
      }
    }
  });
}

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

// ══ BÂTIMENTS AÉROPORT ═══════════════════════════════════
// Hangars et tour de contrôle près de chaque piste
function drawAirportBuildings(){
  const MAX_DIST=2000;
  AIRPORTS.forEach(ap=>{
    const dx=ap.wx-pl.x, dy=ap.wy-pl.y;
    const dc=Math.sqrt(dx*dx+dy*dy);
    if(dc>MAX_DIST) return;

    const fogF=Math.pow(Math.min(1,dc/MAX_DIST),0.6);
    const z=runwayZ(ap);
    const cx=Math.sin(ap.hdg), cy=Math.cos(ap.hdg);
    const px=-cy, py=cx;
    const hw=ap.wid/2;

    // ── Hangar principal (côté droit de la piste, milieu) ──
    {
      const bx=ap.wx+px*(hw+35), by=ap.wy+py*(hw+35);
      const bw=18, bd=24, bh=8;
      drawBox3D(bx,by,z,bw,bd,bh,cx,cy,px,py,fogF,
        [140,135,125],[110,108,100],[85,82,78]);
      // Toit
      drawBox3D(bx,by,z+bh,bw+1,bd+1,1.5,cx,cy,px,py,fogF,
        [160,155,148],[140,135,128],[120,115,108]);
      // Porte (face avant)
      const doorW=bw*0.7, doorH=bh*0.75;
      const dfc=Math.max(0.3,1-fogF);
      const dp=project(bx+cx*bd/2, by+cy*bd/2, z+doorH/2);
      if(dp && dp.d<1200){
        const dsz=Math.max(2, doorW*40/dp.d);
        const dsh=Math.max(2, doorH*40/dp.d);
        ctx.fillStyle=`rgba(45,42,38,${dfc*0.8})`;
        ctx.fillRect(dp.sx-dsz/2, dp.sy-dsh*0.3, dsz, dsh*0.6);
      }
    }

    // ── Second hangar (côté droit, décalé) ──
    {
      const bx=ap.wx+px*(hw+35)+cx*50, by=ap.wy+py*(hw+35)+cy*50;
      const bw=14, bd=18, bh=6.5;
      drawBox3D(bx,by,z,bw,bd,bh,cx,cy,px,py,fogF,
        [155,148,135],[125,120,110],[95,90,82]);
    }

    // ── Tour de contrôle (côté gauche) ──
    if(dc<1500){
      const tx=ap.wx-px*(hw+28), ty=ap.wy-py*(hw+28);
      // Base
      drawBox3D(tx,ty,z,4,4,14,cx,cy,px,py,fogF,
        [165,160,152],[135,130,122],[105,100,92]);
      // Cabine vitrée
      drawBox3D(tx,ty,z+14,6,6,4,cx,cy,px,py,fogF,
        [130,185,200],[100,155,170],[80,135,150]);
      // Toit
      drawBox3D(tx,ty,z+18,7,7,0.8,cx,cy,px,py,fogF,
        [90,88,82],[70,68,62],[55,52,48]);
    }

    // ── Manche à air (windsock) ──
    if(dc<800){
      const sx=ap.wx-px*(hw+12)+cx*ap.len*0.35;
      const sy=ap.wy-py*(hw+12)+cy*ap.len*0.35;
      const pole=project(sx,sy,z);
      const poleTop=project(sx,sy,z+6);
      if(pole&&poleTop){
        // Mât
        ctx.strokeStyle=`rgba(160,155,145,${1-fogF*0.6})`;
        ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(pole.sx,pole.sy); ctx.lineTo(poleTop.sx,poleTop.sy); ctx.stroke();
        // Manche (cone orange/blanc)
        const wdX=Math.sin(pl.yaw*0.3+0.5)*2.5, wdZ=-0.8;
        const sockEnd=project(sx+wdX,sy+wdX*0.5,z+5.5+wdZ);
        if(sockEnd){
          ctx.strokeStyle=`rgba(255,140,30,${0.85-fogF*0.4})`;
          ctx.lineWidth=Math.max(1, 3-pole.d*0.003);
          ctx.beginPath(); ctx.moveTo(poleTop.sx,poleTop.sy); ctx.lineTo(sockEnd.sx,sockEnd.sy); ctx.stroke();
        }
      }
    }
  });
}

// Utilitaire : dessine un box 3D simple
function drawBox3D(bx,by,bz,bw,bd,bh, cx,cy,px,py, fogF, colTop,colSide,colFront){
  const hw=bw/2, hd=bd/2;
  function fogCol(c){
    return `rgb(${Math.round(c[0]*(1-fogF)+FOG_R*fogF)},${Math.round(c[1]*(1-fogF)+FOG_G*fogF)},${Math.round(c[2]*(1-fogF)+FOG_B*fogF)})`;
  }
  // 8 coins
  const corners=[
    [bx-px*hw-cx*hd, by-py*hw-cy*hd, bz],      //0 bottom near-left
    [bx+px*hw-cx*hd, by+py*hw-cy*hd, bz],      //1 bottom near-right
    [bx+px*hw+cx*hd, by+py*hw+cy*hd, bz],      //2 bottom far-right
    [bx-px*hw+cx*hd, by-py*hw+cy*hd, bz],      //3 bottom far-left
    [bx-px*hw-cx*hd, by-py*hw-cy*hd, bz+bh],   //4 top near-left
    [bx+px*hw-cx*hd, by+py*hw-cy*hd, bz+bh],   //5 top near-right
    [bx+px*hw+cx*hd, by+py*hw+cy*hd, bz+bh],   //6 top far-right
    [bx-px*hw+cx*hd, by-py*hw+cy*hd, bz+bh],   //7 top far-left
  ];
  const pc=corners.map(c=>project(...c));
  function face(col,i0,i1,i2,i3){
    const p0=pc[i0],p1=pc[i1],p2=pc[i2],p3=pc[i3];
    if(!p0||!p1||!p2||!p3) return null;
    const avgD=(p0.d+p1.d+p2.d+p3.d)/4;
    return {col,p0,p1,p2,p3,d:avgD};
  }
  // Collecter toutes les faces visibles
  const faces=[
    face(colTop,4,5,6,7),
    face(colFront,0,1,5,4),
    face(colFront,3,7,6,2),
    face(colSide,0,4,7,3),
    face(colSide,1,2,6,5),
  ].filter(f=>f!==null);
  // Trier back-to-front pour painter's algorithm correct
  faces.sort((a,b)=>b.d-a.d);
  for(const f of faces){
    ctx.fillStyle=fogCol(f.col);
    ctx.beginPath();
    ctx.moveTo(f.p0.sx,f.p0.sy); ctx.lineTo(f.p1.sx,f.p1.sy);
    ctx.lineTo(f.p2.sx,f.p2.sy); ctx.lineTo(f.p3.sx,f.p3.sy);
    ctx.closePath(); ctx.fill();
  }
}
