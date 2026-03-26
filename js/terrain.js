// ══════════════════════════════════════════════════════════
// TERRAIN.JS — Génération procédurale de terrain + biomes
// ══════════════════════════════════════════════════════════

const _tCache = new Map();

function _terrainRaw(x, z) {
  const s = 0.00075;
  let h = 0;
  h += Math.sin(x * s + 1.31) * Math.cos(z * s * .73) * 520;
  h += Math.sin(x * s * 1.7 + 4.2) * Math.cos(z * s * 1.3 + 2.1) * 280;
  h += Math.sin(x * s * 2.1 + 2.74) * Math.sin(z * s * 1.87 + 0.41) * 160;
  h += Math.cos(x * s * 3.3 + 1.55) * Math.sin(z * s * 2.8 + 3.3) * 95;
  h += Math.cos(x * s * 5.2 + 0.93) * Math.cos(z * s * 4.31 + 1.12) * 58;
  h += Math.sin(x * s * 7.8 + 3.1) * Math.cos(z * s * 6.5 + 0.88) * 36;
  h += Math.sin(x * s * 14 + 0.5) * Math.sin(z * s * 11.5) * 20;
  h += Math.cos(x * s * 26 + 2.2) * Math.cos(z * s * 21 + 1.7) * 10;
  h += Math.sin(x * s * 50 + 1.1) * Math.cos(z * s * 44 + 2.3) * 4;
  h += Math.sin(x * s * 95 + 0.7) * Math.cos(z * s * 82 + 1.4) * 1.8;
  h += Math.sin(x * s * 180 + 2.8) * Math.cos(z * s * 155 + 0.9) * 0.9;
  h += Math.cos(x * s * 320 + 1.5) * Math.sin(z * s * 280 + 3.2) * 0.4;

  // Crêtes rocheuses
  const ridge = Math.abs(Math.sin(x * s * 4.5 + 0.8) * Math.cos(z * s * 3.8 + 2.1));
  h += ridge * ridge * 18;

  // Fonction de transfert
  if (h < 0) h *= 0.22;
  else if (h < 60) h *= 0.28;
  else if (h < 140) h = 16.8 + (h - 60) * 0.85;
  else h = 84 + (h - 140) * 1.35;

  // Rivières
  if (h > 2 && h < 200) {
    const rv1 = Math.abs(Math.sin(x * s * 1.2 + 0.7) + Math.cos(z * s * 0.9 + 1.4) * 0.6);
    const rv2 = Math.abs(Math.sin(x * s * 0.8 + 3.2) + Math.cos(z * s * 1.1 + 0.3) * 0.5);
    const rw = 0.08;
    if (rv1 < rw) h = Math.min(h, 0.5 + rv1 / rw * 4);
    else if (rv1 < rw * 3) h = Math.min(h, h * (rv1 - rw) / (rw * 2) + 2 * (1 - (rv1 - rw) / (rw * 2)));
    if (rv2 < rw * 0.7) h = Math.min(h, 0.5 + rv2 / (rw * 0.7) * 3);
    else if (rv2 < rw * 2) h = Math.min(h, h * (rv2 - rw * 0.7) / (rw * 1.3) + 2 * (1 - (rv2 - rw * 0.7) / (rw * 1.3)));
  }

  return h;
}

function terrainH(x, z) {
  const ck = x + ',' + z;
  if (_tCache.has(ck)) return _tCache.get(ck);
  if (_tCache.size > 2048) _tCache.clear();
  const v = _terrainRaw(x, z);
  _tCache.set(ck, v);
  return v;
}

function oceanDepth(x, z) {
  const v = _terrainRaw(x, z);
  return v > 0 ? 0 : Math.min(80, (-v) * 0.35 + 40);
}

function biomeColor(h, wx, wy, diffuse, fogF, T, nx, ny, nz) {
  let br, bg, bb;

  if (h < 1) {
    const k = Math.max(0, h);
    br = lerp(32, 22, Math.min(1, -h / 30));
    bg = lerp(72, 50, Math.min(1, -h / 30));
    bb = lerp(138, 105, Math.min(1, -h / 30));
    br *= diffuse * .2 + 0.8; bg *= diffuse * .2 + 0.8; bb *= diffuse * .15 + 0.85;
  } else if (h < 5) {
    const k = (h) / 5;
    br = lerp(38, 195, k); bg = lerp(88, 178, k); bb = lerp(140, 128, k);
    const sand = Math.sin(wx * .18 + 1.1) * Math.cos(wy * .15 + 0.8) * 4 * (1 - fogF);
    br += sand; bg += sand * .6;
    br *= diffuse * .4 + 0.6; bg *= diffuse * .4 + 0.6; bb *= diffuse * .3 + 0.7;
  } else if (h < 14) {
    const k = (h - 5) / 9;
    br = lerp(210, 182, k); bg = lerp(192, 160, k); bb = lerp(130, 104, k);
    const grain = Math.sin(wx * .28 + 2.1) * Math.cos(wy * .24 + 1.4) * 5 * (1 - fogF);
    br += grain; bg += grain * .7; bb += grain * .3;
    br *= diffuse * .5 + 0.5; bg *= diffuse * .5 + 0.5; bb *= diffuse * .5 + 0.5;
  } else if (h < 32) {
    const k = (h - 14) / 18;
    br = lerp(108, 82, k) * diffuse + 20 * (1 - diffuse);
    bg = lerp(155, 132, k) * diffuse + 32 * (1 - diffuse);
    bb = lerp(44, 30, k) * diffuse + 10 * (1 - diffuse);
    const tex = Math.sin(wx * .13 + 1.8) * Math.cos(wy * .12 + .9) * 5 * (1 - fogF * .9);
    br += tex * .2; bg += tex * .8; bb += tex * .1;
  } else if (h < 100) {
    const k = (h - 32) / 68;
    br = lerp(72, 55, k) * diffuse + 14 * (1 - diffuse);
    bg = lerp(142, 112, k) * diffuse + 24 * (1 - diffuse);
    bb = lerp(35, 28, k) * diffuse + 9 * (1 - diffuse);
    const field = Math.sin(wx * .07 + 3.1) * Math.sin(wy * .062 + 0.7);
    if (field > 0.25) { br += field * 24; bg += field * 16; bb -= field * 6; }
    else if (field < -0.35) { br -= field * 8; bg -= field * 12; bb += 6; }
    const tex2 = Math.sin(wx * .10 + 1.2) * Math.cos(wy * .092 + 2.1);
    bg += tex2 * 7; br += tex2 * 3;
    const farmX = Math.floor(wx * 0.008), farmY = Math.floor(wy * 0.008);
    const farmHash = (farmX * 374761 + farmY * 668265) & 0xff;
    if (farmHash < 80) { br += 18; bg += 8; bb -= 8; }
    else if (farmHash < 130) { br -= 12; bg -= 22; bb -= 6; }
    else if (farmHash < 160) { br += 22; bg += 14; bb -= 10; }
  } else if (h < 220) {
    const k = (h - 100) / 120;
    br = lerp(28, 46, k) * diffuse + 10 * (1 - diffuse);
    bg = lerp(90, 76, k) * diffuse + 18 * (1 - diffuse);
    bb = lerp(18, 28, k) * diffuse + 7 * (1 - diffuse);
    const canopy = Math.sin(wx * .048 + 2.4) * Math.cos(wy * .043 + 1.1) * .5 + .5;
    bg += canopy * 14 * diffuse; br += canopy * 6 * diffuse;
    const species = Math.sin(wx * .022 + 3.8) * Math.cos(wy * .019 + 0.6);
    if (species > 0.2) { bg += species * 8; br -= species * 4; }
  } else if (h < 320) {
    const k = (h - 220) / 100;
    br = lerp(80, 130, k) * diffuse + 16 * (1 - diffuse);
    bg = lerp(100, 112, k) * diffuse + 18 * (1 - diffuse);
    bb = lerp(38, 78, k) * diffuse + 12 * (1 - diffuse);
    const rock = Math.sin(wx * .035 + 1.6) * Math.sin(wy * .031 + 0.4) * .5 + .5;
    br += rock * 22 * k; bg += rock * 18 * k; bb += rock * 14 * k;
  } else if (h < 480) {
    const k = (h - 320) / 160;
    br = lerp(105, 175, k) * diffuse + 16 * (1 - diffuse);
    bg = lerp(98, 162, k) * diffuse + 14 * (1 - diffuse);
    bb = lerp(85, 145, k) * diffuse + 12 * (1 - diffuse);
    const strat = Math.sin(h * .07 + wx * .006) * 12 * (1 - fogF);
    br += strat; bg += strat * .8; bb += strat * .65;
  } else {
    const k = Math.min(1, (h - 480) / 120);
    const snow = lerp(230, 255, k);
    br = lerp(snow, 255, k) * diffuse + lerp(52, 68, k) * (1 - diffuse);
    bg = lerp(snow + 3, 255, k) * diffuse + lerp(58, 74, k) * (1 - diffuse);
    bb = lerp(snow + 18, 255, k) * diffuse + lerp(72, 92, k) * (1 - diffuse);
    if (diffuse < 0.38) { br -= 14; bg -= 5; bb += 18; }
  }

  // AO sur parois raides
  if (h > 14) {
    const slope = Math.sqrt(Math.max(0, 1 - nz * nz));
    const ao = slope * 0.40;
    br *= (1 - ao); bg *= (1 - ao * 0.92); bb *= (1 - ao * 0.82);
  }

  // Brume atmosphérique
  const fogTint = fogF > 0.45 ? (fogF - 0.45) * 1.4 : 0;
  br = br * (1 - fogF) + FOG_R * fogF + fogTint * 10;
  bg = bg * (1 - fogF) + FOG_G * fogF - fogTint * 2;
  bb = bb * (1 - fogF) + FOG_B * fogF - fogTint * 5;

  if (!isFinite(br)) br = 128; if (!isFinite(bg)) bg = 128; if (!isFinite(bb)) bb = 128;
  return [Math.max(0, Math.min(255, Math.round(br))),
          Math.max(0, Math.min(255, Math.round(bg))),
          Math.max(0, Math.min(255, Math.round(bb)))];
}
