export const state = {
  started:false,
  crashed:false,
  camMode:0,
  pl: { x:0,y:0,z:600,yaw:0,pitch:0,roll:0,speed:0,throttle:0,vz:0 },
  GEAR_H:4.9,
  VSCALE:12,
};

export function resetPlane(AIRPORTS, terrainH){
  const ap=AIRPORTS[0];
  const cx=Math.sin(ap.hdg), cy=Math.cos(ap.hdg);
  const offset=ap.len/2-30;
  const sx=ap.wx - cx*offset;
  const sy=ap.wy - cy*offset;
  if(!ap._gz){
    const acx=Math.sin(ap.hdg),acy=Math.cos(ap.hdg);
    const apx=-acy,apy=acx;
    const ahl=ap.len/2,ahw=ap.wid/2;
    let mxH=0;
    for(let ti=-1;ti<=1;ti++) for(let wi=-1;wi<=1;wi++){
      mxH=Math.max(mxH, terrainH(ap.wx+acx*ahl*ti*.9+apx*ahw*wi*.9, ap.wy+acy*ahl*ti*.9+apy*ahw*wi*.9));
    }
    ap._gz=Math.max(14,mxH)+2.5;
  }
  const gz=ap._gz;
  state.pl={x:sx,y:sy,z:gz+state.GEAR_H,yaw:ap.hdg,pitch:0,roll:0,speed:0,throttle:0,vz:0};
}
