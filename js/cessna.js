// ══════════════════════════════════════════════════════════
// CESSNA.JS — Modèle 3D Cessna 172 + rendu avion
// ══════════════════════════════════════════════════════════

// ══ CESSNA 172 ══════════════════════════════════════
// Repère local : x=droite, y=avant(nez), z=haut
// C172 : fuselage y∈[-14,18], span x∈[-20,20], h z∈[-1.2,4.5]

function rotatePt(p,yaw,pitch,roll){
  let [x,y,z]=p;
  const cr=Math.cos(roll),sr=Math.sin(roll);
  [x,z]=[x*cr-z*sr,x*sr+z*cr];
  const cp=Math.cos(pitch),sp=Math.sin(pitch);
  [y,z]=[y*cp-z*sp,y*sp+z*cp];
  const cy=Math.cos(yaw),sy=Math.sin(yaw);
  return[x*cy+y*sy,-x*sy+y*cy,z];
}
// Pivot offset : l'avion pivote autour du niveau des ailes (z_local=4.12)
const PIVOT_Z = 4.12;
function projP(lx,ly,lz){
  // Décaler par rapport au pivot (ailes), pivoter, puis repositionner
  const[rx,ry,rz]=rotatePt([lx, ly, lz-PIVOT_Z], pl.yaw, pl.pitch, pl.roll);
  return project(pl.x+rx, pl.y+ry, pl.z+rz+PIVOT_Z);
}

// Couleurs
const CESSNA_MESH=(()=>{
  const M=[];
  function quad(col,a,b,c,d){
    const ex=c[0]-a[0],ey=c[1]-a[1],ez=c[2]-a[2];
    const fx=d[0]-b[0],fy=d[1]-b[1],fz=d[2]-b[2];
    const nx=ey*fz-ez*fy,ny=ez*fx-ex*fz,nz=ex*fy-ey*fx;
    const nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
    M.push({col,v:[a,b,c,d],n:[nx/nl,ny/nl,nz/nl]});
  }
  function tri(col,a,b,c){
    const ex=b[0]-a[0],ey=b[1]-a[1],ez=b[2]-a[2];
    const fx=c[0]-a[0],fy=c[1]-a[1],fz=c[2]-a[2];
    const nx=ey*fz-ez*fy,ny=ez*fx-ex*fz,nz=ex*fy-ey*fx;
    const nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
    M.push({col,v:[a,b,c],n:[nx/nl,ny/nl,nz/nl]});
  }
  const W='#f0ede2',W2='#dedad0',W3='#c4c0b5',W4='#b0acA0';
  const MT='#6a6258',MT2='#48423c';
  const GL='#96d2ea',GL2='#6eb8d2';
  const RD='#c41818';
  const GY='#888070',GK='#48423a';
  const TY='#181410',HB='#888078';

  function gBox(col,x1,y1,z1,x2,y2,z2,w){
    quad(col,[x1-w,y1,z1-w],[x2-w,y2,z2-w],[x2+w,y2,z2-w],[x1+w,y1,z1-w]);
    quad(GK, [x1-w,y1,z1+w],[x1+w,y1,z1+w],[x2+w,y2,z2+w],[x2-w,y2,z2+w]);
    quad(GK, [x1-w,y1,z1-w],[x1-w,y1,z1+w],[x2-w,y2,z2+w],[x2-w,y2,z2-w]);
    quad(col,[x1+w,y1,z1-w],[x2+w,y2,z2-w],[x2+w,y2,z2+w],[x1+w,y1,z1+w]);
  }
  function gWheel(ct,ch,x,y,z,r,rw){
    const N=12,hr=r*.5;
    for(let i=0;i<N;i++){
      const a0=i/N*Math.PI*2,a1=(i+1)/N*Math.PI*2;
      const y0=Math.cos(a0)*r,z0=Math.sin(a0)*r,y1=Math.cos(a1)*r,z1=Math.sin(a1)*r;
      quad(ct,[x-rw,y+y0,z+z0],[x+rw,y+y0,z+z0],[x+rw,y+y1,z+z1],[x-rw,y+y1,z+z1]);
      quad(ct,[x-rw,y+y1,z+z1],[x-rw,y+y0,z+z0],[x-rw,y+Math.cos(a0)*hr,z+Math.sin(a0)*hr],[x-rw,y+Math.cos(a1)*hr,z+Math.sin(a1)*hr]);
      quad(ct,[x+rw,y+y0,z+z0],[x+rw,y+y1,z+z1],[x+rw,y+Math.cos(a1)*hr,z+Math.sin(a1)*hr],[x+rw,y+Math.cos(a0)*hr,z+Math.sin(a0)*hr]);
      quad(ch,[x-rw,y+Math.cos(a0)*hr,z+Math.sin(a0)*hr],[x+rw,y+Math.cos(a0)*hr,z+Math.sin(a0)*hr],[x+rw,y+Math.cos(a1)*hr,z+Math.sin(a1)*hr],[x-rw,y+Math.cos(a1)*hr,z+Math.sin(a1)*hr]);
    }
  }

  // ══════════════════════════════════════════
  // CAPOT MOTEUR — y: 13.5 → 19.8
  // Section circulaire, 8 faces longitudinales
  // Centré à z≈-2.1 (plus bas que le fuselage cabine)
  // ══════════════════════════════════════════
  {
    // 6 stations pour capot plus lisse : [y, rx, rz, cz]
    const S=[
      [13.5,1.22,1.30,-2.05], // raccord fuselage
      [14.5,1.28,1.36,-2.08], // élargissement doux
      [15.8,1.30,1.40,-2.10], // section max
      [17.0,1.20,1.28,-2.08], // début convergence
      [18.4,0.98,1.05,-2.05], // convergence
      [19.6,0.62,0.65,-2.02], // nez
    ];
    const N=12; // 12 faces au lieu de 8 pour plus de rondeur
    for(let s=0;s<S.length-1;s++){
      const [ya,rxa,rza,cza]=S[s],[yb,rxb,rzb,czb]=S[s+1];
      for(let i=0;i<N;i++){
        const a0=i/N*Math.PI*2-Math.PI/2,a1=(i+1)/N*Math.PI*2-Math.PI/2;
        const A=[Math.cos(a0)*rxa, ya, cza+Math.sin(a0)*rza];
        const B=[Math.cos(a1)*rxa, ya, cza+Math.sin(a1)*rza];
        const C=[Math.cos(a1)*rxb, yb, czb+Math.sin(a1)*rzb];
        const D=[Math.cos(a0)*rxb, yb, czb+Math.sin(a0)*rzb];
        // Alternance couleurs pour effet métallique
        const col=(i%2===0)?MT:MT2;
        quad(col,A,B,C,D);
      }
    }
    // Fermeture avant (nez arrondi)
    const [yf,rxf,rzf,czf]=S[S.length-1];
    for(let i=0;i<N;i++){
      const a0=i/N*Math.PI*2-Math.PI/2,a1=(i+1)/N*Math.PI*2-Math.PI/2;
      tri(MT2,[0,20.2,czf],[Math.cos(a0)*rxf,yf,czf+Math.sin(a0)*rzf],[Math.cos(a1)*rxf,yf,czf+Math.sin(a1)*rzf]);
    }
    // Prise d'air capot (entrée inférieure)
    quad('#282420',[-.55,19.2,-2.60],[.55,19.2,-2.60],[.50,18.0,-2.62],[-.50,18.0,-2.62]);
    // Tuyaux d'échappement (côté droit)
    gBox('#484040', 1.10,15.5,-2.80, 1.10,17.5,-2.85, 0.08);
    gBox('#484040', 1.10,15.5,-3.00, 1.10,17.2,-3.05, 0.08);
  }

  // ══════════════════════════════════════════
  // FUSELAGE — géométrie EXPLICITE par faces
  //
  // Vue de côté : 4 arêtes longitudinales
  //   TOP    :  z_top  (toit)
  //   BOT    :  z_bot  (plancher)
  //   La section est un hexagone approché :
  //   6 points de section : top, top-R, R, bot-R, bot, L (miroir)
  //
  // Coordonnées des 4 arêtes sur les stations-clés :
  //   Station    y     x    z_top  z_bot
  //   Firewall  13.5  1.22   2.30  -1.52  ← cabine haute
  //   CabMax     5.0  1.72   2.35  -1.55  ← cabine la plus large
  //   CabEnd    -2.0  1.68   2.28  -1.50  ← fin cabine
  //   StepBot   -3.5  1.02   1.62  -1.20  ← STEP
  //   TailMid   -8.0  0.68   1.12  -0.82
  //   TailEnd  -16.0  0.12   0.42  -0.62
  //
  // Les 6pts de section = top-L/top-R, shoulder-L/R, bot-L/bot-R
  // ══════════════════════════════════════════

  // Stations fuselage [y, xm, zt, zb, z_shoulder_off]
  // z_shoulder_off : décalage vertical des épaules par rapport au mi-hauteur
  // 9 stations pour un fuselage plus lisse et réaliste
  const FS=[
    [13.5, 1.22, 2.30,-1.52, 0.35],  // F0 firewall
    [ 9.0, 1.58, 2.34,-1.54, 0.33],  // F1 pare-brise
    [ 5.0, 1.72, 2.35,-1.55, 0.32],  // F2 cabine max
    [ 1.0, 1.72, 2.32,-1.53, 0.32],  // F3 mi-cabine
    [-2.0, 1.68, 2.28,-1.50, 0.33],  // F4 fin cabine
    [-3.5, 1.02, 1.62,-1.20, 0.42],  // F5 step
    [-6.0, 0.82, 1.35,-1.00, 0.46],  // F6 queue avant
    [-10.0,0.52, 0.92,-0.68, 0.55],  // F7 queue
    [-13.5,0.28, 0.58,-0.48, 0.65],  // F8 queue fine
    [-16.0,0.12, 0.42,-0.42, 0.70],  // F9 extrémité
  ];

  // Pour chaque station, génère les 6 points [x,y,z] côté droit
  function fsPts(f){
    const [y,xm,zt,zb,so]=f;
    const zMid=(zt+zb)/2, zH=(zt-zb)/2;
    return [
      [0,    y, zt],               // top-center
      [xm*0.7, y, zt-zH*0.28],    // top-shoulder
      [xm,   y, zMid+zH*so],       // shoulder haut
      [xm,   y, zMid-zH*so],       // shoulder bas
      [xm*0.7, y, zb+zH*0.22],    // bot-shoulder
      [0,    y, zb],               // bot-center
    ];
  }

  function mirrorX(p){ return [-p[0],p[1],p[2]]; }

  // Connecte deux stations (6pts chacune)
  function fusSegment(A,B, cTop,cSide,cBot){
    const N=6;
    // Côté droit
    for(let i=0;i<N-1;i++){
      const col=i<2?cTop:i<4?cSide:cBot;
      quad(col, A[i],A[i+1],B[i+1],B[i]);
    }
    // Dessus (entre top-L et top-R)
    quad(cTop, A[0],B[0],B[0],[mirrorX(B[0])[0],B[0][1],B[0][2]]);
    // En fait dessus = quad entre top-L et top-R des deux stations
    const AL=mirrorX(A[0]),BL=mirrorX(B[0]);
    quad(cTop, AL,A[0],B[0],BL);
    // Dessous
    const A5L=mirrorX(A[5]),B5L=mirrorX(B[5]);
    quad(cBot, A5L,B5L,B[5],A[5]);
    // Côté gauche (miroir)
    for(let i=0;i<N-1;i++){
      const col=i<2?cTop:i<4?cSide:cBot;
      const pA=mirrorX(A[i]),pA1=mirrorX(A[i+1]),pB=mirrorX(B[i]),pB1=mirrorX(B[i+1]);
      quad(col, pA1,pA,pB,pB1);
    }
  }

  // Fuselage par segments
  const pts=FS.map(fsPts);
  const colsPerSeg=[
    [W, W2,W3],   // firewall→pare-brise
    [W, W2,W3],   // pare-brise→cabine max
    [W, W2,W3],   // cabine max→mi-cabine
    [W, W2,W3],   // mi-cabine→fin cabine
    [W2,W3,W3],   // step
    [W2,W3,W3],   // queue avant
    [W3,W3,W4],   // queue
    [W3,W3,W4],   // queue fine
    [W3,W3,W4],   // extrémité
  ];
  for(let i=0;i<pts.length-1;i++){
    fusSegment(pts[i],pts[i+1],...colsPerSeg[i]);
  }
  // Fermeture queue
  {
    const p=pts[pts.length-1];
    const pL=p.map(mirrorX);
    for(let i=0;i<p.length-1;i++) tri(W4,p[i+1],p[i],[0,-16.5,-0.42]);
    for(let i=0;i<pL.length-1;i++) tri(W4,pL[i],pL[i+1],[0,-16.5,-0.42]);
  }
  // Face firewall (avant cabine, derrière capot)
  {
    const p=pts[0];
    const [y]=FS[0];
    const pL=p.map(mirrorX);
    for(let i=0;i<p.length-1;i++) tri(W2,p[i],p[i+1],[0,y,-0.10]);
    for(let i=0;i<pL.length-1;i++) tri(W2,pL[i+1],pL[i],[0,y,-0.10]);
  }

  // ══ BANDES ROUGES — sur les flancs cabine (F0→F4)
  {
    const e=0.025;
    for(let i=0;i<4;i++){  // segments F0→F4 (firewall → fin cabine)
      const A=pts[i], B=pts[i+1];
      // shoulder = pts[2] et pts[3] = flanc droit
      // Interpolation en z entre shoulder haut (idx2) et shoulder bas (idx3)
      function stripe(t0,t1){
        const zA0=A[2][2]*(1-t0)+A[3][2]*t0, zA1=A[2][2]*(1-t1)+A[3][2]*t1;
        const zB0=B[2][2]*(1-t0)+B[3][2]*t0, zB1=B[2][2]*(1-t1)+B[3][2]*t1;
        const xA=A[2][0]+e, xB=B[2][0]+e;
        const yA=A[0][1], yB=B[0][1];
        quad(RD,[xA,yA,zA0],[xB,yB,zB0],[xB,yB,zB1],[xA,yA,zA1]);
        quad(RD,[-xA,yA,zA1],[-xB,yB,zB1],[-xB,yB,zB0],[-xA,yA,zA0]);
      }
      stripe(0.15,0.35);   // bande haute
      stripe(0.60,0.80);   // bande basse
    }
  }

  // ══ VITRES — taille réaliste (pas toute la hauteur !)
  // Sur le vrai C172 : vitres entre z_bas_vitre≈+0.5 et z_haut_vitre≈+2.1
  {
    const vZ1=-0.10, vZ2=2.05;  // bas et haut de la rangée de vitres
    const e=0.02;
    // Pare-brise (incliné, y 13.5→9.5)
    quad(GL, [-1.48,13.5,vZ1],[1.48,13.5,vZ1],[1.65,9.5,vZ2],[-1.65,9.5,vZ2]);
    // Grande vitre latérale D (y 9.5→-2.0)
    quad(GL2,[1.70+e, 9.5,vZ1],[1.70+e, 9.5,vZ2],[1.68+e,-2.0,vZ2-0.05],[1.68+e,-2.0,vZ1+0.05]);
    // Grande vitre lat G
    quad(GL2,[-1.70-e, 9.5,vZ1],[-1.68-e,-2.0,vZ1+0.05],[-1.68-e,-2.0,vZ2-0.05],[-1.70-e, 9.5,vZ2]);
    // Vitre arrière D (petite)
    quad(GL2,[1.68+e,-2.0,vZ1+0.15],[1.68+e,-2.0,vZ2-0.25],[0.88,-3.8,vZ2-0.80],[0.88,-3.8,vZ1+0.28]);
    quad(GL2,[-1.68-e,-2.0,vZ1+0.15],[-0.88,-3.8,vZ1+0.28],[-0.88,-3.8,vZ2-0.80],[-1.68-e,-2.0,vZ2-0.25]);
    // Toit vitré (rail)
    quad(GL, [-1.70,9.5,vZ2+0.12],[1.70,9.5,vZ2+0.12],[1.68,-2.0,vZ2+0.05],[-1.68,-2.0,vZ2+0.05]);
  }

  // ══ AILES HIGH-WING (7 stations pour profil plus lisse + dièdre réaliste)
  function wing(s){
    const WP=[
      [s*1.72,  9.5,1.5, 0.18,-0.14,0.00],
      [s*4.0,   9.2,1.7, 0.19,-0.13,0.03],
      [s*7.5,   8.8,1.9, 0.20,-0.12,0.07],
      [s*11.0,  8.4,2.1, 0.21,-0.11,0.11],
      [s*15.0,  7.9,2.4, 0.23,-0.09,0.16],
      [s*19.0,  7.5,2.7, 0.24,-0.08,0.22],
      [s*22.0,  7.3,2.9, 0.25,-0.07,0.26],
    ];
    for(let i=0;i<WP.length-1;i++){
      const [xa,yaa,yab,zta,zba,dza]=WP[i],[xb,yba,ybb,ztb,zbb,dzb]=WP[i+1];
      const zmA=(zta+zba)/2+dza,zmB=(ztb+zbb)/2+dzb;
      quad(W, [xa,yab,zta+dza],[xa,yaa,zta+dza],[xb,yba,ztb+dzb],[xb,ybb,ztb+dzb]);
      quad(W3,[xa,yab,zba+dza],[xb,ybb,zbb+dzb],[xb,yba,zbb+dzb],[xa,yaa,zba+dza]);
      quad(W, [xa,yaa,zmA],[xb,yba,zmB],[xb,yba,ztb+dzb],[xa,yaa,zta+dza]);
      quad(W2,[xa,yaa,zba+dza],[xa,yaa,zmA],[xb,yba,zmB],[xb,yba,zbb+dzb]);
      quad(W2,[xa,yab,zta+dza],[xb,ybb,ztb+dzb],[xb,ybb,zbb+dzb],[xa,yab,zba+dza]);
    }
    const [xs,ysa,ysb,zts,zbs,dzs]=WP[WP.length-1];
    quad(W2,[xs,ysa,zbs+dzs],[xs,ysb,zbs+dzs],[xs,ysb,zts+dzs],[xs,ysa,zts+dzs]);
    quad(s>0?'#d42020':'#20a030',[xs+s*.02,ysa,zbs+dzs],[xs+s*.02,ysb,zbs+dzs],[xs+s*.02,ysb,zts+dzs],[xs+s*.02,ysa,zts+dzs]);
  }
  wing(+1); wing(-1);

  // STRUTS
  function struts(s){
    const w=0.09;
    function st(wx,wy,wz,fx,fy,fz){
      quad(GY,[wx-w,wy,wz],[wx+w,wy,wz],[fx+w,fy,fz],[fx-w,fy,fz]);
      quad(GK,[wx-w,wy,wz+.04],[fx-w,fy,fz+.04],[fx+w,fy,fz+.04],[wx+w,wy,wz+.04]);
      quad(GY,[wx,wy,wz-w],[fx,fy,fz-w],[fx,fy,fz+w],[wx,wy,wz+w]);
    }
    st(s*9.0,7.5,-0.14,  s*2.5,7.2,-1.55);
    st(s*6.5,3.2,-0.14,  s*1.8,3.5,-1.55);
    quad(GY,[s*6.5,3.2,-0.18],[s*9.0,7.5,-0.18],[s*9.0,7.5,-0.10],[s*6.5,3.2,-0.10]);
  }
  struts(+1); struts(-1);

  // ══ EMPENNAGE HORIZONTAL (4 stations pour douceur)
  function stab(s){
    const E=[
      [s*0.30,-10.0,-13.5,-0.40,-0.52,0.00],
      [s*2.2, -10.2,-13.6,-0.39,-0.51,0.02],
      [s*4.8, -10.5,-13.9,-0.38,-0.50,0.06],
      [s*7.5, -10.9,-14.2,-0.42,-0.54,0.10],
    ];
    for(let i=0;i<E.length-1;i++){
      const [xa,yaa,yab,zta,zba,dza]=E[i],[xb,yba,ybb,ztb,zbb,dzb]=E[i+1];
      quad(W, [xa,yab,zta+dza],[xa,yaa,zta+dza],[xb,yba,ztb+dzb],[xb,ybb,ztb+dzb]);
      quad(W3,[xa,yab,zba+dza],[xb,ybb,zbb+dzb],[xb,yba,zbb+dzb],[xa,yaa,zba+dza]);
      quad(W2,[xa,yaa,zba+dza],[xb,yba,zbb+dzb],[xb,yba,ztb+dzb],[xa,yaa,zta+dza]);
      quad(W3,[xa,yab,zta+dza],[xb,ybb,ztb+dzb],[xb,ybb,zbb+dzb],[xa,yab,zba+dza]);
    }
    const [xs,ysa,ysb,zts,zbs,dzs]=E[E.length-1];
    quad(W2,[xs,ysa,zbs+dzs],[xs,ysb,zbs+dzs],[xs,ysb,zts+dzs],[xs,ysa,zts+dzs]);
  }
  stab(+1); stab(-1);

  // ══ DÉRIVE VERTICALE
  {
    const fw=0.23;
    const F=[
      [-10.0,-15.0,-0.82],
      [-10.2,-15.6, 0.65],
      [-10.6,-15.9, 2.55],
      [-11.5,-15.8, 4.85],
      [-12.3,-15.0, 6.60],
      [-13.0,-13.8, 7.42],
      [-13.3,-12.4, 7.20],
    ];
    for(let i=0;i<F.length-1;i++){
      const [ya0,yb0,z0]=F[i],[ya1,yb1,z1]=F[i+1];
      quad(W, [fw,ya0,z0],[fw,ya1,z1],[-fw,ya1,z1],[-fw,ya0,z0]);
      quad(W2,[-fw,ya0,z0],[-fw,ya1,z1],[fw,ya1,z1],[fw,ya0,z0]);
    }
    tri(W,[fw,F[6][0],F[6][2]],[-fw,F[6][0],F[6][2]],[0,F[6][0]-0.5,F[6][2]-0.4]);
    // Bandes rouges dérive
    for(let i=2;i<F.length-1;i++){
      const [ya0,,z0]=F[i],[ya1,,z1]=F[i+1];
      const za=z0*0.20+0.55,zb=z0*0.52,zc=z1*0.20+0.55,zd=z1*0.52;
      if(zb>za+0.10) quad(RD,[fw+.02,ya0,za],[fw+.02,ya1,zc],[fw+.02,ya1,zd],[fw+.02,ya0,zb]);
    }
    // Feu sommet
    tri('#ff4040',[fw*.6,F[5][0],F[5][2]+.05],[-fw*.6,F[5][0],F[5][2]+.05],[0,F[5][0]+.35,F[5][2]+.05]);
  }

  // ══ TRAIN
  gBox(GY, 0,16.5,-1.52, 0,16.5,-2.70,0.13);
  gBox(GY,-0.28,16.5,-2.58,-0.28,16.5,-3.25,0.07);
  gBox(GY, 0.28,16.5,-2.58, 0.28,16.5,-3.25,0.07);
  gWheel(TY,HB, 0,16.5,-3.58, 0.45,0.16);
  gBox(GY,-1.72,4.2,-1.60,-3.45,4.0,-2.82,0.16);
  gWheel(TY,HB,-3.45,4.0,-3.28, 0.76,0.25);
  gBox(GY, 1.72,4.2,-1.60, 3.45,4.0,-2.82,0.16);
  gWheel(TY,HB, 3.45,4.0,-3.28, 0.76,0.25);

  // Wheel pants
  function pant(s){
    const x1=s*2.50,x2=s*4.20,yF=5.8,yR=2.2,zT=-1.60,zB=-4.12;
    quad(W2,[x1,yF,zT],[x2,yF,zT],[x2,yR,zT],[x1,yR,zT]);
    quad(GY, [x1,yF,zB],[x1,yR,zB],[x2,yR,zB],[x2,yF,zB]);
    tri(W2,[x1,yF,zT],[x2,yF,zT],[x1,yF,zB]);
    tri(W2,[x2,yF,zT],[x2,yF,zB],[x1,yF,zB]);
    tri(W3,[x1,yR,zT],[x1,yR,zB],[x2,yR,zT]);
    tri(W3,[x1,yR,zB],[x2,yR,zB],[x2,yR,zT]);
    quad(W2,[x1,yF,zT],[x1,yR,zT],[x2,yR,zT],[x2,yF,zT]);
    quad(GY, [x1,yF,zB],[x2,yF,zB],[x2,yR,zB],[x1,yR,zB]);
  }
  pant(+1); pant(-1);

  // ══ ANTENNE VHF (toit fuselage) ══
  {
    const aw=0.04;
    quad(GY,[aw,-4.0,2.30],[-aw,-4.0,2.30],[-aw,-5.5,2.28],[aw,-5.5,2.28]);
    tri(GY,[aw,-4.0,2.30],[-aw,-4.0,2.30],[0,-4.2,4.20]);
    tri(GY,[-aw,-5.5,2.28],[aw,-5.5,2.28],[0,-4.2,4.20]);
    quad(GY,[aw,-4.0,2.30],[aw,-5.5,2.28],[0,-4.2,4.20],[0,-4.2,4.20]);
    quad(GY,[-aw,-4.0,2.30],[0,-4.2,4.20],[0,-4.2,4.20],[-aw,-5.5,2.28]);
  }

  // ══ ANTENNE ELT (ventre) ══
  {
    const aw=0.03;
    tri(GY,[aw,-6.0,-1.50],[-aw,-6.0,-1.50],[0,-6.5,-2.40]);
    tri(GY,[-aw,-7.0,-1.48],[aw,-7.0,-1.48],[0,-6.5,-2.40]);
    quad(GY,[aw,-6.0,-1.50],[0,-6.5,-2.40],[0,-6.5,-2.40],[aw,-7.0,-1.48]);
    quad(GY,[-aw,-6.0,-1.50],[-aw,-7.0,-1.48],[0,-6.5,-2.40],[0,-6.5,-2.40]);
  }

  // ══ TUBE PITOT (aile gauche) ══
  {
    const pw=0.035, py1=10.8, py2=13.5, pz=0.18, px=-8.0;
    quad(GY,[px-pw,py1,pz-pw],[px+pw,py1,pz-pw],[px+pw,py2,pz-pw],[px-pw,py2,pz-pw]);
    quad(GY,[px-pw,py1,pz+pw],[px-pw,py2,pz+pw],[px+pw,py2,pz+pw],[px+pw,py1,pz+pw]);
    quad(GY,[px-pw,py1,pz-pw],[px-pw,py2,pz-pw],[px-pw,py2,pz+pw],[px-pw,py1,pz+pw]);
    quad(GY,[px+pw,py1,pz-pw],[px+pw,py1,pz+pw],[px+pw,py2,pz+pw],[px+pw,py2,pz-pw]);
  }

  // ══ FEUX DE POSITION (stockés pour le glow, pas rendus comme mesh) ══
  // Red=port(left), Green=starboard(right), White=tail
  M._navLights=[
    {lx:-22.0, ly:7.3, lz:2.9+0.26, color:'#ff2020', glow:'rgba(255,40,40,'},   // left wingtip
    {lx: 22.0, ly:7.3, lz:2.9+0.26, color:'#20ff40', glow:'rgba(40,255,60,'},    // right wingtip
    {lx:  0.0, ly:-16.0, lz:-0.42,   color:'#ffffff', glow:'rgba(255,255,255,'},  // tail
    {lx:  0.0, ly:-13.0, lz:7.42,    color:'#ff4040', glow:'rgba(255,80,60,'},    // top fin beacon
  ];

  // ══ PHARE ATTERRISSAGE (sous aile gauche) ══
  M._landingLight={lx:-6.0, ly:8.5, lz:-0.14};

  return M;
})();

function drawCessna(){
  if(camMode===0) return;

  // Vecteur caméra→avion (dans le repère local de l'avion, via la caméra)
  // Pour backface culling : on vérifie dot(normale_locale, vecteur_vue_local) < 0
  // vecteur vue = position_locale_caméra normalisée (inverse de la rotation de l'avion)
  // On inverse la rotation sur le vecteur cam→avion
  const cWx=pl.x-cam.cx, cWy=pl.y-cam.cy, cWz=pl.z-cam.cz;
  const magC=Math.sqrt(cWx*cWx+cWy*cWy+cWz*cWz)||1;
  // Dérotater pour obtenir le vecteur vue dans le repère local de l'avion
  // (rotation inverse = transposée)
  const yw=pl.yaw, pw=pl.pitch, rw=pl.roll;
  // Étape 1 : inverse yaw
  const cy=Math.cos(-yw), sy=Math.sin(-yw);
  let vx=cWx*cy-cWy*sy, vy=cWx*sy+cWy*cy, vz=cWz;
  // Étape 2 : inverse pitch
  const cp=Math.cos(-pw), sp=Math.sin(-pw);
  let vy2=vy*cp+vz*sp, vz2=-vy*sp+vz*cp; vy=vy2; vz=vz2;
  // Étape 3 : inverse roll
  const cr=Math.cos(-rw), sr=Math.sin(-rw);
  let vx2=vx*cr+vz*sr, vz3=-vx*sr+vz*cr; vx=vx2; vz=vz3;
  // vx,vy,vz = vecteur caméra dans repère avion (non normalisé)

  const rpm=pl.throttle;
  const PA=performance.now()*0.022*(0.2+rpm*0.8);
  const PR=4.2, PW=0.30, PY=21.3;

  // ── Tout dans UN SEUL tableau visible[], trié par profondeur ──
  // Hélice + disque + mesh → un seul painter's algorithm
  const visible=[];

  // Fonction utilitaire : ajouter des points locaux avion → visible[]
  function pushFace(col, pts, alpha){
    const ppts=[];
    let sumD=0;
    for(const p of pts){
      const pr=projP(...p);
      if(!pr) return;
      ppts.push(pr); sumD+=pr.d;
    }
    visible.push({col, ppts, d:sumD/pts.length, alpha});
  }

  // 1. Faces du mesh avion
  CESSNA_MESH.forEach(({col,v})=>{
    const ppts=[];
    let sumD=0;
    for(const p of v){
      const pr=projP(...p);
      if(!pr) return;
      ppts.push(pr); sumD+=pr.d;
    }
    if(ppts.length===v.length) visible.push({col,ppts,d:sumD/v.length});
  });

  // 2. Pales (moteur lent)
  if(rpm<0.65){
    function addBlade(angle){
      const ca=Math.cos(angle), sa=Math.sin(angle);
      const ax=ca, az=-sa, px=sa, pz=ca;
      const r0=0.45, r1=PR, wR=PW*1.3, wT=PW*0.4, ep=0.10;
      const A=[r0*ax-wR*px, PY+ep, r0*az-wR*pz];
      const B=[r0*ax+wR*px, PY+ep, r0*az+wR*pz];
      const C_=[r1*ax+wT*px, PY+ep, r1*az+wT*pz];
      const D=[r1*ax-wT*px, PY+ep, r1*az-wT*pz];
      const Ab=[A[0],PY-ep,A[2]], Bb=[B[0],PY-ep,B[2]];
      const Cb=[C_[0],PY-ep,C_[2]], Db=[D[0],PY-ep,D[2]];
      pushFace('#3c342a',[A,B,C_,D]);
      pushFace('#2a2420',[Ab,Db,Cb,Bb]);
      pushFace('#4a4038',[A,Ab,Bb,B]);
      pushFace('#332b22',[D,C_,Cb,Db]);
    }
    addBlade(PA); addBlade(PA+Math.PI);
  }

  // 3. Disque flou (moteur rapide) — triangles semi-transparents
  if(rpm>0.2){
    const a=Math.min(0.55,rpm*0.65);
    const N=20;
    for(let i=0;i<N;i++){
      const a0=i/N*Math.PI*2, a1=(i+1)/N*Math.PI*2;
      const pts1=[[0,PY,0],[Math.cos(a0)*PR,PY,Math.sin(a0)*PR],[Math.cos(a1)*PR,PY,Math.sin(a1)*PR]];
      const pts2=[[0,PY,0],[Math.cos(a0)*PR*.6,PY,Math.sin(a0)*PR*.6],[Math.cos(a1)*PR*.6,PY,Math.sin(a1)*PR*.6]];
      pushFace(`rgba(50,42,32,${a})`,   pts1);
      pushFace(`rgba(50,42,32,${a*.5})`,pts2);
    }
  }

  // 4. Moyeu/cône
  {
    const HW=0.44, NC=10;
    for(let i=0;i<NC;i++){
      const a0=i/NC*Math.PI*2, a1=(i+1)/NC*Math.PI*2;
      pushFace('#787068',[[0,PY+.7,0],[Math.cos(a0)*HW*.45,PY+.7,Math.sin(a0)*HW*.45],[Math.cos(a1)*HW*.45,PY+.7,Math.sin(a1)*HW*.45]]);
      pushFace('#8a8078',[[Math.cos(a0)*HW,PY,Math.sin(a0)*HW],[Math.cos(a1)*HW,PY,Math.sin(a1)*HW],[Math.cos(a1)*HW*.45,PY+.7,Math.sin(a1)*HW*.45],[Math.cos(a0)*HW*.45,PY+.7,Math.sin(a0)*HW*.45]]);
    }
  }

  // ── Tri unique back→front → painter's correct pour TOUT ──
  visible.sort((a,b)=>b.d-a.d);
  visible.forEach(({col,ppts,alpha})=>{
    if(alpha!==undefined) ctx.globalAlpha=alpha;
    ctx.beginPath();
    ctx.moveTo(ppts[0].sx,ppts[0].sy);
    for(let i=1;i<ppts.length;i++) ctx.lineTo(ppts[i].sx,ppts[i].sy);
    ctx.closePath();
    ctx.fillStyle=col; ctx.fill();
    if(alpha!==undefined) ctx.globalAlpha=1;
  });

  // ── NAVIGATION LIGHTS (glow effect) ──
  if(CESSNA_MESH._navLights){
    const T=performance.now()*0.001;
    const beacon=Math.sin(T*3.5)>0.3?1:0.15; // clignotement beacon
    CESSNA_MESH._navLights.forEach((nl,i)=>{
      const pr=projP(nl.lx, nl.ly, nl.lz);
      if(!pr) return;
      const intensity=(i===3)?beacon:1.0; // beacon clignote
      const sz=Math.max(2, 120/pr.d);
      // Halo externe
      const g1=ctx.createRadialGradient(pr.sx,pr.sy,0,pr.sx,pr.sy,sz*4);
      g1.addColorStop(0, nl.glow+(0.35*intensity)+')');
      g1.addColorStop(0.4, nl.glow+(0.12*intensity)+')');
      g1.addColorStop(1, nl.glow+'0)');
      ctx.fillStyle=g1;
      ctx.beginPath(); ctx.arc(pr.sx,pr.sy,sz*4,0,Math.PI*2); ctx.fill();
      // Point central brillant
      const g2=ctx.createRadialGradient(pr.sx,pr.sy,0,pr.sx,pr.sy,sz);
      g2.addColorStop(0, 'rgba(255,255,255,'+(0.95*intensity)+')');
      g2.addColorStop(0.5, nl.glow+(0.8*intensity)+')');
      g2.addColorStop(1, nl.glow+'0)');
      ctx.fillStyle=g2;
      ctx.beginPath(); ctx.arc(pr.sx,pr.sy,sz,0,Math.PI*2); ctx.fill();
    });
  }
}
