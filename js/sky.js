// ══════════════════════════════════════════════════════════
// SKY.JS — Rendu du ciel + soleil
// ══════════════════════════════════════════════════════════

function drawSky() {
  const t = Math.min(1, pl.z / 10000);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgb(${Math.round(8 + t * 4)},${Math.round(30 + t * 10)},${Math.round(110 + t * 60)})`);
  g.addColorStop(0.35, `rgb(${Math.round(20 + t * 8)},${Math.round(80 + t * 20)},${Math.round(170 + t * 50)})`);
  g.addColorStop(0.65, `rgb(${Math.round(80 + t * 10)},${Math.round(160 + t * 20)},${Math.round(220 + t * 20)})`);
  g.addColorStop(0.82, 'rgb(185,215,235)');
  g.addColorStop(0.93, 'rgb(210,225,200)');
  g.addColorStop(1, 'rgb(80,100,60)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Brume horizon
  const hY = H * 0.72;
  const hg = ctx.createLinearGradient(0, hY - H * .14, 0, hY + H * .07);
  hg.addColorStop(0, 'rgba(200,220,210,0)');
  hg.addColorStop(.5, 'rgba(200,220,200,.16)');
  hg.addColorStop(1, 'rgba(200,220,200,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, hY - H * .14, W, H * .21);

  // Soleil
  const sp = getSunScreen();
  if (sp && sp.sy < H * .85) {
    const sx = sp.sx, sy = sp.sy;
    const h1 = ctx.createRadialGradient(sx, sy, 0, sx, sy, 280);
    h1.addColorStop(0, 'rgba(255,245,180,.16)');
    h1.addColorStop(.4, 'rgba(255,200,100,.06)');
    h1.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = h1; ctx.beginPath(); ctx.arc(sx, sy, 280, 0, Math.PI * 2); ctx.fill();
    const d1 = ctx.createRadialGradient(sx, sy, 0, sx, sy, 36);
    d1.addColorStop(0, 'rgba(255,255,220,1)');
    d1.addColorStop(.6, 'rgba(255,230,150,.9)');
    d1.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = d1; ctx.beginPath(); ctx.arc(sx, sy, 36, 0, Math.PI * 2); ctx.fill();
  }
}
