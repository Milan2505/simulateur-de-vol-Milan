// ══════════════════════════════════════════════════════════
// WATER.JS — Rendu de l'océan plein écran
// ══════════════════════════════════════════════════════════

function drawOceanScreen(T) {
  if (pl.z < 0) return;
  const cosY = Math.cos(pl.yaw), sinY = Math.sin(pl.yaw);
  const dists = [120, 400, 1200, 5000, 20000];
  let minSY = H;
  for (const d of dists) {
    const wx = pl.x + sinY * d, wy = pl.y + cosY * d;
    const p = project(wx, wy, 0);
    if (p && p.sy < minSY) minSY = p.sy;
    const wb = project(pl.x - sinY * d, pl.y - cosY * d, 0);
    if (wb && wb.sy < minSY) minSY = wb.sy;
  }
  for (const side of [-1, 1]) {
    const wx = pl.x + cosY * side * 5000, wy = pl.y - sinY * side * 5000;
    const p = project(wx, wy, 0);
    if (p && p.sy < minSY) minSY = p.sy;
  }
  if (minSY >= H) return;

  const br = 32, bg = 72, bb = 138;
  const fr = FOG_R, fg = FOG_G, fb = FOG_B;
  const top = Math.max(0, Math.floor(minSY) - 6);
  const grad = ctx.createLinearGradient(0, top, 0, H);
  grad.addColorStop(0, `rgb(${fr},${fg},${fb})`);
  grad.addColorStop(Math.min(1, 0.3), `rgb(${Math.round((br + fr) / 2)},${Math.round((bg + fg) / 2)},${Math.round((bb + fb) / 2)})`);
  grad.addColorStop(1, `rgb(${br},${bg},${bb})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, top, W, H - top);

  // Reflets spéculaires soleil
  const sp = getSunScreen();
  if (sp && sp.sy > top && pl.z > 5) {
    const reflY = Math.max(top, sp.sy - 80);
    const reflH = Math.min(H - reflY, 220);
    const refl = ctx.createRadialGradient(sp.sx, reflY + reflH * 0.3, 0, sp.sx, reflY + reflH * 0.3, reflH * 0.8);
    refl.addColorStop(0, 'rgba(255,240,180,0.12)');
    refl.addColorStop(0.3, 'rgba(255,220,140,0.06)');
    refl.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = refl;
    ctx.fillRect(sp.sx - reflH, reflY, reflH * 2, reflH);
  }

  // Petites vagues
  if (pl.z < 800) {
    const Tw = performance.now() * 0.0005;
    const waveAlpha = Math.max(0, 0.12 * (1 - pl.z / 800));
    ctx.strokeStyle = `rgba(255,255,255,${waveAlpha})`;
    ctx.lineWidth = 0.8;
    const waveCount = Math.min(12, Math.floor((H - top) / 25));
    for (let i = 0; i < waveCount; i++) {
      const wy = top + (H - top) * ((i + 0.5) / waveCount);
      ctx.beginPath();
      for (let wx = 0; wx < W; wx += 8) {
        const y = wy + Math.sin(wx * 0.015 + Tw * 3 + i * 1.7) * 2.5 + Math.sin(wx * 0.032 + Tw * 5) * 1.2;
        if (wx === 0) ctx.moveTo(wx, y); else ctx.lineTo(wx, y);
      }
      ctx.stroke();
    }
  }
}
