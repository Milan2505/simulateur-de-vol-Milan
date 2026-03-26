// ══════════════════════════════════════════════════════════
// PHYSICS.JS — Moteur physique aérodynamique C172
// ══════════════════════════════════════════════════════════

function update(dt){
  if(!started||crashed) return;
  const DT=Math.min(dt,.05);

  // ── SOL ─────────────────────────────────────────────
  const rawGnd=terrainH(pl.x,pl.y);
  let gnd=rawGnd;
  let onRunway=false;
  for(const ap of AIRPORTS){
    const adx=pl.x-ap.wx, ady=pl.y-ap.wy;
    const halfLen=ap.len*0.52+10, halfWid=ap.wid*0.5+8;
    const ca=Math.cos(ap.hdg), sa=Math.sin(ap.hdg);
    const lx=adx*sa+ady*ca, ly=-adx*ca+ady*sa;
    if(Math.abs(lx)<halfLen && Math.abs(ly)<halfWid){
      if(!ap._gz) ap._gz=runwayZ(ap);
      gnd=ap._gz; onRunway=true; break;
    }
  }
  const wheelZ=pl.z-GEAR_H;
  const onGround=wheelZ<=gnd+0.5;
  pl.onGround=onGround;

  // ── PRESSION DYNAMIQUE → efficacité contrôles ────────
  // À basse vitesse, les gouvernes sont peu efficaces
  const qBar=Math.min(1.5, pl.speed*pl.speed/(80*80)); // normalisé à 1.0 à 80kt
  const ctrlEff=Math.max(0.15, Math.min(1.2, qBar));   // min 15% même à l'arrêt (trim)

  // ── CONTRÔLES ───────────────────────────────────────
  const pitchR=0.55*ctrlEff, rollR=0.75*ctrlEff, yawR=0.28;
  if(K['ArrowUp'])   pl.pitch=Math.min( 0.75, pl.pitch+pitchR*DT);
  if(K['ArrowDown']) pl.pitch=Math.max(-0.50, pl.pitch-pitchR*DT);
  if(!onGround){
    if(K['ArrowLeft'])  pl.roll=Math.min( Math.PI*.48, pl.roll+rollR*DT);
    if(K['ArrowRight']) pl.roll=Math.max(-Math.PI*.48, pl.roll-rollR*DT);
  }
  const yawMul=onGround?3.5:1.0;
  if(K['KeyQ']||K['KeyA']) pl.yaw+=yawR*yawMul*DT;
  if(K['KeyE']||K['KeyD']) pl.yaw-=yawR*yawMul*DT;
  if(K['ShiftLeft']||K['ShiftRight'])    pl.throttle=Math.min(1,pl.throttle+.28*DT);
  if(K['ControlLeft']||K['ControlRight']) pl.throttle=Math.max(0,pl.throttle-.28*DT);
  if(K['KeyB']&&onGround) pl.speed=Math.max(0,pl.speed-pl.speed*0.8*DT); // freins au sol
  if(K['Space']){ pl.pitch*=(1-2.5*DT); pl.roll*=(1-3.0*DT); } // stabiliser progressif

  // ── VOLETS ──────────────────────────────────────────
  // Chaque cran : réduit Vstall de ~5kt, ajoute CL et traînée
  const flapCL=flaps*0.15;       // bonus portance par cran
  const flapCD=flaps*flaps*0.008; // traînée augmente quadratiquement
  const stallSpd=STALL_SPD_CLEAN - flaps*3.2; // ~48, 45, 42, 38 kt

  // ── POUSSÉE ─────────────────────────────────────────
  // Hélice : efficacité diminue à haute vitesse
  const propEff=Math.max(0.4, 1.0-pl.speed/320);
  const thrust=pl.throttle*MAX_THR*propEff;

  // ── ANGLE D'ATTAQUE RÉEL ────────────────────────────
  // AoA = pitch - angle de trajectoire (flight path angle)
  const fpa=(pl.speed>5)?Math.atan2(pl.vz, pl.speed*0.20):0;
  const aoa=pl.pitch-fpa*0.6; // AoA effectif

  // ── PORTANCE ────────────────────────────────────────
  // Décrochage progressif avec buffet
  const stallMargin=(pl.speed-stallSpd+5)/15; // 0 à stallSpd-5, 1.0 à stallSpd+10
  const stallFac=Math.max(0, Math.min(1, stallMargin));
  // Buffet pré-décrochage (oscillation aléatoire)
  const nearStall=pl.speed<stallSpd+12 && pl.speed>stallSpd-10 && !onGround;
  const buffet=nearStall?(Math.random()-0.5)*0.015*(1-stallFac):0;

  const aoaFac=(aoa>=0)
    ? Math.max(0, 1+(aoa+flapCL)*CL_ALPHA)*stallFac
    : (1+aoa*CL_ALPHA);
  const cosRoll=Math.max(0.15, Math.cos(pl.roll));
  const lift=LIFT_K*pl.speed*pl.speed*cosRoll*aoaFac;

  // Portance sol (pour décollage)
  const liftGnd=LIFT_K*pl.speed*pl.speed*cosRoll
               *Math.max(0,1+(aoa+flapCL)*CL_ALPHA)*stallFac;

  // ── TRAÎNÉE ─────────────────────────────────────────
  const nG=1.0/cosRoll;
  const inducedDrag=aoa*aoa*pl.speed*0.015*nG*nG;
  const bankDrag=(nG-1.0)*pl.speed*0.035;
  const profileDrag=0.050*pl.speed+0.00020*pl.speed*pl.speed;
  const flapDrag=flapCD*pl.speed*pl.speed*0.0003;

  // ── CONSERVATION D'ÉNERGIE ──────────────────────────
  // Monter coûte de l'énergie cinétique, descendre en rend
  // ΔV = -g·sin(γ)·dt  (γ = angle de montée)
  const climbAngle=(pl.speed>5)?Math.asin(Math.max(-1,Math.min(1,pl.vz/(pl.speed*0.20+0.01)))):0;
  const energyExchange=GRAV*Math.sin(climbAngle)*0.35;

  const totalDrag=profileDrag+inducedDrag+bankDrag+flapDrag;
  pl.speed=Math.max(0, pl.speed+(thrust-totalDrag+energyExchange)*DT);

  // Vitesse max structurelle (Vne=163kt pour C172, ici ~280 en unités jeu)
  if(pl.speed>280) pl.speed=280;

  // ── MOUVEMENT HORIZONTAL ─────────────────────────────
  const cosY=Math.cos(pl.yaw), sinY=Math.sin(pl.yaw);
  const hSpeed=pl.speed*Math.cos(pl.pitch);
  pl.x+=sinY*hSpeed*DT*1.75;
  pl.y+=cosY*hSpeed*DT*1.75;

  // ── VIRAGE COORDONNÉ ────────────────────────────────
  if(!onGround && pl.speed>5){
    const turnRate=Math.tan(pl.roll)*9.5/Math.max(20,pl.speed);
    pl.yaw-=turnRate*DT;
  }

  // ── DYNAMIQUE VERTICALE ─────────────────────────────
  if(!onGround){
    // Vz cible basé sur la portance vs gravité + composante pitch
    const vzFromPitch=pl.speed*Math.sin(pl.pitch)*0.20;
    const liftAccel=(lift-GRAV)*0.45; // excès ou déficit de portance

    // Convergence INERTIELLE vers le vz cible (tau ~0.8s)
    // Plus réaliste : l'avion ne change pas de vz instantanément
    const tau=0.8; // constante de temps en secondes
    const alpha=1-Math.exp(-DT/tau);
    const vzTarget=vzFromPitch+liftAccel;
    pl.vz=pl.vz+(vzTarget-pl.vz)*alpha;

    // Buffet de décrochage
    pl.vz+=buffet;
    pl.pitch+=buffet*0.3;

    // Effet de sol (<40u) : coussin d'air réduit la descente
    const hAGL=pl.z-gnd;
    if(hAGL<40 && hAGL>0){
      const ge=0.12*(1-hAGL/40)*(1-hAGL/40);
      pl.vz+=ge*DT*6;
    }

    // Intégration altitude
    pl.z+=pl.vz*DT*5;

    // Stabilité naturelle : retour LENT au trim (pas instantané)
    // Un vrai avion est stable en tangage (CG devant CP)
    const pitchStab=0.12*ctrlEff; // plus stable à haute vitesse
    const rollStab=0.08;
    pl.pitch+=(0-pl.pitch)*pitchStab*DT; // converge vers 0 (trim)
    pl.roll+=(0-pl.roll)*rollStab*DT;    // ailes à plat

    // Lacet adverse en roulis (l'aile qui monte traîne plus)
    if(Math.abs(pl.roll)>0.05 && pl.speed>20){
      pl.yaw-=pl.roll*0.015*DT*ctrlEff;
    }

  } else {
    // ── CONTACT SOL ─────────────────────────────────────
    if(pl.vz<-3.2){
      crashed=true; document.getElementById('scr-c').style.display='flex'; return;
    }
    if(Math.abs(pl.roll)>0.48 && pl.speed>28){
      crashed=true; document.getElementById('scr-c').style.display='flex'; return;
    }

    // Décollage : portance > poids
    if(liftGnd>GRAV){
      const liftExcess=liftGnd-GRAV;
      pl.vz=liftExcess*0.6;
      pl.z=gnd+GEAR_H+0.6;
    } else {
      pl.z=gnd+GEAR_H;
      pl.vz=Math.max(pl.vz*0.5, 0); // amorti au sol, pas reset brutal
    }

    // Friction de roulage
    const braking=K['ControlLeft']||K['ControlRight']||K['KeyB'];
    const airBrake=(pl.speed>0?profileDrag*0.55:0);
    const wheelFriction=pl.speed*(braking?0.18:0.015);
    pl.speed=Math.max(0,pl.speed-(airBrake+wheelFriction)*DT);

    // Roulis → 0, pitch → 0 au sol
    pl.roll*=Math.pow(0.86,DT*60);
    if(pl.speed<65) pl.pitch*=Math.pow(0.95,DT*60);
  }

  pl.z=Math.min(40000,pl.z);
}
