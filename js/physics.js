// ══════════════════════════════════════════════════════════
// PHYSICS.JS — Modèle de vol « énergie + géométrie » (réécrit)
//
// Objectif : stable, prévisible et FLUIDE, sans les divergences du
// vieux modèle 6-DOF à couplages.
//
// Principes :
//   1. Les commandes pilotent des TAUX (roulis / tangage) amortis
//      → réponse douce, jamais d'emballement.
//   2. La trajectoire suit le nez : vz = V·sin(assiette) · échelle
//      → cohérence parfaite entre ce qu'on voit et ce qu'on fait.
//   3. La vitesse évolue par poussée − traînée ± gravité de pente
//      → vrai échange énergie (monter coûte de la vitesse, piquer en gagne).
//   4. Virage coordonné : l'inclinaison fait tourner (taux ∝ tan φ / V).
//   5. Décrochage progressif et récupérable, atterrissages indulgents.
//
// Repère monde : x = est, y = nord, z = altitude. yaw=0 → cap nord.
// ══════════════════════════════════════════════════════════

const WS    = 1.75;   // échelle monde : unités de distance par nœud·seconde
const G_ACC = 9.0;    // gravité de pente (nœuds/s perdus en montée à 90°)

function update(dt) {
  if (!started || crashed) return;
  const DT = Math.min(dt, 0.05);
  const N = Math.max(1, Math.ceil(DT / 0.02));   // sous-pas → stabilité
  const h = DT / N;
  for (let i = 0; i < N; i++) physStep(h);
}

function crashNow() {
  crashed = true;
  document.getElementById('scr-c').style.display = 'flex';
}

function physStep(dt) {

  // ══ ALTITUDE DU SOL (terrain ou piste) ════════════════
  let gnd = terrainH(pl.x, pl.y);
  for (const ap of AIRPORTS) {
    const adx = pl.x - ap.wx, ady = pl.y - ap.wy;
    const halfLen = ap.len * 0.52 + 12, halfWid = ap.wid * 0.5 + 10;
    const ca = Math.cos(ap.hdg), sa = Math.sin(ap.hdg);
    const lx = adx * sa + ady * ca, ly = -adx * ca + ady * sa;
    if (Math.abs(lx) < halfLen && Math.abs(ly) < halfWid) {
      if (ap._gz == null) ap._gz = runwayZ(ap);
      gnd = ap._gz; break;
    }
  }
  const onGround = (pl.z - GEAR_H) <= gnd + 0.4;
  pl.onGround = onGround;

  const V = pl.speed;
  // Efficacité des gouvernes ∝ vitesse (molles à l'arrêt, fermes en vol)
  const ctrlEff = clamp(V / 55, 0.12, 1.25);

  // ══ LECTURE & LISSAGE DES COMMANDES ═══════════════════
  const sRate = 3.4 * dt;   // vitesse de braquage des gouvernes (animation + douceur)

  let eT = 0;
  if (K['ArrowUp']   || K['s']) eT =  1;   // cabrer
  if (K['ArrowDown'] || K['z']) eT = -1;   // piquer
  pl.elevator = moveToward(pl.elevator, eT, sRate);

  let aT = 0;
  if (K['ArrowLeft']  || K['q']) aT =  1;   // roulis gauche
  if (K['ArrowRight'] || K['d']) aT = -1;   // roulis droite
  pl.aileron = moveToward(pl.aileron, aT, sRate);

  let rT = 0;
  if (K['a']) rT =  1;   // palonnier gauche
  if (K['e']) rT = -1;   // palonnier droite
  pl.rudder = moveToward(pl.rudder, rT, sRate);

  if (K['ShiftLeft']   || K['ShiftRight'])   pl.throttle = Math.min(1, pl.throttle + 0.40 * dt);
  if (K['ControlLeft'] || K['ControlRight']) pl.throttle = Math.max(0, pl.throttle - 0.40 * dt);

  const stabilize = !!K['Space'];

  // ══ VOLETS ════════════════════════════════════════════
  const stallSpd = STALL_SPD_CLEAN - flaps * 3.2;   // 48 → 38 kt selon les volets
  const flapDrag = flaps * flaps * 0.00055;

  // ══ ATTITUDE ══════════════════════════════════════════
  if (!onGround) {

    // ── ROULIS : commande directe du taux + auto-mise à plat douce ──
    pl.roll += pl.aileron * 1.7 * ctrlEff * dt;
    if (aT === 0 || stabilize) {
      const lvl = stabilize ? 2.4 : 0.5;   // mains libres : se remet à plat lentement
      pl.roll += (0 - pl.roll) * lvl * dt;  // (les virages tiennent tant qu'on maintient)
    }
    pl.roll = clamp(pl.roll, -1.25, 1.25);

    // ── TANGAGE : commande du taux + stabilité longitudinale ──
    pl.pitch += pl.elevator * 0.85 * ctrlEff * dt;
    if (eT === 0 || stabilize) {
      const ps = stabilize ? 2.2 : 0.6;    // tend doucement vers le vol en palier
      pl.pitch += (0 - pl.pitch) * ps * dt;
    }
    // Décrochage : sous la vitesse mini, le nez s'abat (récupérable)
    if (V < stallSpd) {
      const sev = clamp((stallSpd - V) / stallSpd, 0, 1);
      pl.pitch += (-0.45 - pl.pitch) * sev * 1.1 * dt;
    }
    pl.pitch = clamp(pl.pitch, -0.6, 0.55);

    // ── LACET : virage coordonné (inclinaison) + palonnier ──
    const turnRate  = -0.55 * Math.tan(clamp(pl.roll, -1.2, 1.2)) * clamp(V / 90, 0.2, 1.4);
    const rudderYaw = -pl.rudder * 0.5 * ctrlEff;
    pl.yaw += (turnRate + rudderYaw) * dt;
    pl.roll += pl.rudder * 0.15 * ctrlEff * dt;   // effet dièdre (palonnier → léger roulis)

  } else {

    // ── AU SOL ──
    pl.roll += (0 - pl.roll) * 6 * dt;            // train → ailes à plat
    // Rotation : tirer sur le manche lève le nez si on roule assez vite
    const pTgt = (V > stallSpd * 0.8 && pl.elevator > 0) ? pl.elevator * 0.18 : 0;
    pl.pitch += (pTgt - pl.pitch) * 4 * dt;
    // Direction au sol (roue avant) au palonnier
    pl.yaw += -pl.rudder * 0.8 * clamp(V / 35, 0, 1) * dt;
  }

  // ══ VITESSE (bilan d'énergie) ═════════════════════════
  const densAlt = Math.max(0.35, 1 - pl.z / 26000);          // raréfaction de l'air en altitude
  const propEff = Math.max(0.35, 1 - V / 240);               // l'hélice « patine » à grande vitesse
  const thrust  = pl.throttle * 26 * propEff * densAlt;       // poussée (kt/s)
  const drag    = 0.020 * V + 0.00090 * V * V                 // traînée parasite + profil
                + flapDrag * V * V                            // volets
                + Math.abs(pl.roll)  * V * 0.004              // traînée induite en virage
                + Math.abs(pl.pitch) * V * 0.003;             // traînée d'incidence
  const gravPente = -G_ACC * Math.sin(pl.pitch);             // monter coûte, descendre gagne
  pl.speed = clamp(V + (thrust - drag + gravPente) * dt, 0, 210);

  // ══ DÉPLACEMENT HORIZONTAL (suit le cap & l'assiette) ══
  const Vn   = pl.speed;
  const cosP = Math.cos(pl.pitch);
  const cosY = Math.cos(pl.yaw), sinY = Math.sin(pl.yaw);
  const hSpeed = Vn * cosP * WS;
  pl.x += sinY * hSpeed * dt;
  pl.y += cosY * hSpeed * dt;

  // ══ DYNAMIQUE VERTICALE ═══════════════════════════════
  if (!onGround) {
    // Portance disponible : 1 en vol normal, 0 en plein décrochage
    const liftOK = clamp((Vn - stallSpd + 6) / 12, 0, 1);
    // Montée géométrique (le nez) pondérée par la portance
    const geomVZ   = Vn * Math.sin(pl.pitch) * WS * (0.55 + 0.45 * liftOK);
    // En virage, la portance verticale diminue → incite à tirer un peu
    const bankSink = (1 - Math.cos(pl.roll)) * Vn * WS * 0.30;
    // Décrochage : enfoncement
    const stallSink = (1 - liftOK) * 20;
    let targetVZ = geomVZ - bankSink - stallSink;

    // Effet de sol : adoucit le taux de descente près du sol (arrondi facile)
    const hAGL = pl.z - gnd;
    if (hAGL < 30 && targetVZ < 0) targetVZ *= 0.55 + 0.45 * (hAGL / 30);

    // Inertie verticale (lissage premier ordre)
    pl.vz += (targetVZ - pl.vz) * (1 - Math.exp(-dt / 0.5));
    pl.z  += pl.vz * dt;

    // Contact / atterrissage
    if (pl.z - GEAR_H <= gnd) {
      const hardSink = pl.vz < -34;
      const wingStrike = Math.abs(pl.roll) > 0.75;
      pl.z = gnd + GEAR_H;
      if (hardSink || wingStrike) { crashNow(); return; }
      pl.vz = 0;
    }
  } else {
    // Au sol : collé à la piste, sauf décollage
    pl.vz = 0;
    pl.z  = gnd + GEAR_H;

    const liftSpeed = stallSpd * 1.05;
    if (Vn > liftSpeed && pl.pitch > 0.03) {
      // Assez de vitesse + nez levé → on quitte le sol franchement
      pl.vz = (Vn - liftSpeed) * 0.6 * WS * Math.sin(pl.pitch + 0.04);
      pl.z  = gnd + GEAR_H + 0.6;
    }

    // Freins / friction de roulage
    const braking = K['KeyB'] || K['ControlLeft'] || K['ControlRight'];
    const fric = Vn * (braking ? 0.55 : 0.045);
    pl.speed = Math.max(0, pl.speed - fric * dt);
  }

  pl.z = Math.min(40000, pl.z);

  // ══ GARDE-FOU NUMÉRIQUE ═══════════════════════════════
  if (isNaN(pl.speed) || isNaN(pl.x) || isNaN(pl.z) || isNaN(pl.roll)) {
    pl.speed = 0; pl.vz = 0; pl.pitch = 0; pl.roll = 0;
  }
}
