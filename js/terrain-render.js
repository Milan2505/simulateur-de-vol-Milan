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
          const wr = Math.round(32 * (1 - fog) + FOG_R * fog);
          const wg = Math.round(72 * (1 - fog) + FOG_G * fog);
          const wb = Math.round(138 * (1 - fog) + FOG_B * fog);
          const wcol = `rgb(${wr},${wg},${wb})`;
          const pA = project(wx0, wy0, 0), pB = project(wx1, wy0, 0);
          const pC = project(wx1, wy1, 0), pD = project(wx0, wy1, 0);
          if (pA && pB && pD) {
            ctx.fillStyle = wcol; ctx.beginPath();
            ctx.moveTo(pA.sx, pA.sy); ctx.lineTo(pB.sx, pB.sy);
            ctx.lineTo(pD.sx, pD.sy); ctx.closePath(); ctx.fill();
          }
          if (pB && pC && pD) {
            ctx.fillStyle = wcol; ctx.beginPath();
            ctx.moveTo(pB.sx, pB.sy); ctx.lineTo(pC.sx, pC.sy);
            ctx.lineTo(pD.sx, pD.sy); ctx.closePath(); ctx.fill();
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

  const fogF = Math.pow(Math.min(1, dist / FAR), .58);
  const avgH = (A.wz + B.wz + C.wz) / 3;
  const [r, g, b] = biomeColor(avgH, A.wx, A.wy, diffuse, fogF, T, nx, ny, nz);

  ctx.beginPath();
  ctx.moveTo(pA.sx, pA.sy);
  ctx.lineTo(pB.sx, pB.sy);
  ctx.lineTo(pC.sx, pC.sy);
  ctx.closePath();
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fill();
}
