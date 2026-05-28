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
  pl = {
    x: sx, y: sy, z: gz + GEAR_H,
    yaw: ap.hdg, pitch: 0, roll: 0,
    p: 0, q: 0, r: 0,
    speed: 0, throttle: 0, vz: 0,
    elevator: 0, aileron: 0, rudder: 0,
    onGround: true
  };
  flaps = 0;
}

function cycleCam() {
  camMode = (camMode + 1) % 4;
  if (camMode === 3) { camOrbit.yaw = pl.yaw; camOrbit.pitch = 0.22; }  // démarre derrière l'avion
}
document.getElementById('cam-btn').addEventListener('click', cycleCam);
window.addEventListener('keydown', e => { if (e.code === 'KeyV') cycleCam(); });

// ── Contrôle souris de la caméra libre (mode 3) ──
let _dragCam = false, _lastMX = 0, _lastMY = 0;
cvs.addEventListener('mousedown', e => {
  if (camMode === 3) { _dragCam = true; _lastMX = e.clientX; _lastMY = e.clientY; cvs.style.cursor = 'grabbing'; }
});
window.addEventListener('mouseup', () => { _dragCam = false; cvs.style.cursor = ''; });
window.addEventListener('mousemove', e => {
  if (!_dragCam) return;
  camOrbit.yaw -= (e.clientX - _lastMX) * 0.006;
  camOrbit.pitch = clamp(camOrbit.pitch + (e.clientY - _lastMY) * 0.006, -0.35, 1.35);
  _lastMX = e.clientX; _lastMY = e.clientY;
});
cvs.addEventListener('wheel', e => {
  if (camMode !== 3) return;
  e.preventDefault();
  camOrbit.dist = clamp(camOrbit.dist + e.deltaY * 0.05, 12, 220);
}, { passive: false });

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
