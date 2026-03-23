// terrain.js
// Module de génération de hauteur de terrain + océan.
const _tCache = new Map();

function _terrainRaw(x,z){
  const s=0.00075;
  let h=0;
  h+=Math.sin(x*s+1.31)*Math.cos(z*s*.73)*520;
  h+=Math.sin(x*s*1.7+4.2)*Math.cos(z*s*1.3+2.1)*280;
  h+=Math.sin(x*s*2.1+2.74)*Math.sin(z*s*1.87+0.41)*160;
  h+=Math.cos(x*s*3.3+1.55)*Math.sin(z*s*2.8+3.3)*95;
  h+=Math.cos(x*s*5.2+0.93)*Math.cos(z*s*4.31+1.12)*58;
  h+=Math.sin(x*s*7.8+3.1)*Math.cos(z*s*6.5+0.88)*36;
  h+=Math.sin(x*s*14+0.5)*Math.sin(z*s*11.5)*20;
  h+=Math.cos(x*s*26+2.2)*Math.cos(z*s*21+1.7)*10;
  h+=Math.sin(x*s*50+1.1)*Math.cos(z*s*44+2.3)*4;
  h+=Math.sin(x*s*95+0.7)*Math.cos(z*s*82+1.4)*1.8;

  if(h<0) h*=0.22;
  else if(h<60) h*=0.28;
  else if(h<140) h=16.8+(h-60)*0.85;
  else h=84+(h-140)*1.35;
  return h;
}

export function terrainH(x,z){
  const ck = `${x},${z}`;
  if(_tCache.has(ck)) return _tCache.get(ck);
  if(_tCache.size > 2048) _tCache.clear();
  const v = _terrainRaw(x,z);
  _tCache.set(ck, v);
  return v;
}

export function oceanDepth(x,z){
  const v = _terrainRaw(x,z);
  return v > 0 ? 0 : Math.min(80, (-v)*0.35 + 40);
}
