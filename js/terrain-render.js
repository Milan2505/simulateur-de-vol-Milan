// ══════════════════════════════════════════════════════════
// TERRAIN-RENDER.JS — Rendu terrain (LOD rings) + drawTriangle
// ══════════════════════════════════════════════════════════

function drawTerrain(T) {
  const FAR = 22000;
  const RINGS = [
    { step: 800, nH: 18, maxD: FAR },
    { step: 160, nH: 16, maxD: 7000 },
    { step: 32, nH: 16, maxD: 1400 },
    { step: 8, nH: 20, maxD: 300 },
  ];

  const fX = Math.sin(cam.cyaw), fY = Math.cos(cam.cyaw);

  // Contour de meme couleur sur chaque triangle → supprime les fissures
  // sous-pixel entre tuiles adjacentes (aspect "craquele")
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1;

  for (let ri = 0; ri < RINGS.length; ri++) {
    const { step, nH, maxD } = RINGS[ri];
    const maxD2 = maxD * maxD;
    const ox = Math.round(pl.x / step) * step;
    const oy = Math.round(pl.y / step) * step;

    const r0 = fY >= 0 ? nH - 1 : -nH, r1 = fY >= 0 ? -nH - 1 : nH, rs = fY >= 0 ? -1 : 1;
    const c0 = fX >= 0 ? nH - 1 : -nH, c1 = fX >= 0 ? -nH - 1 : nH, cs = fX >= 0 ? -1 : 1;

    for (let r = r0; r !== r1; r += rs) {
      for (let c = c0; c !== c1; c += cs) {
        const wx0 = ox + c * step, wy0 = oy + r * step;
        const wx1 = wx0 + step, wy1 = wy0 + step;
        const cdx = wx0 + step * .5 - pl.x, cdy = wy0 + step * .5 - pl.y;
        const d2 = cdx * cdx + cdy * cdy;
        if (d2 > maxD2) continue;
        if (cdx * fX + cdy * fY < -step * 5) continue;

        const A = { wx: wx0, wy: wy0, wz: terrainH(wx0, wy0) };
        const B = { wx: wx1, wy: wy0, wz: terrainH(wx1, wy0) };
        const C = { wx: wx1, wy: wy1, wz: terrainH(wx1, wy1) };
        const D = { wx: wx0, wy: wy1, wz: terrainH(wx0, wy1) };

        // Tuile eau
        if (A.wz < 1 && B.wz < 1 && C.wz < 1 && D.wz < 1) {
          const fog = Math.pow(Math.min(1, Math.sqrt(d2) / FAR), .5);
          // Couleur par profondeur : bleu nuit au large → turquoise près des côtes
          const avgRaw = (A.wz + B.wz + C.wz + D.wz) * 0.25;
          const sh = clamp(1 + avgRaw / 55, 0, 1);   // 1 = haut-fond, 0 = grand fond
          let dr = lerp(16, 46, sh), dg = lerp(48, 120, sh), db = lerp(102, 150, sh);
          // Houle légère (scintillement) — calme au loin pour éviter le bruit d'horizon
          const mx = wx0 + step * .5, my = wy0 + step * .5;
          const shimmer = (Math.sin(mx * 0.021 + my * 0.017 + T * 0.8) +
                           Math.sin(mx * 0.053 - my * 0.041 + T * 1.3) * 0.6) * 4 * (1 - fog);
          dr += shimmer; dg += shimmer; db += shimmer * 1.2;
          let wr = dr * (1 - fog) + FOG_R * fog;
          let wg = dg * (1 - fog) + FOG_G * fog;
          let wb = db * (1 - fog) + FOG_B * fog;
          // Reflet du soleil (glitter) — normale de l'eau = (0,0,1)
          if (fog < 0.85) {
            const vx = cam.cx - mx, vy = cam.cy - my, vz = cam.cz;
            const vl = Math.sqrt(vx*vx + vy*vy + vz*vz) || 1;
            const hx = SD.x + vx/vl, hy = SD.y + vy/vl, hz = SD.z + vz/vl;
            const hl = Math.sqrt(hx*hx + hy*hy + hz*hz) || 1;
            const base = Math.max(0, hz/hl);
            // glitter étroit + voile solaire large → mer vivante sans clignoter
            const spec = (Math.pow(base, 38) * 100 + Math.pow(base, 6) * 14) * (1 - fog);
            wr = Math.min(255, wr + spec * .95); wg = Math.min(255, wg + spec * .97); wb = Math.min(255, wb + spec);
          }
          const wcol = `rgb(${wr|0},${wg|0},${wb|0})`;
          const pA = project(wx0, wy0, 0), pB = project(wx1, wy0, 0);
          const pC = project(wx1, wy1, 0), pD = project(wx0, wy1, 0);
          ctx.fillStyle = wcol; ctx.strokeStyle = wcol;
          if (pA && pB && pD) {
            ctx.beginPath();
            ctx.moveTo(pA.sx, pA.sy); ctx.lineTo(pB.sx, pB.sy);
            ctx.lineTo(pD.sx, pD.sy); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
          if (pB && pC && pD) {
            ctx.beginPath();
            ctx.moveTo(pB.sx, pB.sy); ctx.lineTo(pC.sx, pC.sy);
            ctx.lineTo(pD.sx, pD.sy); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
          continue;
        }

        A.pr = project(A.wx, A.wy, A.wz);
        B.pr = project(B.wx, B.wy, B.wz);
        C.pr = project(C.wx, C.wy, C.wz);
        D.pr = project(D.wx, D.wy, D.wz);
        drawTriangle(A, B, D, T, FAR);
        drawTriangle(B, C, D, T, FAR);
      }
    }
  }
}

function drawTriangle(A, B, C, T, FAR) {
  if ((A.wz < 1) && (B.wz < 1) && (C.wz < 1)) return;
  if (!isFinite(A.wz) || !isFinite(B.wz) || !isFinite(C.wz)) return;

  const awx = A.wx, awy = A.wy, awz = A.wz < 1 ? 0 : A.wz;
  const bwx = B.wx, bwy = B.wy, bwz = B.wz < 1 ? 0 : B.wz;
  const cwx = C.wx, cwy = C.wy, cwz = C.wz < 1 ? 0 : C.wz;
  let pA = A.wz < 1 ? project(A.wx, A.wy, 0) : A.pr;
  let pB = B.wz < 1 ? project(B.wx, B.wy, 0) : B.pr;
  let pC = C.wz < 1 ? project(C.wx, C.wy, 0) : C.pr;
  const nA = !pA, nB = !pB, nC = !pC, nn = nA + nB + nC;
  if (nn === 3) return;
  if (nn === 1) {
    if (nA) { pA = clipEdge(awx, awy, awz, bwx, bwy, bwz) || clipEdge(awx, awy, awz, cwx, cwy, cwz); }
    if (nB) { pB = clipEdge(bwx, bwy, bwz, awx, awy, awz) || clipEdge(bwx, bwy, bwz, cwx, cwy, cwz); }
    if (nC) { pC = clipEdge(cwx, cwy, cwz, awx, awy, awz) || clipEdge(cwx, cwy, cwz, bwx, bwy, bwz); }
  } else if (nn === 2) {
    if (!nA) { if (nB) pB = clipEdge(bwx, bwy, bwz, awx, awy, awz); if (nC) pC = clipEdge(cwx, cwy, cwz, awx, awy, awz); }
    if (!nB) { if (nA) pA = clipEdge(awx, awy, awz, bwx, bwy, bwz); if (nC) pC = clipEdge(cwx, cwy, cwz, bwx, bwy, bwz); }
    if (!nC) { if (nA) pA = clipEdge(awx, awy, awz, cwx, cwy, cwz); if (nB) pB = clipEdge(bwx, bwy, bwz, cwx, cwy, cwz); }
  }
  if (!pA || !pB || !pC) return;
  const dist = pA.d;
  if (dist > FAR * 1.05) return;

  const azA = Math.max(A.wz, 0), azB = Math.max(B.wz, 0), azC = Math.max(C.wz, 0);
  const e1x = B.wx - A.wx, e1y = B.wy - A.wy, e1z = azB - azA;
  const e2x = C.wx - A.wx, e2y = C.wy - A.wy, e2z = azC - azA;
  let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
  const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9;
  nx /= nl; ny /= nl; nz /= nl;
  if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }

  const dot = nx * SD.x + ny * SD.y + nz * SD.z;
  let diffuse = Math.max(0.15, dot);
  diffuse -= (1 - nz) * 0.14;
  diffuse = Math.max(0.18, diffuse);

  // Perspective atmosphérique renforcée : les reliefs lointains se fondent
  // dans la brume au lieu de former un « mur vert » à l'horizon.
  const fogF = Math.pow(Math.min(1, dist / FAR), .42);
  const avgH = (A.wz + B.wz + C.wz) / 3;
  let [r, g, b] = biomeColor(avgH, A.wx, A.wy, diffuse, fogF, T, nx, ny, nz);

  // ── Reflet speculaire : eclat vers le soleil sur la neige et l'eau ──
  if ((avgH > 430 || avgH < 1.2) && fogF < 0.9) {
    const mx = (A.wx + B.wx + C.wx) / 3, my = (A.wy + B.wy + C.wy) / 3, mz = (azA + azB + azC) / 3;
    let vx = cam.cx - mx, vy = cam.cy - my, vz = cam.cz - mz;
    const vl = Math.sqrt(vx*vx + vy*vy + vz*vz) || 1; vx/=vl; vy/=vl; vz/=vl;
    const hx = SD.x + vx, hy = SD.y + vy, hz = SD.z + vz;
    const hl = Math.sqrt(hx*hx + hy*hy + hz*hz) || 1;
    const sdot = Math.max(0, (nx*hx + ny*hy + nz*hz) / hl);
    const isWater = avgH < 1.2;
    const spec = Math.pow(sdot, isWater ? 32 : 18) * (isWater ? 110 : 75) * (1 - fogF);
    r = Math.min(255, r + spec * .92); g = Math.min(255, g + spec * .96); b = Math.min(255, b + spec);
  }

  ctx.beginPath();
  ctx.moveTo(pA.sx, pA.sy);
  ctx.lineTo(pB.sx, pB.sy);
  ctx.lineTo(pC.sx, pC.sy);
  ctx.closePath();
  ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
  ctx.fill();
  ctx.strokeStyle = ctx.fillStyle;
  ctx.stroke();
}
