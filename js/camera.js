import { pl } from './state.js';

export function getCam(camMode){
  if(camMode===0){
    return { cx:pl.x, cy:pl.y, cz:pl.z+3.6, cyaw:pl.yaw, cpitch:pl.pitch, croll:pl.roll };
  }
  if(camMode===1){
    const behind=40, above=12;
    const cosY=Math.cos(pl.yaw), sinY=Math.sin(pl.yaw);
    const cosPi=Math.cos(pl.pitch);
    return {
      cx: pl.x - sinY*behind*cosPi,
      cy: pl.y - cosY*behind*cosPi,
      cz: pl.z + above - sinY*behind*Math.sin(pl.pitch),
      cyaw:pl.yaw, cpitch:0, croll:0
    };
  }
  const perpX=Math.cos(pl.yaw), perpY=-Math.sin(pl.yaw);
  return {
    cx: pl.x + perpX*65,
    cy: pl.y + perpY*65,
    cz: pl.z + 8,
    cyaw: pl.yaw - Math.PI/2, cpitch: 0, croll: 0
  };
}

export function project(cam, wx, wy, wz, W, H){
  let dx=wx-cam.cx, dy=wy-cam.cy, dz=wz-cam.cz;
  const cY=Math.cos(-cam.cyaw), sY=Math.sin(-cam.cyaw);
  let ax=dx*cY+dy*sY, ay=-dx*sY+dy*cY, az=dz;
  const cP=Math.cos(-cam.cpitch), sP=Math.sin(-cam.cpitch);
  let bx=ax, by=ay*cP-az*sP, bz=ay*sP+az*cP;
  const cR=Math.cos(cam.croll), sR=Math.sin(cam.croll);
  let fx=bx*cR+bz*sR, fy=by, fz=-bx*sR+bz*cR;
  if(fy<2.0) return null;
  const FOV=Math.min(W,H)*0.72;
  return { sx:W/2+fx/fy*FOV, sy:H/2-fz/fy*FOV, d:fy };
}
