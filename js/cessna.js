// ══════════════════════════════════════════════════════════
// CESSNA.JS — Modele 3D Cessna 172 + surfaces animees
//
// Repere local : x=droite, y=avant(nez), z=haut
// NOUVEAU : ailerons, profondeur, direction, volets animes
// ══════════════════════════════════════════════════════════

function rotatePt(p, yaw, pitch, roll) {
  let [x, y, z] = p;
  const cr = Math.cos(roll), sr = Math.sin(roll);
  [x, z] = [x * cr - z * sr, x * sr + z * cr];
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  return [x * cy + y * sy, -x * sy + y * cy, z];
}

const PIVOT_Z = 4.12;
function projP(lx, ly, lz) {
  const [rx, ry, rz] = rotatePt([lx, ly, lz - PIVOT_Z], pl.yaw, pl.pitch, pl.roll);
  return project(pl.x + rx, pl.y + ry, pl.z + rz + PIVOT_Z);
}

// ══════════════════════════════════════════════════════════
// MESH STATIQUE (pre-calcule une seule fois)
// ══════════════════════════════════════════════════════════
const CESSNA_MESH = (() => {
  const M = [];
  function quad(col, a, b, c, d) {
    M.push({col, v: [a, b, c, d]});
  }
  function tri(col, a, b, c) {
    M.push({col, v: [a, b, c]});
  }

  // Couleurs
  const W  = '#f0ede2', W2 = '#dedad0', W3 = '#c4c0b5', W4 = '#b0aca0';
  const MT = '#6a6258', MT2 = '#48423c';
  const GL = '#96d2ea', GL2 = '#6eb8d2';
  const RD = '#c41818';
  const GY = '#888070', GK = '#48423a';
  const TY = '#181410', HB = '#888078';

  // ── Helpers geometrie ──
  function gBox(col, x1, y1, z1, x2, y2, z2, w) {
    quad(col, [x1-w,y1,z1-w],[x2-w,y2,z2-w],[x2+w,y2,z2-w],[x1+w,y1,z1-w]);
    quad(GK,  [x1-w,y1,z1+w],[x1+w,y1,z1+w],[x2+w,y2,z2+w],[x2-w,y2,z2+w]);
    quad(GK,  [x1-w,y1,z1-w],[x1-w,y1,z1+w],[x2-w,y2,z2+w],[x2-w,y2,z2-w]);
    quad(col, [x1+w,y1,z1-w],[x2+w,y2,z2-w],[x2+w,y2,z2+w],[x1+w,y1,z1+w]);
  }
  function gWheel(ct, ch, x, y, z, r, rw) {
    const N = 12, hr = r * .5;
    for (let i = 0; i < N; i++) {
      const a0 = i/N*Math.PI*2, a1 = (i+1)/N*Math.PI*2;
      const y0 = Math.cos(a0)*r, z0 = Math.sin(a0)*r;
      const y1 = Math.cos(a1)*r, z1 = Math.sin(a1)*r;
      quad(ct,[x-rw,y+y0,z+z0],[x+rw,y+y0,z+z0],[x+rw,y+y1,z+z1],[x-rw,y+y1,z+z1]);
      quad(ct,[x-rw,y+y1,z+z1],[x-rw,y+y0,z+z0],
              [x-rw,y+Math.cos(a0)*hr,z+Math.sin(a0)*hr],
              [x-rw,y+Math.cos(a1)*hr,z+Math.sin(a1)*hr]);
      quad(ct,[x+rw,y+y0,z+z0],[x+rw,y+y1,z+z1],
              [x+rw,y+Math.cos(a1)*hr,z+Math.sin(a1)*hr],
              [x+rw,y+Math.cos(a0)*hr,z+Math.sin(a0)*hr]);
      quad(ch,[x-rw,y+Math.cos(a0)*hr,z+Math.sin(a0)*hr],
              [x+rw,y+Math.cos(a0)*hr,z+Math.sin(a0)*hr],
              [x+rw,y+Math.cos(a1)*hr,z+Math.sin(a1)*hr],
              [x-rw,y+Math.cos(a1)*hr,z+Math.sin(a1)*hr]);
    }
  }

  // ═══════════════════════════════════════════════════════
  // CAPOT MOTEUR — y: 13.5 → 19.8
  // ═══════════════════════════════════════════════════════
  {
    const S = [
      [13.5,1.22,1.30,-2.05],
      [14.5,1.28,1.36,-2.08],
      [15.8,1.30,1.40,-2.10],
      [17.0,1.20,1.28,-2.08],
      [18.4,0.98,1.05,-2.05],
      [19.6,0.62,0.65,-2.02],
    ];
    const N = 12;
    for (let s = 0; s < S.length - 1; s++) {
      const [ya,rxa,rza,cza] = S[s], [yb,rxb,rzb,czb] = S[s+1];
      for (let i = 0; i < N; i++) {
        const a0 = i/N*Math.PI*2 - Math.PI/2;
        const a1 = (i+1)/N*Math.PI*2 - Math.PI/2;
        const A = [Math.cos(a0)*rxa, ya, cza+Math.sin(a0)*rza];
        const B = [Math.cos(a1)*rxa, ya, cza+Math.sin(a1)*rza];
        const C = [Math.cos(a1)*rxb, yb, czb+Math.sin(a1)*rzb];
        const D = [Math.cos(a0)*rxb, yb, czb+Math.sin(a0)*rzb];
        quad((i%2===0)?MT:MT2, A, B, C, D);
      }
    }
    const [yf,rxf,rzf,czf] = S[S.length-1];
    for (let i = 0; i < N; i++) {
      const a0 = i/N*Math.PI*2 - Math.PI/2;
      const a1 = (i+1)/N*Math.PI*2 - Math.PI/2;
      tri(MT2,[0,20.2,czf],
        [Math.cos(a0)*rxf,yf,czf+Math.sin(a0)*rzf],
        [Math.cos(a1)*rxf,yf,czf+Math.sin(a1)*rzf]);
    }
    quad('#282420',[-.55,19.2,-2.60],[.55,19.2,-2.60],[.50,18.0,-2.62],[-.50,18.0,-2.62]);
    gBox('#484040',1.10,15.5,-2.80,1.10,17.5,-2.85,0.08);
    gBox('#484040',1.10,15.5,-3.00,1.10,17.2,-3.05,0.08);
  }

  // ═══════════════════════════════════════════════════════
  // FUSELAGE — hexagonal 10 stations
  // ═══════════════════════════════════════════════════════
  const FS = [
    [13.5, 1.22, 2.30,-1.52, 0.35],
    [ 9.0, 1.58, 2.34,-1.54, 0.33],
    [ 5.0, 1.72, 2.35,-1.55, 0.32],
    [ 1.0, 1.72, 2.32,-1.53, 0.32],
    [-2.0, 1.68, 2.28,-1.50, 0.33],
    [-3.5, 1.02, 1.62,-1.20, 0.42],
    [-6.0, 0.82, 1.35,-1.00, 0.46],
    [-10.0,0.52, 0.92,-0.68, 0.55],
    [-13.5,0.28, 0.58,-0.48, 0.65],
    [-16.0,0.12, 0.42,-0.42, 0.70],
  ];
  function fsPts(f) {
    const [y,xm,zt,zb,so] = f;
    const zMid = (zt+zb)/2, zH = (zt-zb)/2;
    return [
      [0,     y, zt],
      [xm*0.7, y, zt-zH*0.28],
      [xm,    y, zMid+zH*so],
      [xm,    y, zMid-zH*so],
      [xm*0.7, y, zb+zH*0.22],
      [0,     y, zb],
    ];
  }
  function mirrorX(p) { return [-p[0],p[1],p[2]]; }

  function fusSegment(A, B, cTop, cSide, cBot) {
    const N2 = 6;
    for (let i = 0; i < N2-1; i++) {
      const col = i < 2 ? cTop : i < 4 ? cSide : cBot;
      quad(col, A[i],A[i+1],B[i+1],B[i]);
    }
    const AL = mirrorX(A[0]), BL = mirrorX(B[0]);
    quad(cTop, AL,A[0],B[0],BL);
    const A5L = mirrorX(A[5]), B5L = mirrorX(B[5]);
    quad(cBot, A5L,B5L,B[5],A[5]);
    for (let i = 0; i < N2-1; i++) {
      const col = i < 2 ? cTop : i < 4 ? cSide : cBot;
      quad(col, mirrorX(A[i+1]),mirrorX(A[i]),mirrorX(B[i]),mirrorX(B[i+1]));
    }
  }

  const pts = FS.map(fsPts);
  const colsPerSeg = [
    [W,W2,W3],[W,W2,W3],[W,W2,W3],[W,W2,W3],
    [W2,W3,W3],[W2,W3,W3],[W3,W3,W4],[W3,W3,W4],[W3,W3,W4]
  ];
  for (let i = 0; i < pts.length-1; i++) fusSegment(pts[i],pts[i+1],...colsPerSeg[i]);

  // Fermeture queue
  {
    const p = pts[pts.length-1], pL = p.map(mirrorX);
    for (let i = 0; i < p.length-1; i++) tri(W4,p[i+1],p[i],[0,-16.5,-0.42]);
    for (let i = 0; i < pL.length-1; i++) tri(W4,pL[i],pL[i+1],[0,-16.5,-0.42]);
  }
  // Face firewall
  {
    const p = pts[0], [y] = FS[0], pL = p.map(mirrorX);
    for (let i = 0; i < p.length-1; i++) tri(W2,p[i],p[i+1],[0,y,-0.10]);
    for (let i = 0; i < pL.length-1; i++) tri(W2,pL[i+1],pL[i],[0,y,-0.10]);
  }

  // ── Bandes rouges flancs ──
  {
    const e = 0.025;
    for (let i = 0; i < 4; i++) {
      const A = pts[i], B = pts[i+1];
      function stripe(t0,t1) {
        const zA0=A[2][2]*(1-t0)+A[3][2]*t0, zA1=A[2][2]*(1-t1)+A[3][2]*t1;
        const zB0=B[2][2]*(1-t0)+B[3][2]*t0, zB1=B[2][2]*(1-t1)+B[3][2]*t1;
        const xA=A[2][0]+e, xB=B[2][0]+e, yA=A[0][1], yB=B[0][1];
        quad(RD,[xA,yA,zA0],[xB,yB,zB0],[xB,yB,zB1],[xA,yA,zA1]);
        quad(RD,[-xA,yA,zA1],[-xB,yB,zB1],[-xB,yB,zB0],[-xA,yA,zA0]);
      }
      stripe(0.15,0.35);
      stripe(0.60,0.80);
    }
  }

  // ═══════════════════════════════════════════════════════
  // VITRES
  // ═══════════════════════════════════════════════════════
  {
    const vZ1=-0.10, vZ2=2.05, e=0.02;
    quad(GL, [-1.48,13.5,vZ1],[1.48,13.5,vZ1],[1.65,9.5,vZ2],[-1.65,9.5,vZ2]);
    quad(GL2,[1.70+e,9.5,vZ1],[1.70+e,9.5,vZ2],[1.68+e,-2.0,vZ2-0.05],[1.68+e,-2.0,vZ1+0.05]);
    quad(GL2,[-1.70-e,9.5,vZ1],[-1.68-e,-2.0,vZ1+0.05],[-1.68-e,-2.0,vZ2-0.05],[-1.70-e,9.5,vZ2]);
    quad(GL2,[1.68+e,-2.0,vZ1+0.15],[1.68+e,-2.0,vZ2-0.25],[0.88,-3.8,vZ2-0.80],[0.88,-3.8,vZ1+0.28]);
    quad(GL2,[-1.68-e,-2.0,vZ1+0.15],[-0.88,-3.8,vZ1+0.28],[-0.88,-3.8,vZ2-0.80],[-1.68-e,-2.0,vZ2-0.25]);
    quad(GL, [-1.70,9.5,vZ2+0.12],[1.70,9.5,vZ2+0.12],[1.68,-2.0,vZ2+0.05],[-1.68,-2.0,vZ2+0.05]);
  }

  // ═══════════════════════════════════════════════════════
  // AILES HIGH-WING — partie FIXE uniquement
  // (ailerons et volets sont dessines dynamiquement)
  //
  // Chaque station : [x, y_leading, y_trailing, z_top, z_bot, dz_diedre]
  // On dessine le bord d'attaque jusqu'a ~65% de la corde
  // Le bord de fuite (35% arriere) est anime
  // ═══════════════════════════════════════════════════════
  function wing(s) {
    const WP = [
      [s*1.72,  9.5, 1.5,  0.18,-0.14, 0.00],
      [s*4.0,   9.2, 1.7,  0.19,-0.13, 0.03],
      [s*7.5,   8.8, 1.9,  0.20,-0.12, 0.07],
      [s*11.0,  8.4, 2.1,  0.21,-0.11, 0.11],
      [s*15.0,  7.9, 2.4,  0.23,-0.09, 0.16],
      [s*19.0,  7.5, 2.7,  0.24,-0.08, 0.22],
      [s*22.0,  7.3, 2.9,  0.25,-0.07, 0.26],
    ];

    for (let i = 0; i < WP.length - 1; i++) {
      const [xa,yaa,yab,zta,zba,dza] = WP[i];
      const [xb,yba,ybb,ztb,zbb,dzb] = WP[i+1];

      // Hinge Y = 65% chord from leading edge
      const cA = yaa - yab, cB = yba - ybb;
      const yhA = yaa - cA * 0.65, yhB = yba - cB * 0.65;

      // Partie fixe (bord d'attaque → charniere)
      // Dessus
      quad(W, [xa,yab,zta+dza],[xa,yaa,zta+dza],[xb,yba,ztb+dzb],[xb,ybb,ztb+dzb]);
      // Dessous
      quad(W3,[xa,yab,zba+dza],[xb,ybb,zbb+dzb],[xb,yba,zbb+dzb],[xa,yaa,zba+dza]);
      // Bord d'attaque (face avant)
      quad(W, [xa,yaa,(zta+zba)/2+dza],[xb,yba,(ztb+zbb)/2+dzb],[xb,yba,ztb+dzb],[xa,yaa,zta+dza]);
      quad(W2,[xa,yaa,zba+dza],[xa,yaa,(zta+zba)/2+dza],[xb,yba,(ztb+zbb)/2+dzb],[xb,yba,zbb+dzb]);
      // Intrados
      quad(W2,[xa,yab,zta+dza],[xb,ybb,ztb+dzb],[xb,ybb,zbb+dzb],[xa,yab,zba+dza]);
    }

    // Sauterelle
    const [xs,ysa,ysb,zts,zbs,dzs] = WP[WP.length-1];
    quad(W2,[xs,ysa,zbs+dzs],[xs,ysb,zbs+dzs],[xs,ysb,zts+dzs],[xs,ysa,zts+dzs]);
    // Feux de bout d'aile
    quad(s>0?'#d42020':'#20a030',
      [xs+s*.02,ysa,zbs+dzs],[xs+s*.02,ysb,zbs+dzs],
      [xs+s*.02,ysb,zts+dzs],[xs+s*.02,ysa,zts+dzs]);
  }
  wing(+1); wing(-1);

  // ── STRUTS ──
  function struts(s) {
    const w = 0.09;
    function st(wx,wy,wz,fx,fy,fz) {
      quad(GY,[wx-w,wy,wz],[wx+w,wy,wz],[fx+w,fy,fz],[fx-w,fy,fz]);
      quad(GK,[wx-w,wy,wz+.04],[fx-w,fy,fz+.04],[fx+w,fy,fz+.04],[wx+w,wy,wz+.04]);
      quad(GY,[wx,wy,wz-w],[fx,fy,fz-w],[fx,fy,fz+w],[wx,wy,wz+w]);
    }
    st(s*9.0,7.5,-0.14,  s*2.5,7.2,-1.55);
    st(s*6.5,3.2,-0.14,  s*1.8,3.5,-1.55);
    quad(GY,[s*6.5,3.2,-0.18],[s*9.0,7.5,-0.18],[s*9.0,7.5,-0.10],[s*6.5,3.2,-0.10]);
  }
  struts(+1); struts(-1);

  // ═══════════════════════════════════════════════════════
  // EMPENNAGE HORIZONTAL — partie FIXE (sans profondeur)
  // ═══════════════════════════════════════════════════════
  function stab(s) {
    const E = [
      [s*0.30,-10.0,-13.5,-0.40,-0.52, 0.00],
      [s*2.2, -10.2,-13.6,-0.39,-0.51, 0.02],
      [s*4.8, -10.5,-13.9,-0.38,-0.50, 0.06],
      [s*7.5, -10.9,-14.2,-0.42,-0.54, 0.10],
    ];
    for (let i = 0; i < E.length - 1; i++) {
      const [xa,yaa,yab,zta,zba,dza] = E[i];
      const [xb,yba,ybb,ztb,zbb,dzb] = E[i+1];
      // Plan fixe complet (la profondeur animee est dessinee par-dessus)
      quad(W, [xa,yab,zta+dza],[xa,yaa,zta+dza],[xb,yba,ztb+dzb],[xb,ybb,ztb+dzb]);
      quad(W3,[xa,yab,zba+dza],[xb,ybb,zbb+dzb],[xb,yba,zbb+dzb],[xa,yaa,zba+dza]);
      quad(W2,[xa,yaa,zba+dza],[xb,yba,zbb+dzb],[xb,yba,ztb+dzb],[xa,yaa,zta+dza]);
      quad(W3,[xa,yab,zta+dza],[xb,ybb,ztb+dzb],[xb,ybb,zbb+dzb],[xa,yab,zba+dza]);
    }
    const [xs,ysa,ysb,zts,zbs,dzs] = E[E.length-1];
    quad(W2,[xs,ysa,zbs+dzs],[xs,ysb,zbs+dzs],[xs,ysb,zts+dzs],[xs,ysa,zts+dzs]);
  }
  stab(+1); stab(-1);

  // ═══════════════════════════════════════════════════════
  // DERIVE VERTICALE — partie FIXE (sans gouverne)
  // ═══════════════════════════════════════════════════════
  {
    const fw = 0.23;
    const F = [
      [-10.0,-15.0,-0.82],
      [-10.2,-15.6, 0.65],
      [-10.6,-15.9, 2.55],
      [-11.5,-15.8, 4.85],
      [-12.3,-15.0, 6.60],
      [-13.0,-13.8, 7.42],
      [-13.3,-12.4, 7.20],
    ];
    for (let i = 0; i < F.length-1; i++) {
      const [ya0,yb0,z0]=F[i],[ya1,yb1,z1]=F[i+1];
      quad(W, [fw,ya0,z0],[fw,ya1,z1],[-fw,ya1,z1],[-fw,ya0,z0]);
      quad(W2,[-fw,ya0,z0],[-fw,ya1,z1],[fw,ya1,z1],[fw,ya0,z0]);
    }
    tri(W,[fw,F[6][0],F[6][2]],[-fw,F[6][0],F[6][2]],[0,F[6][0]-0.5,F[6][2]-0.4]);
    // Bandes rouges
    for (let i = 2; i < F.length-1; i++) {
      const [ya0,,z0]=F[i],[ya1,,z1]=F[i+1];
      const za=z0*0.20+0.55, zb=z0*0.52, zc=z1*0.20+0.55, zd=z1*0.52;
      if (zb>za+0.10) quad(RD,[fw+.02,ya0,za],[fw+.02,ya1,zc],[fw+.02,ya1,zd],[fw+.02,ya0,zb]);
    }
    tri('#ff4040',[fw*.6,F[5][0],F[5][2]+.05],[-fw*.6,F[5][0],F[5][2]+.05],[0,F[5][0]+.35,F[5][2]+.05]);
  }

  // ═══════════════════════════════════════════════════════
  // TRAIN D'ATTERRISSAGE
  // ═══════════════════════════════════════════════════════
  gBox(GY, 0,16.5,-1.52, 0,16.5,-2.70,0.13);
  gBox(GY,-0.28,16.5,-2.58,-0.28,16.5,-3.25,0.07);
  gBox(GY, 0.28,16.5,-2.58, 0.28,16.5,-3.25,0.07);
  gWheel(TY,HB, 0,16.5,-3.58, 0.45,0.16);
  gBox(GY,-1.72,4.2,-1.60,-3.45,4.0,-2.82,0.16);
  gWheel(TY,HB,-3.45,4.0,-3.28, 0.76,0.25);
  gBox(GY, 1.72,4.2,-1.60, 3.45,4.0,-2.82,0.16);
  gWheel(TY,HB, 3.45,4.0,-3.28, 0.76,0.25);

  // Carenages roues
  function pant(s) {
    const x1=s*2.50,x2=s*4.20,yF=5.8,yR=2.2,zT=-1.60,zB=-4.12;
    quad(W2,[x1,yF,zT],[x2,yF,zT],[x2,yR,zT],[x1,yR,zT]);
    quad(GY,[x1,yF,zB],[x1,yR,zB],[x2,yR,zB],[x2,yF,zB]);
    tri(W2,[x1,yF,zT],[x2,yF,zT],[x1,yF,zB]);
    tri(W2,[x2,yF,zT],[x2,yF,zB],[x1,yF,zB]);
    tri(W3,[x1,yR,zT],[x1,yR,zB],[x2,yR,zT]);
    tri(W3,[x1,yR,zB],[x2,yR,zB],[x2,yR,zT]);
    quad(W2,[x1,yF,zT],[x1,yR,zT],[x2,yR,zT],[x2,yF,zT]);
    quad(GY,[x1,yF,zB],[x2,yF,zB],[x2,yR,zB],[x1,yR,zB]);
  }
  pant(+1); pant(-1);

  // ── Antennes & pitot ──
  {
    const aw = 0.04;
    quad(GY,[aw,-4.0,2.30],[-aw,-4.0,2.30],[-aw,-5.5,2.28],[aw,-5.5,2.28]);
    tri(GY,[aw,-4.0,2.30],[-aw,-4.0,2.30],[0,-4.2,4.20]);
    tri(GY,[-aw,-5.5,2.28],[aw,-5.5,2.28],[0,-4.2,4.20]);
    quad(GY,[aw,-4.0,2.30],[aw,-5.5,2.28],[0,-4.2,4.20],[0,-4.2,4.20]);
    quad(GY,[-aw,-4.0,2.30],[0,-4.2,4.20],[0,-4.2,4.20],[-aw,-5.5,2.28]);
  }
  {
    const aw = 0.03;
    tri(GY,[aw,-6.0,-1.50],[-aw,-6.0,-1.50],[0,-6.5,-2.40]);
    tri(GY,[-aw,-7.0,-1.48],[aw,-7.0,-1.48],[0,-6.5,-2.40]);
    quad(GY,[aw,-6.0,-1.50],[0,-6.5,-2.40],[0,-6.5,-2.40],[aw,-7.0,-1.48]);
    quad(GY,[-aw,-6.0,-1.50],[-aw,-7.0,-1.48],[0,-6.5,-2.40],[0,-6.5,-2.40]);
  }
  {
    const pw=0.035, py1=10.8, py2=13.5, pz=0.18, px=-8.0;
    quad(GY,[px-pw,py1,pz-pw],[px+pw,py1,pz-pw],[px+pw,py2,pz-pw],[px-pw,py2,pz-pw]);
    quad(GY,[px-pw,py1,pz+pw],[px-pw,py2,pz+pw],[px+pw,py2,pz+pw],[px+pw,py1,pz+pw]);
    quad(GY,[px-pw,py1,pz-pw],[px-pw,py2,pz-pw],[px-pw,py2,pz+pw],[px-pw,py1,pz+pw]);
    quad(GY,[px+pw,py1,pz-pw],[px+pw,py1,pz+pw],[px+pw,py2,pz+pw],[px+pw,py2,pz-pw]);
  }

  // ── Feux de navigation (donnees pour le glow) ──
  M._navLights = [
    {lx:-22.0, ly:7.3, lz:2.9+0.26, color:'#ff2020', glow:'rgba(255,40,40,'},
    {lx: 22.0, ly:7.3, lz:2.9+0.26, color:'#20ff40', glow:'rgba(40,255,60,'},
    {lx:  0.0, ly:-16.0, lz:-0.42,  color:'#ffffff', glow:'rgba(255,255,255,'},
    {lx:  0.0, ly:-13.0, lz:7.42,   color:'#ff4040', glow:'rgba(255,80,60,'},
  ];
  M._landingLight = {lx:-6.0, ly:8.5, lz:-0.14};

  return M;
})();


// ══════════════════════════════════════════════════════════
// SURFACES DE CONTROLE ANIMEES
//
// Chaque surface est un panneau plat qui pivote autour
// d'une charniere. La deflexion est lue depuis pl.elevator,
// pl.aileron, pl.rudder et flaps.
// ══════════════════════════════════════════════════════════

// Projette et ajoute une face au tableau visible[]
function pushAnimFace(visible, col, pts) {
  const ppts = [];
  let sumD = 0;
  for (const p of pts) {
    const pr = projP(p[0], p[1], p[2]);
    if (!pr) return;
    ppts.push(pr); sumD += pr.d;
  }
  visible.push({col, ppts, d: sumD / pts.length});
}

// ── AILERONS ────────────────────────────────────────────
// Stations de bord de fuite de l'aile (35% arriere de la corde)
// Les ailerons occupent les stations 3-6 (mi-aile → bout)
function addAilerons(visible) {
  // Deflexion differentielle : un monte, l'autre descend
  const deflR = -pl.aileron * 0.35;  // droite (oppose)
  const deflL =  pl.aileron * 0.35;  // gauche
  addAileronSide(visible, +1, deflR);
  addAileronSide(visible, -1, deflL);
}

function addAileronSide(visible, side, defl) {
  // Stations d'aileron [x, y_hinge, y_trail, z_mid, thickness]
  // Correspondent aux stations 3-6 de l'aile
  const S = [
    {x: side*11.0, yH: 5.5, yT: 2.1, z: 0.05+0.11, t: 0.14},
    {x: side*15.0, yH: 5.2, yT: 2.4, z: 0.07+0.16, t: 0.12},
    {x: side*19.0, yH: 5.0, yT: 2.7, z: 0.08+0.22, t: 0.10},
    {x: side*22.0, yH: 4.9, yT: 2.9, z: 0.09+0.26, t: 0.08},
  ];
  const cosD = Math.cos(defl), sinD = Math.sin(defl);

  for (let i = 0; i < S.length-1; i++) {
    const a = S[i], b = S[i+1];
    // Trailing edge apres rotation autour de la charniere
    const dyA = a.yT - a.yH, dyB = b.yT - b.yH;
    const yTA = a.yH + dyA * cosD;
    const zTA = a.z + dyA * sinD;
    const yTB = b.yH + dyB * cosD;
    const zTB = b.z + dyB * sinD;

    // Dessus aileron
    pushAnimFace(visible, '#e8e5da', [
      [a.x, a.yH, a.z + a.t/2],
      [b.x, b.yH, b.z + b.t/2],
      [b.x, yTB, zTB + b.t/2],
      [a.x, yTA, zTA + a.t/2]
    ]);
    // Dessous aileron
    pushAnimFace(visible, '#c4c0b5', [
      [a.x, yTA, zTA - a.t/2],
      [b.x, yTB, zTB - b.t/2],
      [b.x, b.yH, b.z - b.t/2],
      [a.x, a.yH, a.z - a.t/2]
    ]);
    // Bord de fuite (tranche)
    pushAnimFace(visible, '#b0aca0', [
      [a.x, yTA, zTA - a.t/2],
      [a.x, yTA, zTA + a.t/2],
      [b.x, yTB, zTB + b.t/2],
      [b.x, yTB, zTB - b.t/2]
    ]);
  }
}

// ── VOLETS ──────────────────────────────────────────────
// Stations 0-3 de l'aile (interieur), deflexion vers le bas
function addFlaps(visible) {
  if (flaps === 0) return;
  const defl = flaps * 0.22;  // ~0, 12, 25, 48 deg
  addFlapSide(visible, +1, defl);
  addFlapSide(visible, -1, defl);
}

function addFlapSide(visible, side, defl) {
  const S = [
    {x: side*1.72, yH: 5.8, yT: 1.5, z: 0.02+0.00, t: 0.14},
    {x: side*4.0,  yH: 5.6, yT: 1.7, z: 0.03+0.03, t: 0.13},
    {x: side*7.5,  yH: 5.4, yT: 1.9, z: 0.04+0.07, t: 0.12},
    {x: side*11.0, yH: 5.5, yT: 2.1, z: 0.05+0.11, t: 0.12},
  ];
  const cosD = Math.cos(defl), sinD = Math.sin(defl);

  for (let i = 0; i < S.length-1; i++) {
    const a = S[i], b = S[i+1];
    const dyA = a.yT - a.yH, dyB = b.yT - b.yH;
    const yTA = a.yH + dyA * cosD, zTA = a.z + dyA * sinD;
    const yTB = b.yH + dyB * cosD, zTB = b.z + dyB * sinD;

    pushAnimFace(visible, '#e0ddd0', [
      [a.x, a.yH, a.z + a.t/2],
      [b.x, b.yH, b.z + b.t/2],
      [b.x, yTB, zTB + b.t/2],
      [a.x, yTA, zTA + a.t/2]
    ]);
    pushAnimFace(visible, '#b8b4a8', [
      [a.x, yTA, zTA - a.t/2],
      [b.x, yTB, zTB - b.t/2],
      [b.x, b.yH, b.z - b.t/2],
      [a.x, a.yH, a.z - a.t/2]
    ]);
  }
}

// ── PROFONDEUR (ELEVATOR) ───────────────────────────────
// Bord de fuite du plan horizontal, pivote autour d'une charniere
function addElevator(visible) {
  const defl = -pl.elevator * 0.30;  // negatif = trailing edge monte (cabre)
  addElevatorSide(visible, +1, defl);
  addElevatorSide(visible, -1, defl);
}

function addElevatorSide(visible, side, defl) {
  // Stations de la profondeur [x, y_hinge, y_trail, z, thick]
  const S = [
    {x: side*0.30, yH: -13.2, yT: -14.8, z: -0.46, t: 0.10},
    {x: side*2.2,  yH: -13.3, yT: -14.9, z: -0.44, t: 0.09},
    {x: side*4.8,  yH: -13.6, yT: -15.2, z: -0.38, t: 0.08},
    {x: side*7.5,  yH: -13.9, yT: -15.5, z: -0.36, t: 0.06},
  ];
  const cosD = Math.cos(defl), sinD = Math.sin(defl);

  for (let i = 0; i < S.length-1; i++) {
    const a = S[i], b = S[i+1];
    const dyA = a.yT - a.yH, dyB = b.yT - b.yH;
    const yTA = a.yH + dyA * cosD, zTA = a.z + dyA * sinD;
    const yTB = b.yH + dyB * cosD, zTB = b.z + dyB * sinD;

    // Dessus
    pushAnimFace(visible, '#e8e5da', [
      [a.x, a.yH, a.z + a.t],
      [b.x, b.yH, b.z + b.t],
      [b.x, yTB, zTB + b.t * 0.3],
      [a.x, yTA, zTA + a.t * 0.3]
    ]);
    // Dessous
    pushAnimFace(visible, '#c0bcb0', [
      [a.x, yTA, zTA - a.t * 0.3],
      [b.x, yTB, zTB - b.t * 0.3],
      [b.x, b.yH, b.z - b.t],
      [a.x, a.yH, a.z - a.t]
    ]);
  }
}

// ── GOUVERNE DE DIRECTION (RUDDER) ──────────────────────
// Bord de fuite de la derive, pivote en lacet (dans le plan XY)
function addRudder(visible) {
  const defl = pl.rudder * 0.35;  // positif = bord de fuite va a gauche

  // Stations de la gouverne [y_hinge, y_trail, z_bas, z_haut]
  // La charniere est a ~60% de la corde de la derive
  const S = [
    {yH: -14.8, yT: -16.2, z0: 0.65, z1: 2.55},
    {yH: -14.6, yT: -16.0, z0: 2.55, z1: 4.85},
    {yH: -14.0, yT: -15.5, z0: 4.85, z1: 6.60},
    {yH: -13.2, yT: -14.5, z0: 6.60, z1: 7.42},
  ];

  const fw = 0.24;  // demi-epaisseur
  const cosD = Math.cos(defl), sinD = Math.sin(defl);

  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    const dyH = s.yT - s.yH;
    // Trailing edge apres rotation dans le plan XY
    const yTE = s.yH + dyH * cosD;
    const xTE = dyH * sinD;  // deviation laterale

    // Panneau de gouverne (cote droit)
    pushAnimFace(visible, '#e8e5da', [
      [fw, s.yH, s.z0],
      [fw, s.yH, s.z1],
      [fw + xTE, yTE, s.z1],
      [fw + xTE, yTE, s.z0]
    ]);
    // Cote gauche
    pushAnimFace(visible, '#dedad0', [
      [-fw, s.yH, s.z1],
      [-fw, s.yH, s.z0],
      [-fw + xTE, yTE, s.z0],
      [-fw + xTE, yTE, s.z1]
    ]);
  }
}

// ══════════════════════════════════════════════════════════
// HELICE & MOYEU (dynamique car animation)
// ══════════════════════════════════════════════════════════
function addPropeller(visible) {
  const rpm = pl.throttle;
  const PA = performance.now() * 0.022 * (0.2 + rpm * 0.8);
  const PR = 4.2, PW = 0.30, PY = 21.3;

  // Pales (moteur lent)
  if (rpm < 0.65) {
    function addBlade(angle) {
      const ca = Math.cos(angle), sa = Math.sin(angle);
      const ax = ca, az = -sa, px = sa, pz = ca;
      const r0 = 0.45, r1 = PR, wR = PW*1.3, wT = PW*0.4, ep = 0.10;
      const A = [r0*ax-wR*px, PY+ep, r0*az-wR*pz];
      const B = [r0*ax+wR*px, PY+ep, r0*az+wR*pz];
      const C = [r1*ax+wT*px, PY+ep, r1*az+wT*pz];
      const D = [r1*ax-wT*px, PY+ep, r1*az-wT*pz];
      const Ab=[A[0],PY-ep,A[2]], Bb=[B[0],PY-ep,B[2]];
      const Cb=[C[0],PY-ep,C[2]], Db=[D[0],PY-ep,D[2]];
      pushAnimFace(visible,'#3c342a',[A,B,C,D]);
      pushAnimFace(visible,'#2a2420',[Ab,Db,Cb,Bb]);
      pushAnimFace(visible,'#4a4038',[A,Ab,Bb,B]);
      pushAnimFace(visible,'#332b22',[D,C,Cb,Db]);
    }
    addBlade(PA); addBlade(PA + Math.PI);
  }

  // Disque flou (moteur rapide)
  if (rpm > 0.2) {
    const a = Math.min(0.55, rpm * 0.65);
    const N = 20;
    for (let i = 0; i < N; i++) {
      const a0 = i/N*Math.PI*2, a1 = (i+1)/N*Math.PI*2;
      pushAnimFace(visible, `rgba(50,42,32,${a})`, [
        [0,PY,0],
        [Math.cos(a0)*PR,PY,Math.sin(a0)*PR],
        [Math.cos(a1)*PR,PY,Math.sin(a1)*PR]
      ]);
      pushAnimFace(visible, `rgba(50,42,32,${a*.5})`, [
        [0,PY,0],
        [Math.cos(a0)*PR*.6,PY,Math.sin(a0)*PR*.6],
        [Math.cos(a1)*PR*.6,PY,Math.sin(a1)*PR*.6]
      ]);
    }
  }

  // Moyeu/cone
  {
    const HW = 0.44, NC = 10;
    for (let i = 0; i < NC; i++) {
      const a0 = i/NC*Math.PI*2, a1 = (i+1)/NC*Math.PI*2;
      pushAnimFace(visible, '#787068', [
        [0,PY+.7,0],
        [Math.cos(a0)*HW*.45,PY+.7,Math.sin(a0)*HW*.45],
        [Math.cos(a1)*HW*.45,PY+.7,Math.sin(a1)*HW*.45]
      ]);
      pushAnimFace(visible, '#8a8078', [
        [Math.cos(a0)*HW,PY,Math.sin(a0)*HW],
        [Math.cos(a1)*HW,PY,Math.sin(a1)*HW],
        [Math.cos(a1)*HW*.45,PY+.7,Math.sin(a1)*HW*.45],
        [Math.cos(a0)*HW*.45,PY+.7,Math.sin(a0)*HW*.45]
      ]);
    }
  }
}


// ══════════════════════════════════════════════════════════
// RENDU PRINCIPAL
// ══════════════════════════════════════════════════════════
function drawCessna() {
  if (camMode === 0) return;

  const visible = [];

  // 1. Mesh statique
  CESSNA_MESH.forEach(({col, v}) => {
    const ppts = [];
    let sumD = 0;
    for (const p of v) {
      const pr = projP(p[0], p[1], p[2]);
      if (!pr) return;
      ppts.push(pr); sumD += pr.d;
    }
    if (ppts.length === v.length)
      visible.push({col, ppts, d: sumD / v.length});
  });

  // 2. Surfaces de controle animees
  addAilerons(visible);
  addFlaps(visible);
  addElevator(visible);
  addRudder(visible);

  // 3. Helice
  addPropeller(visible);

  // 4. Tri back→front (painter's algorithm)
  visible.sort((a, b) => b.d - a.d);
  visible.forEach(({col, ppts, alpha}) => {
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(ppts[0].sx, ppts[0].sy);
    for (let i = 1; i < ppts.length; i++) ctx.lineTo(ppts[i].sx, ppts[i].sy);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    if (alpha !== undefined) ctx.globalAlpha = 1;
  });

  // 5. Feux de navigation (glow)
  if (CESSNA_MESH._navLights) {
    const T = performance.now() * 0.001;
    const beacon = Math.sin(T * 3.5) > 0.3 ? 1 : 0.15;
    CESSNA_MESH._navLights.forEach((nl, i) => {
      const pr = projP(nl.lx, nl.ly, nl.lz);
      if (!pr) return;
      const intensity = (i === 3) ? beacon : 1.0;
      const sz = Math.max(2, 120 / pr.d);
      const g1 = ctx.createRadialGradient(pr.sx,pr.sy,0,pr.sx,pr.sy,sz*4);
      g1.addColorStop(0, nl.glow + (0.35*intensity) + ')');
      g1.addColorStop(0.4, nl.glow + (0.12*intensity) + ')');
      g1.addColorStop(1, nl.glow + '0)');
      ctx.fillStyle = g1;
      ctx.beginPath(); ctx.arc(pr.sx,pr.sy,sz*4,0,Math.PI*2); ctx.fill();
      const g2 = ctx.createRadialGradient(pr.sx,pr.sy,0,pr.sx,pr.sy,sz);
      g2.addColorStop(0, 'rgba(255,255,255,' + (0.95*intensity) + ')');
      g2.addColorStop(0.5, nl.glow + (0.8*intensity) + ')');
      g2.addColorStop(1, nl.glow + '0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(pr.sx,pr.sy,sz,0,Math.PI*2); ctx.fill();
    });
  }
}
