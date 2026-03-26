// ══════════════════════════════════════════════════════════
// MAIN.JS — Boucle principale + handlers start/crash
// ══════════════════════════════════════════════════════════

// ── Reset position + handlers ──
function resetPlane() {
  const ap = AIRPORTS[0];
  const cx = Math.sin(ap.hdg), cy = Math.cos(ap.hdg);
  const offset = ap.len / 2 - 30;
  const sx = ap.wx - cx * offset;
  const sy = ap.wy - cy * offset;
  if (!ap._gz) {
    const acx = cx, acy = cy, apx = -cy, apy = cx;
    const ahl = ap.len / 2, ahw = ap.wid / 2;
    let mxH = 0;
    for (let ti = -1; ti <= 1; ti++) for (let wi = -1; wi <= 1; wi++) {
      mxH = Math.max(mxH, terrainH(ap.wx + acx * ahl * ti * .9 + apx * ahw * wi * .9,
        ap.wy + acy * ahl * ti * .9 + apy * ahw * wi * .9));
    }
    ap._gz = Math.max(14, mxH) + 2.5;
  }
  const gz = ap._gz;
  pl = { x: sx, y: sy, z: gz + GEAR_H, yaw: ap.hdg, pitch: 0, roll: 0, speed: 0, throttle: 0, vz: 0 };
  flaps = 0;
}

document.getElementById('cam-btn').addEventListener('click', () => { camMode = (camMode + 1) % 3; });
window.addEventListener('keydown', e => { if (e.code === 'KeyV') camMode = (camMode + 1) % 3; });

// ── Boucle principale ──
let lastTs = 0;

function loop(ts) {
  const dt = Math.min((ts - lastTs) / 1000, .1); lastTs = ts;
  update(dt);
  cam = getCam();
  ctx.clearRect(0, 0, W, H);
  const T = ts * .001;
  drawSky();
  drawClouds();
  drawTerrain(T);
  drawRivers();
  drawAirports();
  drawAirportBuildings();
  drawTrees(T);
  if (camMode !== 0) drawCessna();
  drawCloudFog();
  drawAttitude();
  if (started && !crashed) updateHUD();
  requestAnimationFrame(loop);
}

resetPlane();
document.getElementById('btn-s').addEventListener('click', () => {
  AIRPORTS.forEach(a => a._gz = null);
  resetPlane(); document.getElementById('scr-s').style.display = 'none'; started = true;
});
document.getElementById('btn-r').addEventListener('click', () => {
  crashed = false; resetPlane(); document.getElementById('scr-c').style.display = 'none';
});

requestAnimationFrame(loop);
