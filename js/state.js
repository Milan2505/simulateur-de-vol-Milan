// ══════════════════════════════════════════════════════════
// STATE.JS — Variables globales, constantes, setup canvas
// ══════════════════════════════════════════════════════════

const cvs = document.getElementById('sky');
const ctx = cvs.getContext('2d');
let W = cvs.width = innerWidth, H = cvs.height = innerHeight;
window.addEventListener('resize', () => { W = cvs.width = innerWidth; H = cvs.height = innerHeight; });
const attX = document.getElementById('att').getContext('2d');

// ── Clavier ──
const K = {};
window.addEventListener('keydown', e => {
  K[e.code] = true;
  if (e.code === 'KeyF' && started && !crashed) flaps = Math.min(3, flaps + 1);
  if (e.code === 'KeyG' && started && !crashed) flaps = Math.max(0, flaps - 1);
});
window.addEventListener('keyup', e => { K[e.code] = false; });

// ── État jeu ──
let started = false, crashed = false, camMode = 0;
let pl = {
  x: 0, y: 0, z: 600,
  yaw: 0, pitch: 0, roll: 0,
  p: 0, q: 0, r: 0,              // taux angulaires corps (roulis, tangage, lacet)
  speed: 0, throttle: 0, vz: 0,
  elevator: 0, aileron: 0, rudder: 0,  // surfaces de contrôle [-1, 1]
  onGround: false
};
const GEAR_H = 4.9, VSCALE = 12;

// ── Constantes physiques (calibrées C172) ──
const GRAV = 2.2, MAX_THR = 19;
const STALL_SPD_CLEAN = 48, STALL_SPD_FLAPS = 38;
let flaps = 0;
const CL_ALPHA = 8.0;
const LIFT_K = GRAV / (90.0 * 90.0);
const CARDS = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' };

// ── Soleil ──
const SUN_WX = 0.55, SUN_WY = 1.0, SUN_WZ = 0.55;
const SL = Math.sqrt(SUN_WX * SUN_WX + SUN_WY * SUN_WY + SUN_WZ * SUN_WZ);
const SD = { x: SUN_WX / SL, y: SUN_WY / SL, z: SUN_WZ / SL };

// ── Brouillard ──
const FOG_R = 182, FOG_G = 205, FOG_B = 228;

// ── Caméra (rempli chaque frame) ──
let cam = {};

// ── Utilitaires ──
function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function moveToward(cur, tgt, rate) {
  if (tgt > cur) return Math.min(cur + rate, tgt);
  if (tgt < cur) return Math.max(cur - rate, tgt);
  return cur;
}
