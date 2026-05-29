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

// Dessine un quad monde flat avec découpage near-plane (Sutherland-Hodgman).
// → la piste ne disparaît plus quand un coin passe derrière la caméra.
function drawFlatQuad(col, p1,p2,p3,p4, fogF){
  const pts=[p1,p2,p3,p4], out=[];
  for(let i=0;i<4;i++){
    const cur=pts[i], nxt=pts[(i+1)%4];
    const pc=project(cur[0],cur[1],cur[2]);
    const pn=project(nxt[0],nxt[1],nxt[2]);
    if(pc) out.push(pc);
    if((!!pc)!==(!!pn)){  // l'arête traverse le plan rapproché
      const bp = pc ? clipEdge(nxt[0],nxt[1],nxt[2], cur[0],cur[1],cur[2])
                    : clipEdge(cur[0],cur[1],cur[2], nxt[0],nxt[1],nxt[2]);
      if(bp) out.push(bp);
    }
  }
  if(out.length<3) return;
  ctx.fillStyle=col;
  ctx.beginPath();
  ctx.moveTo(out[0].sx,out[0].sy);
  for(let i=1;i<out.length;i++) ctx.lineTo(out[i].sx,out[i].sy);
  ctx.closePath();
  ctx.fill();
}

// ── Désignateur de piste : vrais chiffres peints au sol (afficheur 7 segments) ──
// Segments :  aaa / f b / ggg / e c / ddd
const _RWY_SEG = {'0':'abcdef','1':'bc','2':'abged','3':'abgcd','4':'fgbc','5':'afgcd','6':'afgecd','7':'abc','8':'abcdefg','9':'abcdfg'};
function paintDigit(ch, cx, cy, ax, ay, vx, vy, hu, wd, t, z, col, fogF){
  if(!_RWY_SEG[ch]) return;
  const h=wd/2;
  const segs={
    a:[hu-t,hu,-h,h], g:[hu/2-t/2,hu/2+t/2,-h,h], d:[0,t,-h,h],
    f:[hu/2,hu,-h,-h+t], b:[hu/2,hu,h-t,h],
    e:[0,hu/2,-h,-h+t], c:[0,hu/2,h-t,h]
  };
  const pt=(u,v)=>[cx+ax*u+vx*v, cy+ay*u+vy*v, z];
  for(const s of _RWY_SEG[ch]){
    const r=segs[s];
    drawFlatQuad(col, pt(r[0],r[2]), pt(r[1],r[2]), pt(r[1],r[3]), pt(r[0],r[3]), fogF);
  }
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

    // ── 2. Ligne centrale (pointillés BLANCS, partie centrale seulement) ──
    const dashN=Math.floor(ap.len/28);
    const dashL=ap.len/dashN, dashOn=dashL*0.55;
    const lw=ap.wid*0.035; // demi-largeur trait
    for(let i=0;i<dashN;i++){
      const t0=(i/dashN-.5)*ap.len;
      if(Math.abs(t0+dashOn*0.5) > ap.len*0.34) continue; // laisse la place aux chiffres/visée
      const t1=t0+dashOn;
      const lx0=ap.wx+cx*t0, ly0=ap.wy+cy*t0;
      const lx1=ap.wx+cx*t1, ly1=ap.wy+cy*t1;
      drawFlatQuad(white,
        [lx0+px*lw, ly0+py*lw, wz],[lx0-px*lw, ly0-py*lw, wz],
        [lx1-px*lw, ly1-py*lw, wz],[lx1+px*lw, ly1+py*lw, wz], fogF);
    }

    // ── 2b. Lignes de bord continues ──
    {
      const edgeV=hw-ap.wid*0.05, ew=ap.wid*0.025;
      for(let sd=-1;sd<=1;sd+=2){
        drawFlatQuad(white,
          [ap.wx+cx*hl+px*(edgeV*sd+ew), ap.wy+cy*hl+py*(edgeV*sd+ew), wz],
          [ap.wx+cx*hl+px*(edgeV*sd-ew), ap.wy+cy*hl+py*(edgeV*sd-ew), wz],
          [ap.wx-cx*hl+px*(edgeV*sd-ew), ap.wy-cy*hl+py*(edgeV*sd-ew), wz],
          [ap.wx-cx*hl+px*(edgeV*sd+ew), ap.wy-cy*hl+py*(edgeV*sd+ew), wz], fogF);
      }
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

    // ── 4. Désignateur de piste : vrais chiffres aux deux seuils ──
    const degR=((ap.hdg*180/Math.PI)%360+360)%360;
    const wd=ap.wid*0.24, hu=ap.wid*0.62, td=wd*0.30, gap=wd*1.5;
    for(let se=-1;se<=1;se+=2){
      const heading = se<0 ? degR : (degR+180)%360;
      let num=Math.round(heading/10); if(num<=0) num+=36; if(num>36) num-=36;
      const str=String(num).padStart(2,'0');
      const alongPos=se*(hl-ap.len*0.17);
      const txc=ap.wx+cx*alongPos, tyc=ap.wy+cy*alongPos;
      const ux=-se*cx, uy=-se*cy;      // « haut » du chiffre → vers l'intérieur
      const vX=se*px, vY=se*py;         // « droite » lue depuis l'approche (px=-cy, py=cx)
      for(let di=0;di<2;di++){
        const voff=(di-0.5)*gap;
        paintDigit(str[di], txc+vX*voff, tyc+vY*voff, ux,uy, vX,vY, hu, wd, td, wz, white, fogF);
      }
    }

    // ── 4b. Points de visée (deux barres épaisses près de chaque seuil) ──
    {
      const aimAlong=hl*0.46, aimLen=ap.len*0.05, aimW=ap.wid*0.09, aimOff=ap.wid*0.17;
      for(let se=-1;se<=1;se+=2){
        const ax2=ap.wx+cx*se*aimAlong, ay2=ap.wy+cy*se*aimAlong;
        for(let sd=-1;sd<=1;sd+=2){
          const bx=ax2+px*aimOff*sd, by=ay2+py*aimOff*sd;
          drawFlatQuad(white,
            [bx+px*aimW+cx*aimLen, by+py*aimW+cy*aimLen, wz],
            [bx-px*aimW+cx*aimLen, by-py*aimW+cy*aimLen, wz],
            [bx-px*aimW-cx*aimLen, by-py*aimW-cy*aimLen, wz],
            [bx+px*aimW-cx*aimLen, by+py*aimW-cy*aimLen, wz], fogF);
        }
      }
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

// ══ EMPRISE PISTE — utilisé par drawTrees() (défini dans trees.js) ═══
// Vrai si le point (wx,wy) est sur l'emprise d'une piste (piste + talus + marge)
// → empêche les arbres de pousser sur les aéroports
function onAirportArea(wx, wy, aps){
  for(const ap of aps){
    const dx=wx-ap.wx, dy=wy-ap.wy;
    const ax=Math.sin(ap.hdg), ay=Math.cos(ap.hdg);
    const along = dx*ax + dy*ay;        // le long de l'axe de piste
    const across = -dx*ay + dy*ax;      // perpendiculaire
    if(Math.abs(along) < ap.len*0.5 + 40 && Math.abs(across) < ap.wid*2.4 + 18) return true;
  }
  return false;
}

// NB : drawTrees() est défini dans trees.js (chargé après ce fichier).
// Il appelle onAirportArea() ci-dessus pour ne pas planter d'arbres sur les pistes.

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

    // base ancrée au sol réel : le bâtiment descend jusqu'au terrain (jamais flottant)
    const groundBase = (bx,by) => Math.min(z, terrainH(bx,by));

    // ── Hangar principal (côté droit de la piste, milieu) ──
    {
      const bx=ap.wx+px*(hw+22), by=ap.wy+py*(hw+22);
      const bw=18, bd=24, bh=8;
      const gb=groundBase(bx,by);
      drawBox3D(bx,by,gb,bw,bd,(z+bh)-gb,cx,cy,px,py,fogF,
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
      const bx=ap.wx+px*(hw+22)+cx*50, by=ap.wy+py*(hw+22)+cy*50;
      const bw=14, bd=18, bh=6.5;
      const gb=groundBase(bx,by);
      drawBox3D(bx,by,gb,bw,bd,(z+bh)-gb,cx,cy,px,py,fogF,
        [155,148,135],[125,120,110],[95,90,82]);
    }

    // ── Tour de contrôle (côté gauche) ──
    if(dc<1500){
      const tx=ap.wx-px*(hw+20), ty=ap.wy-py*(hw+20);
      const gb=groundBase(tx,ty);
      // Base (descend jusqu'au sol)
      drawBox3D(tx,ty,gb,4,4,(z+14)-gb,cx,cy,px,py,fogF,
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
      const pole=project(sx,sy,groundBase(sx,sy));
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
