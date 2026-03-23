// improved-terrain.js
// Module de génération de terrain amélioré avec plus de variété et de détails

export class ImprovedTerrain {
  constructor() {
    this.cache = new Map();
    this.cacheSize = 3000;
    // Couches de bruit à différentes fréquences pour plus de variation
    this.octaves = [
      { freq: 0.00045, amp: 650, name: 'massifs' },
      { freq: 0.00085, amp: 380, name: 'chaînes' },
      { freq: 0.0016, amp: 200, name: 'collines' },
      { freq: 0.0031, amp: 110, name: 'moyennes' },
      { freq: 0.006, amp: 65, name: 'petites' },
      { freq: 0.012, amp: 32, name: 'vallons' },
      { freq: 0.025, amp: 18, name: 'détail1' },
      { freq: 0.05, amp: 8, name: 'détail2' },
      { freq: 0.1, amp: 3, name: 'détail3' },
    ];
  }

  terrainRaw(x, z) {
    let h = 0;
    // Combinaison multi-octave Perlin-like
    for (const oct of this.octaves) {
      h += Math.sin(x * oct.freq + 1.31) * Math.cos(z * oct.freq * 0.73 + 0.5) * oct.amp;
      h += Math.cos(x * oct.freq * 0.8 + 2.1) * Math.sin(z * oct.freq * 0.65 + 1.2) * (oct.amp * 0.6);
    }

    // Ajouter de la variation de type "Voronoï-ish" pour plus de charactère
    const cellX = Math.floor(x * 0.0001);
    const cellZ = Math.floor(z * 0.0001);
    const cellH = Math.sin(cellX * 73 + cellZ * 149) * Math.cos(cellX * 89 + cellZ * 61) * 40;
    h += cellH;

    // Fonction de transfert améliorée avec plus de niveaux
    if (h < -50) h = h * 0.18; // océan profond très sombre
    else if (h < 0) h = h * 0.24; // océan peu profond
    else if (h < 15) h = h * 0.30; // littoral très plat
    else if (h < 50) h = 4.5 + (h - 15) * 0.32; // transition plage vers prairie
    else if (h < 120) h = 15.7 + (h - 50) * 0.82; // prairie douce
    else if (h < 220) h = 82.4 + (h - 120) * 1.1; // collines moyennes
    else if (h < 380) h = 192 + (h - 220) * 1.25; // montagnes
    else h = 391 + (h - 380) * 1.45; // pics très escarpés

    return Math.max(-80, Math.min(700, h));
  }

  terrainH(x, z) {
    const key = `${Math.round(x / 2) * 2},${Math.round(z / 2) * 2}`;
    if (this.cache.has(key)) return this.cache.get(key);
    if (this.cache.size > this.cacheSize) this.cache.clear();

    const v = this.terrainRaw(x, z);
    this.cache.set(key, v);
    return v;
  }

  // Texture generation based on height and position
  getTerrainType(h) {
    if (h < 1) return 'ocean';
    if (h < 5) return 'shallow';
    if (h < 14) return 'beach';
    if (h < 35) return 'coastal_grass';
    if (h < 100) return 'grassland';
    if (h < 180) return 'forest';
    if (h < 280) return 'alpine';
    if (h < 450) return 'rocky';
    return 'snow';
  }

  // Enhanced biome color with better shading
  biomeColor(h, wx, wy, diffuse, fogF, nx, ny, nz) {
    let r, g, b;
    const FOG_R = 182, FOG_G = 205, FOG_B = 228;

    const terrainType = this.getTerrainType(h);

    if (terrainType === 'ocean') {
      r = this.lerp(20, 32, Math.min(1, -h / 50));
      g = this.lerp(45, 72, Math.min(1, -h / 50));
      b = this.lerp(95, 138, Math.min(1, -h / 50));
    } else if (terrainType === 'shallow') {
      const k = h / 5;
      r = this.lerp(45, 210, k);
      g = this.lerp(100, 190, k);
      b = this.lerp(150, 140, k);
      const ripple = Math.sin(wx * 0.2 + 1.1) * Math.cos(wy * 0.18 + 0.8) * 5;
      r += ripple;
      g += ripple * 0.8;
    } else if (terrainType === 'beach') {
      const k = (h - 5) / 9;
      r = this.lerp(220, 190, k);
      g = this.lerp(200, 170, k);
      b = this.lerp(140, 110, k);
      const grain = Math.sin(wx * 0.3 + 2.1) * Math.cos(wy * 0.25 + 1.4) * 8;
      r += grain;
      g += grain * 0.7;
      b += grain * 0.3;
    } else if (terrainType === 'coastal_grass') {
      const k = (h - 14) / 21;
      r = this.lerp(120, 95, k) * diffuse + 25 * (1 - diffuse);
      g = this.lerp(165, 140, k) * diffuse + 35 * (1 - diffuse);
      b = this.lerp(55, 40, k) * diffuse + 15 * (1 - diffuse);
    } else if (terrainType === 'grassland') {
      const k = (h - 35) / 65;
      r = this.lerp(85, 70, k) * diffuse + 18 * (1 - diffuse);
      g = this.lerp(155, 125, k) * diffuse + 28 * (1 - diffuse);
      b = this.lerp(42, 32, k) * diffuse + 12 * (1 - diffuse);
      
      const fieldType = Math.sin(wx * 0.065 + 3.1) * Math.sin(wy * 0.058 + 0.7);
      if (fieldType > 0.4) {
        g += fieldType * 22;
        r += fieldType * 4;
      } else if (fieldType < -0.3) {
        g -= Math.abs(fieldType) * 18;
        r -= Math.abs(fieldType) * 10;
        b += 8;
      }
    } else if (terrainType === 'forest') {
      const k = (h - 100) / 80;
      r = this.lerp(35, 55, k) * diffuse + 12 * (1 - diffuse);
      g = this.lerp(100, 90, k) * diffuse + 22 * (1 - diffuse);
      b = this.lerp(22, 35, k) * diffuse + 10 * (1 - diffuse);
      
      const canopy = Math.sin(wx * 0.045 + 2.4) * Math.cos(wy * 0.040 + 1.1) * 0.5 + 0.5;
      g += canopy * 18 * diffuse;
      r += canopy * 8 * diffuse;
    } else if (terrainType === 'alpine') {
      const k = (h - 180) / 100;
      r = this.lerp(100, 150, k) * diffuse + 20 * (1 - diffuse);
      g = this.lerp(120, 140, k) * diffuse + 22 * (1 - diffuse);
      b = this.lerp(50, 95, k) * diffuse + 18 * (1 - diffuse);
      
      const rock = Math.sin(wx * 0.032 + 1.6) * Math.sin(wy * 0.029 + 0.4) * 0.5 + 0.5;
      r += rock * 28 * k;
      g += rock * 24 * k;
      b += rock * 18 * k;
    } else if (terrainType === 'rocky') {
      const k = (h - 280) / 170;
      r = this.lerp(130, 190, k) * diffuse + 20 * (1 - diffuse);
      g = this.lerp(120, 175, k) * diffuse + 18 * (1 - diffuse);
      b = this.lerp(105, 160, k) * diffuse + 16 * (1 - diffuse);
      
      const strat = Math.sin(h * 0.08 + wx * 0.007) * 15 * (1 - fogF);
      r += strat;
      g += strat * 0.85;
      b += strat * 0.7;
    } else { // snow
      const k = Math.min(1, (h - 450) / 150);
      const snowBase = this.lerp(245, 255, k);
      r = this.lerp(snowBase, 255, k) * diffuse + this.lerp(60, 75, k) * (1 - diffuse);
      g = this.lerp(snowBase + 5, 255, k) * diffuse + this.lerp(65, 80, k) * (1 - diffuse);
      b = this.lerp(snowBase + 25, 255, k) * diffuse + this.lerp(80, 100, k) * (1 - diffuse);
      if (diffuse < 0.35) {
        r -= 16;
        g -= 6;
        b += 22;
      }
    }

    // Ambient occlusion on steep slopes
    if (h > 20) {
      const slope = Math.sqrt(Math.max(0, 1 - nz * nz));
      const ao = slope * 0.45;
      r *= (1 - ao * 0.95);
      g *= (1 - ao * 0.92);
      b *= (1 - ao * 0.88);
    }

    // Atmospheric fog blend
    const fogTint = fogF > 0.4 ? (fogF - 0.4) * 1.6 : 0;
    r = r * (1 - fogF) + FOG_R * fogF + fogTint * 12;
    g = g * (1 - fogF) + FOG_G * fogF - fogTint * 3;
    b = b * (1 - fogF) + FOG_B * fogF - fogTint * 6;

    return [
      Math.max(0, Math.min(255, Math.round(r))),
      Math.max(0, Math.min(255, Math.round(g))),
      Math.max(0, Math.min(255, Math.round(b)))
    ];
  }

  lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  oceanDepth(x, z) {
    const v = this.terrainRaw(x, z);
    return v > 0 ? 0 : Math.min(100, (-v) * 0.4 + 50);
  }
}

export const improvedTerrain = new ImprovedTerrain();
