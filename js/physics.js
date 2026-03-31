// ══════════════════════════════════════════════════════════
// PHYSICS.JS — Moteur aérodynamique 6-DOF Cessna 172
//
// Axes corps : X = droite (aile), Y = avant (nez), Z = haut
// Taux angulaires corps :
//   p = roulis  (rotation autour de l'axe Y/avant)
//   q = tangage (rotation autour de l'axe X/droite)
//   r = lacet   (rotation autour de l'axe Z/haut)
//
// Les commandes créent des MOMENTS → changent p, q, r
// p, q, r → taux d'Euler → changent yaw, pitch, roll
// ══════════════════════════════════════════════════════════

function update(dt) {
  if (!started || crashed) return;
  const DT = Math.min(dt, 0.05);
  // Sous-pas pour stabilité numérique
  const N = Math.max(1, Math.ceil(DT / 0.012));
  const h = DT / N;
  for (let i = 0; i < N; i++) physStep(h);
}

function physStep(dt) {

  // ══ DÉTECTION DU SOL ══════════════════════════════════
  const rawGnd = terrainH(pl.x, pl.y);
  let gnd = rawGnd, onRunway = false;
  for (const ap of AIRPORTS) {
    const adx = pl.x - ap.wx, ady = pl.y - ap.wy;
    const halfLen = ap.len * 0.52 + 10, halfWid = ap.wid * 0.5 + 8;
    const ca = Math.cos(ap.hdg), sa = Math.sin(ap.hdg);
    const lx = adx * sa + ady * ca, ly = -adx * ca + ady * sa;
    if (Math.abs(lx) < halfLen && Math.abs(ly) < halfWid) {
      if (!ap._gz) ap._gz = runwayZ(ap);
      gnd = ap._gz; onRunway = true; break;
    }
  }
  const wheelZ = pl.z - GEAR_H;
  const onGround = wheelZ <= gnd + 0.5;
  pl.onGround = onGround;

  // ══ PRESSION DYNAMIQUE & EFFICACITÉ GOUVERNES ═════════
  const V = pl.speed;
  const qBar = Math.min(1.5, V * V / (80 * 80));
  const ctrlEff = Math.max(0.15, Math.min(1.2, qBar));

  // ══ SURFACES DE CONTRÔLE (rate-limited) ═══════════════
  // Les surfaces bougent progressivement vers leur cible
  // → animation fluide + inertie de commande
  const sRate = 4.0 * dt;

  // Profondeur (tangage)
  let eT = 0;
  if (K['ArrowUp'])   eT =  1;
  if (K['ArrowDown']) eT = -1;
  pl.elevator = moveToward(pl.elevator, eT, sRate);

  // Ailerons (roulis) — actifs en vol et à haute vitesse au sol
  let aT = 0;
  if (!onGround || V > 25) {
    if (K['ArrowLeft'])  aT =  1;
    if (K['ArrowRight']) aT = -1;
  }
  pl.aileron = moveToward(pl.aileron, aT, sRate);

  // Direction (lacet)
  let rT = 0;
  if (K['KeyQ'] || K['KeyA']) rT =  1;
  if (K['KeyE'] || K['KeyD']) rT = -1;
  pl.rudder = moveToward(pl.rudder, rT, sRate);

  // Gaz
  if (K['ShiftLeft'] || K['ShiftRight'])
    pl.throttle = Math.min(1, pl.throttle + 0.28 * dt);
  if (K['ControlLeft'] || K['ControlRight'])
    pl.throttle = Math.max(0, pl.throttle - 0.28 * dt);

  // Freins au sol
  if (K['KeyB'] && onGround)
    pl.speed = Math.max(0, pl.speed - pl.speed * 0.8 * dt);

  // Stabilisateur automatique (Space)
  if (K['Space']) {
    pl.p *= (1 - 2.5 * dt);
    pl.q *= (1 - 2.5 * dt);
    pl.r *= (1 - 2.0 * dt);
    pl.pitch *= (1 - 2.5 * dt);
    pl.roll  *= (1 - 3.0 * dt);
  }

  // ══ VOLETS ════════════════════════════════════════════
  const flapCL  = flaps * 0.15;
  const flapCD  = flaps * flaps * 0.008;
  const stallSpd = STALL_SPD_CLEAN - flaps * 3.2;

  // ══ ANGLE D'ATTAQUE ═══════════════════════════════════
  const fpa = (V > 5) ? Math.atan2(pl.vz, V * 0.20) : 0;
  const aoa = pl.pitch - fpa * 0.6;

  // Estimation du dérapage (sideslip) depuis le taux de lacet
  const sideslip = (V > 5) ? Math.atan2(pl.r * 3.0, V) : 0;

  // Buffet pré-décrochage
  const nearStall = V < stallSpd + 12 && V > stallSpd - 10 && !onGround;
  const stallInt  = nearStall ? (1 - clamp((V - stallSpd + 5) / 15, 0, 1)) : 0;
  const buffet    = stallInt * (Math.random() - 0.5) * 0.02;

  // ══════════════════════════════════════════════════════
  // MOMENTS AÉRODYNAMIQUES → ACCÉLÉRATIONS ANGULAIRES
  //
  // C'est le cœur du modèle 6-DOF :
  // Chaque axe reçoit des couples provenant de :
  //   1. Commandes de vol (gouvernes)
  //   2. Amortissement (résiste à la rotation)
  //   3. Stabilité statique (rappel vers l'équilibre)
  //   4. Couplages inter-axes (lacet inverse, etc.)
  // ══════════════════════════════════════════════════════

  // ── TANGAGE (moment autour de X / axe droite) ────────
  const Mq =
      pl.elevator * 2.8 * ctrlEff         // profondeur
    - pl.q * 5.0 * ctrlEff                // amortissement en tangage
    - aoa * 1.2 * ctrlEff                 // stabilité longitudinale (CG devant CP)
    + buffet * 0.3                         // buffet de décrochage
    - flaps * 0.04 * ctrlEff;             // moment piqueur des volets

  // ── ROULIS (moment autour de Y / axe avant) ──────────
  const Ml =
      pl.aileron * 3.2 * ctrlEff          // ailerons
    - pl.p * 4.5 * ctrlEff                // amortissement en roulis
    - sideslip * 0.8 * ctrlEff            // effet dièdre → stabilité spirale
    + pl.r * 0.15 * Math.min(1, V * 0.01) * ctrlEff  // couplage lacet→roulis
    + buffet * 0.5;                        // buffet

  // ── LACET (moment autour de Z / axe haut) ────────────
  const yawMul = onGround ? 3.5 : 1.0;   // direction au sol plus efficace
  let Mn =
      pl.rudder * 1.5 * ctrlEff * yawMul  // gouverne de direction
    - pl.r * 2.5 * ctrlEff                // amortissement en lacet
    - sideslip * 0.5 * ctrlEff            // stabilité de route (girouette → oppose le dérapage)
    + pl.aileron * 0.25 * ctrlEff         // lacet inverse des ailerons
    - pl.p * 0.04 * ctrlEff;              // couplage roulis→lacet

  // ── VIRAGE PAR INCLINAISON ────────────────────────────
  // En vol, l'inclinaison crée un virage coordonné via la
  // composante latérale de la gravité.
  // Inclinaison GAUCHE (roll > 0) → virage GAUCHE (r < 0)
  // On rappelle r vers le taux de virage coordonné Ω = −g·tan(φ)/V
  if (!onGround && V > 5) {
    const cosR_safe = Math.max(0.25, Math.abs(Math.cos(pl.roll)));
    const coordR = -GRAV * Math.sin(pl.roll) / (cosR_safe * Math.max(15, V * 0.25));
    Mn += clamp((coordR - pl.r) * 3.0 * ctrlEff, -2.0, 2.0);
  }

  // ══ INTÉGRATION DES TAUX ANGULAIRES ═══════════════════
  const Ix = 1.0, Iy = 1.2, Iz = 1.5;  // moments d'inertie normalisés
  pl.q += (Mq / Iy) * dt;   // tangage
  pl.p += (Ml / Ix) * dt;   // roulis
  pl.r += (Mn / Iz) * dt;   // lacet

  // Limiter les taux angulaires (sécurité)
  pl.p = clamp(pl.p, -3.5, 3.5);
  pl.q = clamp(pl.q, -2.5, 2.5);
  pl.r = clamp(pl.r, -2.5, 2.5);

  // ══════════════════════════════════════════════════════
  // ÉQUATIONS CINÉMATIQUES D'EULER
  //
  // Convertit les taux angulaires corps (p, q, r)
  // en taux de variation des angles d'Euler (roll, pitch, yaw)
  //
  //   φ̇ = p − (q·sin(φ) + r·cos(φ))·tan(θ)
  //   θ̇ = q·cos(φ) − r·sin(φ)
  //   ψ̇ = (q·sin(φ) + r·cos(φ)) / cos(θ)
  // ══════════════════════════════════════════════════════
  const sinR = Math.sin(pl.roll),  cosR = Math.cos(pl.roll);
  const sinP = Math.sin(pl.pitch), cosP = Math.max(0.01, Math.cos(pl.pitch));
  const tanP = sinP / cosP;

  const qSinR_rCosR = pl.q * sinR + pl.r * cosR;

  const dRoll  = clamp(pl.p - qSinR_rCosR * tanP, -4.0, 4.0);
  const dPitch = clamp(pl.q * cosR - pl.r * sinR, -3.0, 3.0);
  const dYaw   = clamp(qSinR_rCosR / cosP, -3.0, 3.0);

  pl.roll  += dRoll  * dt;
  pl.pitch += dPitch * dt;
  pl.yaw   += dYaw   * dt;

  // Limites d'attitude
  pl.pitch = clamp(pl.pitch, -0.50, 0.75);
  pl.roll  = clamp(pl.roll, -Math.PI * 0.48, Math.PI * 0.48);

  // ══════════════════════════════════════════════════════
  // FORCES AÉRODYNAMIQUES → VITESSE
  // ══════════════════════════════════════════════════════

  // ── Poussée ───────────────────────────────────────────
  const propEff = Math.max(0.4, 1.0 - V / 320);
  const thrust  = pl.throttle * MAX_THR * propEff;

  // ── Portance ──────────────────────────────────────────
  const stallMargin = (V - stallSpd + 5) / 15;
  const stallFac = clamp(stallMargin, 0, 1);
  const aoaFac = (aoa >= 0)
    ? Math.max(0, 1 + (aoa + flapCL) * CL_ALPHA) * stallFac
    : (1 + aoa * CL_ALPHA);
  const cosRoll = Math.max(0.15, Math.cos(pl.roll));
  const lift    = LIFT_K * V * V * cosRoll * aoaFac;
  const liftGnd = LIFT_K * V * V * cosRoll
                * Math.max(0, 1 + (aoa + flapCL) * CL_ALPHA) * stallFac;

  // ── Traînée ───────────────────────────────────────────
  const nG = 1.0 / cosRoll;
  const inducedDrag = aoa * aoa * V * 0.015 * nG * nG;
  const bankDrag    = (nG - 1.0) * V * 0.035;
  const profileDrag = 0.050 * V + 0.00020 * V * V;
  const flapDragF   = flapCD * V * V * 0.0003;
  const sideDrag    = Math.abs(sideslip) * V * 0.08;  // traînée de dérapage
  const totalDrag   = profileDrag + inducedDrag + bankDrag + flapDragF + sideDrag;

  // ── Conservation d'énergie ────────────────────────────
  const climbAng = (V > 5)
    ? Math.asin(clamp(pl.vz / (V * 0.20 + 0.01), -1, 1)) : 0;
  const energyEx = GRAV * Math.sin(climbAng) * 0.35;

  // ── Intégration vitesse ───────────────────────────────
  pl.speed = Math.max(0, V + (thrust - totalDrag + energyEx) * dt);
  if (pl.speed > 280) pl.speed = 280;

  // ══ MOUVEMENT HORIZONTAL ══════════════════════════════
  const cosY = Math.cos(pl.yaw), sinY = Math.sin(pl.yaw);
  const hSpeed = pl.speed * Math.cos(pl.pitch);
  pl.x += sinY * hSpeed * dt * 1.75;
  pl.y += cosY * hSpeed * dt * 1.75;

  // ══ DYNAMIQUE VERTICALE ═══════════════════════════════
  if (!onGround) {
    // Vz cible = composante pitch + excès/déficit de portance
    const vzFromPitch = V * Math.sin(pl.pitch) * 0.20;
    const liftAccel   = (lift - GRAV) * 0.45;
    const tau   = 0.8;
    const alpha = 1 - Math.exp(-dt / tau);
    const vzTgt = vzFromPitch + liftAccel;
    pl.vz += (vzTgt - pl.vz) * alpha;

    // Buffet de décrochage
    pl.vz += buffet;

    // Effet de sol (< 40 unités AGL)
    const hAGL = pl.z - gnd;
    if (hAGL < 40 && hAGL > 0) {
      const ge = 0.12 * (1 - hAGL / 40) * (1 - hAGL / 40);
      pl.vz += ge * dt * 6;
    }

    // Intégration altitude
    pl.z += pl.vz * dt * 5;

    // Stabilité résiduelle (faible — le gros est dans les moments)
    pl.pitch += (0 - pl.pitch) * 0.04 * ctrlEff * dt;
    pl.roll  += (0 - pl.roll)  * 0.03 * dt;

  } else {
    // ══ CONTACT SOL ═════════════════════════════════════
    // Crash : impact vertical trop fort
    if (pl.vz < -3.2) {
      crashed = true;
      document.getElementById('scr-c').style.display = 'flex';
      return;
    }
    // Crash : roulis trop fort à vitesse
    if (Math.abs(pl.roll) > 0.48 && V > 28) {
      crashed = true;
      document.getElementById('scr-c').style.display = 'flex';
      return;
    }

    // Décollage : portance > poids
    if (liftGnd > GRAV) {
      pl.vz = (liftGnd - GRAV) * 0.6;
      pl.z  = gnd + GEAR_H + 0.6;
    } else {
      pl.z  = gnd + GEAR_H;
      pl.vz = Math.max(pl.vz * 0.5, 0);
    }

    // Friction de roulage
    const braking = K['ControlLeft'] || K['ControlRight'] || K['KeyB'];
    const airBrake    = V > 0 ? profileDrag * 0.55 : 0;
    const wheelFric   = V * (braking ? 0.18 : 0.015);
    pl.speed = Math.max(0, pl.speed - (airBrake + wheelFric) * dt);

    // Amortissement au sol (fort pour empêcher oscillations)
    pl.roll *= Math.pow(0.86, dt * 60);
    if (V < 65) pl.pitch *= Math.pow(0.95, dt * 60);
    pl.p *= Math.pow(0.60, dt * 60);
    pl.q *= Math.pow(0.70, dt * 60);
    pl.r *= Math.pow(0.75, dt * 60);
  }

  pl.z = Math.min(40000, pl.z);

  // ══ PROTECTION NaN ══════════════════════════════════════
  if (isNaN(pl.speed) || isNaN(pl.x) || isNaN(pl.roll)) {
    pl.speed = 0; pl.vz = 0;
    pl.p = 0; pl.q = 0; pl.r = 0;
    pl.elevator = 0; pl.aileron = 0; pl.rudder = 0;
  }
}
