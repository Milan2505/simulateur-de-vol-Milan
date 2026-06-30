// ══════════════════════════════════════════════════════════
// CAMERA.JS — Caméra, projection 3D→2D, clipping near-plane
// ══════════════════════════════════════════════════════════

function getCam() {
  if (camMode === 0) {
    return { cx: pl.x, cy: pl.y, cz: pl.z + 3.6, cyaw: pl.yaw, cpitch: pl.pitch, croll: pl.roll };
  } else if (camMode === 1) {
    // Poursuite : derrière l'avion. On empêche la caméra de plonger sous le terrain
    // (sinon on « filme dans le sol » → mur vert quand un relief monte derrière l'avion).
    const behind = 34, above = 8;
    const cosY = Math.cos(pl.yaw), sinY = Math.sin(pl.yaw);
    const cosPi = Math.cos(pl.pitch);
    const cx = pl.x - sinY * behind * cosPi;
    const cy = pl.y - cosY * behind * cosPi;
    let cz = pl.z + above + Math.sin(pl.pitch) * behind;
    let cpitch = -0.05;
    const minCz = terrainH(cx, cy) + 5;       // ne jamais passer sous le sol
    if (cz < minCz) {                          // relevée : on vise l'avion pour le garder cadré
      cz = minCz;
      const dxy = Math.hypot(pl.x - cx, pl.y - cy) || 1e-6;
      cpitch = Math.atan2((pl.z + 2) - cz, dxy);
    }
    return { cx, cy, cz, cyaw: pl.yaw, cpitch, croll: 0 };
  } else if (camMode === 2) {
    const perpX = Math.cos(pl.yaw), perpY = -Math.sin(pl.yaw);
    const cx = pl.x + perpX * 65, cy = pl.y + perpY * 65;
    let cz = pl.z + 8;
    let cpitch = 0;
    const minCz = terrainH(cx, cy) + 5;
    if (cz < minCz) {
      cz = minCz;
      const dxy = Math.hypot(pl.x - cx, pl.y - cy) || 1e-6;
      cpitch = Math.atan2((pl.z + 2) - cz, dxy);
    }
    return { cx, cy, cz, cyaw: pl.yaw - Math.PI / 2, cpitch, croll: 0 };
  } else {
    // Caméra libre : orbite autour de l'avion (contrôlée à la souris)
    const horiz = Math.cos(camOrbit.pitch) * camOrbit.dist;
    const cx = pl.x - Math.sin(camOrbit.yaw) * horiz;
    const cy = pl.y - Math.cos(camOrbit.yaw) * horiz;
    let cz = pl.z + 3 + Math.sin(camOrbit.pitch) * camOrbit.dist;
    cz = Math.max(cz, terrainH(cx, cy) + 4);   // reste au-dessus du sol
    const tx = pl.x, ty = pl.y, tz = pl.z + 3;
    const dxy = Math.sqrt((tx - cx) * (tx - cx) + (ty - cy) * (ty - cy)) || 1e-6;
    return {
      cx, cy, cz,
      cyaw: Math.atan2(tx - cx, ty - cy),
      cpitch: Math.atan2(tz - cz, dxy),
      croll: 0
    };
  }
}

function project(wx, wy, wz) {
  let dx = wx - cam.cx, dy = wy - cam.cy, dz = wz - cam.cz;
  const cY = Math.cos(-cam.cyaw), sY = Math.sin(-cam.cyaw);
  let ax = dx * cY + dy * sY, ay = -dx * sY + dy * cY, az = dz;
  const cP = Math.cos(-cam.cpitch), sP = Math.sin(-cam.cpitch);
  let bx = ax, by = ay * cP - az * sP, bz = ay * sP + az * cP;
  const cR = Math.cos(cam.croll), sR = Math.sin(cam.croll);
  let fx = bx * cR + bz * sR, fy = by, fz = -bx * sR + bz * cR;
  if (fy < 2.0) return null;
  const FOV = Math.min(W, H) * 0.72;
  return { sx: W / 2 + fx / fy * FOV, sy: H / 2 - fz / fy * FOV, d: fy };
}

// Near-plane clipping : interpole A (derrière) vers B (visible) via recherche binaire
function clipEdge(axw, ayw, azw, bxw, byw, bzw) {
  if (!project(bxw, byw, bzw)) return null;
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 5; i++) {
    const t = (t0 + t1) / 2;
    if (project(axw + (bxw - axw) * t, ayw + (byw - ayw) * t, azw + (bzw - azw) * t)) t1 = t; else t0 = t;
  }
  return project(axw + (bxw - axw) * t1, ayw + (byw - ayw) * t1, azw + (bzw - azw) * t1);
}

function getSunScreen() {
  const F = 180000;
  return project(pl.x + SUN_WX / SL * F, pl.y + SUN_WY / SL * F, pl.z + SUN_WZ / SL * F);
}

// ── Test d'occlusion par le terrain ──────────────────────
// Vrai si un relief masque le point (tx,ty,tz) vu depuis la caméra.
// Le rendu n'a pas de z-buffer : sans ce test, les aéroports (dessinés
// APRÈS le terrain) se peignent « à travers » les montagnes.
// On échantillonne le sol le long de la ligne de visée caméra→cible.
function terrainOccluded(tx, ty, tz) {
  const dx = tx - cam.cx, dy = ty - cam.cy, dz = tz - cam.cz;
  const dist = Math.hypot(dx, dy);
  if (dist < 60) return false;                       // trop proche : rien entre nous
  const steps = clamp(dist / 200, 6, 24) | 0;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const gh = terrainH(cam.cx + dx * t, cam.cy + dy * t);
    if (gh > cam.cz + dz * t + 4) return true;       // le sol dépasse la ligne de visée → caché
  }
  return false;
}
