// ══════════════════════════════════════════════════════════
// CLOUDS.JS — Système de nuages (génération + rendu + fog)
// ══════════════════════════════════════════════════════════

function makeCloud() {
  const cx = (Math.random() - .5) * 55000;
  const cy = (Math.random() - .5) * 55000;
  const puffs = [];
  const roll = Math.random();
  let type, cW, cz, aspectH;

  function addLayers(layers) {
    for (const { n, yFrac, spread, r } of layers) {
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + Math.random() * .45;
        const dist = spread * (0.62 + Math.random() * .38);
        puffs.push({
          lx: Math.cos(angle) * dist + (Math.random() - .5) * .06,
          lz: Math.max(0, Math.min(1, yFrac + (Math.random() - .5) * .05)),
          size: r * (0.92 + Math.random() * .25)
        });
      }
      puffs.push({ lx: (Math.random() - .5) * .15, lz: yFrac, size: r * 0.85 });
    }
  }

  if (roll < 0.45) {
    type = 'cumulus'; cW = 3000 + Math.random() * 4000; cz = 2000 + Math.random() * 2500; aspectH = 0.70;
    addLayers([
      { n: 10, yFrac: 0.00, spread: 0.70, r: 0.26 }, { n: 10, yFrac: 0.18, spread: 0.90, r: 0.28 },
      { n: 9, yFrac: 0.35, spread: 0.95, r: 0.29 }, { n: 8, yFrac: 0.52, spread: 0.88, r: 0.28 },
      { n: 7, yFrac: 0.66, spread: 0.72, r: 0.26 }, { n: 5, yFrac: 0.78, spread: 0.52, r: 0.24 },
      { n: 4, yFrac: 0.88, spread: 0.32, r: 0.20 }, { n: 2, yFrac: 0.95, spread: 0.14, r: 0.16 },
    ]);
  } else if (roll < 0.65) {
    type = 'cumulonimbus'; cW = 5000 + Math.random() * 5000; cz = 1800 + Math.random() * 1800; aspectH = 1.20;
    addLayers([
      { n: 11, yFrac: 0.00, spread: 0.88, r: 0.26 }, { n: 11, yFrac: 0.12, spread: 0.92, r: 0.27 },
      { n: 10, yFrac: 0.24, spread: 0.95, r: 0.27 }, { n: 10, yFrac: 0.36, spread: 0.92, r: 0.26 },
      { n: 9, yFrac: 0.48, spread: 0.85, r: 0.25 }, { n: 8, yFrac: 0.59, spread: 0.75, r: 0.24 },
      { n: 7, yFrac: 0.69, spread: 0.62, r: 0.22 }, { n: 6, yFrac: 0.78, spread: 0.48, r: 0.20 },
      { n: 4, yFrac: 0.87, spread: 0.32, r: 0.18 }, { n: 3, yFrac: 0.94, spread: 0.16, r: 0.14 },
    ]);
  } else if (roll < 0.80) {
    type = 'stratus'; cW = 9000 + Math.random() * 9000; cz = 1000 + Math.random() * 1200; aspectH = 0.10;
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random());
      puffs.push({ lx: Math.cos(a) * d * .95, lz: 0.3 + Math.random() * .4, size: 0.30 + Math.random() * .20 });
    }
  } else {
    type = 'altocumulus'; cW = 1800 + Math.random() * 2200; cz = 4000 + Math.random() * 2000; aspectH = 0.60;
    addLayers([
      { n: 7, yFrac: 0.00, spread: 0.75, r: 0.25 }, { n: 7, yFrac: 0.22, spread: 0.88, r: 0.27 },
      { n: 6, yFrac: 0.45, spread: 0.80, r: 0.25 }, { n: 4, yFrac: 0.65, spread: 0.55, r: 0.22 },
      { n: 2, yFrac: 0.82, spread: 0.25, r: 0.17 },
    ]);
  }

  const W_span = cW / 2, D_span = cW / 2, H_span = cW * (aspectH || 0.7);
  return { cx, cy, cz, W: cW, puffs, type, aspectH, W_span, D_span, H_span };
}

const CLOUDS = Array.from({ length: 28 }, makeCloud);
const _cloudOff = document.createElement('canvas');
const _cloudCtx = _cloudOff.getContext('2d');

function drawOneCloud(cl, pc, sc, fog) {
  const sw = cl.W * sc;
  if (sw < 12) return;
  const sh = sw * (cl.aspectH || 0.85);
  const pad = sw * 0.28;
  const pwRaw = sw + pad * 2 + 8;
  const phRaw = sh + pad * 2 + 8;
  const scale = Math.min(1, 700 / Math.max(pwRaw, phRaw));
  const pw = Math.ceil(pwRaw * scale);
  const ph = Math.ceil(phRaw * scale);
  const swS = sw * scale, shS = sh * scale;
  if (pw < 6 || ph < 6) return;

  if (!cl._cache) cl._cache = document.createElement('canvas');
  const needRedraw = Math.abs(pw - (cl._cache.width || 0)) > pw * 0.08 ||
    Math.abs(ph - (cl._cache.height || 0)) > ph * 0.08 ||
    Math.abs(fog - (cl._cacheFog || 0)) > 0.04;
  if (!needRedraw) {
    ctx.globalAlpha = Math.max(0.72, 0.95 - Math.min(1, fog) * 0.25);
    ctx.drawImage(cl._cache, pc.sx - cl._cache.width / 2, pc.sy - cl._cache.height * .28);
    ctx.globalAlpha = 1;
    return;
  }
  cl._cache.width = pw; cl._cache.height = ph;
  cl._cacheFog = fog;
  const oc = cl._cache.getContext('2d');
  const ox = pw / 2, oy = ph * 0.72;

  const fogf = Math.min(1, fog);
  const isCB = (cl.type === 'cumulonimbus');
  const isStr = (cl.type === 'stratus');
  const topR = Math.round(lerp(isCB ? 245 : 252, FOG_R, fogf * .50));
  const topG = Math.round(lerp(isCB ? 247 : 254, FOG_G, fogf * .50));
  const topB = Math.round(lerp(isCB ? 250 : 255, FOG_B, fogf * .50));
  const botR = Math.round(lerp(isCB ? 148 : isStr ? 195 : 188, FOG_R, fogf * .65));
  const botG = Math.round(lerp(isCB ? 158 : isStr ? 202 : 198, FOG_G, fogf * .65));
  const botB = Math.round(lerp(isCB ? 178 : isStr ? 220 : 218, FOG_B, fogf * .65));

  // Étape 1 : masse blanche fusionnée par blur
  oc.clearRect(0, 0, pw, ph);
  const blurPx = Math.max(2, swS * 0.028);
  oc.filter = `blur(${blurPx.toFixed(1)}px)`;
  const sorted = [...cl.puffs].sort((a, b) => a.lz - b.lz);
  for (const p of sorted) {
    const px = ox + p.lx * sw * .48;
    const py = oy - p.lz * sh;
    const r = p.size * sw * .52;
    if (r < 2) continue;
    oc.fillStyle = 'rgba(255,255,255,0.98)';
    oc.beginPath(); oc.arc(px, py, r, 0, Math.PI * 2); oc.fill();
  }
  oc.filter = 'none';

  // Étape 2 : gradient vertical
  oc.globalCompositeOperation = 'source-atop';
  const midR2 = Math.round((topR + botR) / 2), midG2 = Math.round((topG + botG) / 2), midB2 = Math.round((topB + botB) / 2);
  const lg = oc.createLinearGradient(ox, oy - shS * 1.05, ox, oy + shS * .15);
  lg.addColorStop(0, `rgb(${topR},${topG},${topB})`);
  lg.addColorStop(0.40, `rgb(${midR2},${midG2},${midB2})`);
  lg.addColorStop(1, `rgb(${botR},${botG},${botB})`);
  oc.fillStyle = lg; oc.fillRect(0, 0, pw, ph);
  oc.globalCompositeOperation = 'source-over';

  // Étape 3 : highlight solaire
  const hlx = ox - swS * 0.30, hly = oy - shS * 0.85;
  const hlR = Math.max(swS, shS) * 0.90;
  oc.globalCompositeOperation = 'source-atop';
  const hl = oc.createRadialGradient(hlx, hly, 0, hlx, hly, hlR);
  hl.addColorStop(0, `rgba(255,255,255,${0.42 - fogf * .22})`);
  hl.addColorStop(0.35, `rgba(255,255,255,${0.18 - fogf * .10})`);
  hl.addColorStop(0.70, 'rgba(255,255,255,0)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  oc.fillStyle = hl; oc.fillRect(0, 0, pw, ph);
  oc.globalCompositeOperation = 'source-over';

  // Étape 4 : ombre volumétrique
  oc.globalCompositeOperation = 'source-atop';
  const shx = ox + swS * 0.25, shy = oy + shS * 0.10;
  const shR = Math.max(swS, shS) * 0.95;
  const shd = oc.createRadialGradient(shx, shy, shR * 0.15, shx, shy, shR);
  const sdStr = isCB ? 0.55 : 0.38;
  shd.addColorStop(0, 'rgba(0,0,0,0)');
  shd.addColorStop(0.45, 'rgba(0,0,0,0)');
  shd.addColorStop(0.75, `rgba(15,20,45,${(sdStr * .55) - fogf * .15})`);
  shd.addColorStop(1, `rgba(15,20,45,${sdStr - fogf * .20})`);
  oc.fillStyle = shd; oc.fillRect(0, 0, pw, ph);
  oc.globalCompositeOperation = 'source-over';

  // Étape 5 : ombre ventre
  oc.globalCompositeOperation = 'source-atop';
  const belly = oc.createLinearGradient(ox, oy - shS * .05, ox, oy + shS * .20);
  belly.addColorStop(0, 'rgba(0,0,0,0)');
  belly.addColorStop(0.45, 'rgba(0,0,0,0)');
  belly.addColorStop(1, `rgba(10,15,40,${(isCB ? 0.50 : 0.30) - fogf * .18})`);
  oc.fillStyle = belly; oc.fillRect(0, 0, pw, ph);
  oc.globalCompositeOperation = 'source-over';

  // Masque destination-in
  {
    oc.globalCompositeOperation = 'destination-in';
    const mx = ox, my = oy - shS * 0.42;
    const mrx = swS * 0.52, mry = shS * 0.60;
    const mask = oc.createRadialGradient(mx, my, mrx * 0.3, mx, my, Math.max(mrx, mry) * 1.15);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(0.72, 'rgba(0,0,0,1)');
    mask.addColorStop(0.90, 'rgba(0,0,0,0.5)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    oc.fillStyle = mask;
    oc.beginPath(); oc.ellipse(mx, my, mrx * 1.18, mry * 1.18, 0, 0, Math.PI * 2); oc.fill();
    oc.globalCompositeOperation = 'source-over';
  }

  // Fog lointain
  if (fogf > 0.05) {
    oc.globalCompositeOperation = 'source-atop';
    oc.fillStyle = `rgba(${Math.round(FOG_R)},${Math.round(FOG_G)},${Math.round(FOG_B)},${Math.min(0.88, fogf * .75)})`;
    oc.fillRect(0, 0, pw, ph);
    oc.globalCompositeOperation = 'source-over';
  }

  ctx.globalAlpha = Math.max(0.72, 0.95 - fogf * .25);
  ctx.drawImage(cl._cache, pc.sx - pw / 2, pc.sy - ph * .28);
  ctx.globalAlpha = 1;
}

function drawClouds() {
  const FOV = Math.min(W, H) * 0.72;
  const visible = [];
  CLOUDS.forEach(cl => {
    const dx = cl.cx - pl.x, dy = cl.cy - pl.y;
    if (dx * dx + dy * dy > 58000 * 58000) {
      cl.cx = pl.x + (Math.random() - .5) * 55000;
      cl.cy = pl.y + (Math.random() - .5) * 55000;
      cl.cz = 2000 + Math.random() * 3500;
      return;
    }
    const eucD = Math.sqrt(dx * dx + dy * dy + (cl.cz - cam.cz) ** 2);
    if (eucD < 1200 || eucD > 42000) return;
    const sc = FOV / eucD;
    const fog = Math.min(1, eucD / 44000);
    const pc = project(cl.cx, cl.cy, cl.cz);
    if (!pc) return;
    visible.push({ cl, pc, sc, fog, d: eucD });
  });
  visible.sort((a, b) => b.d - a.d);
  visible.forEach(({ cl, pc, sc, fog }) => drawOneCloud(cl, pc, sc, fog));
}

function drawCloudFog() {
  let fogIntensity = 0;
  for (const cl of CLOUDS) {
    const dx = (pl.x - cl.cx) / cl.W_span;
    const dy = (pl.y - cl.cy) / cl.D_span;
    const dz = (pl.z - cl.cz) / (cl.H_span * 0.5 + 50);
    const d2 = dx * dx + dy * dy * 0.8 + dz * dz;
    if (d2 < 1.0) {
      const intensity = Math.pow(Math.max(0, 1 - d2), 0.6);
      if (intensity > fogIntensity) fogIntensity = intensity;
    }
  }
  if (fogIntensity < 0.01) return;
  const a = (fogIntensity * 0.88).toFixed(3);
  ctx.fillStyle = `rgba(235,240,248,${a})`;
  ctx.fillRect(0, 0, W, H);
}
