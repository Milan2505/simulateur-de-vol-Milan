// ══════════════════════════════════════════════════════════
// HUD.JS — HUD + indicateur d'assiette
// ══════════════════════════════════════════════════════════

// ══ INDICATEUR D'ASSIETTE ══════════════════════════
function drawAttitude(){
  const C=55,S=110;
  attX.clearRect(0,0,S,S);
  attX.save();
  attX.beginPath(); attX.arc(C,C,C-2,0,Math.PI*2); attX.clip();
  attX.save();
  attX.translate(C,C); attX.rotate(pl.roll);
  const po=Math.max(-C,Math.min(C,pl.pitch*58));
  const skyG=attX.createLinearGradient(0,-C,0,po);
  skyG.addColorStop(0,'#0c3878'); skyG.addColorStop(1,'#1854b2');
  attX.fillStyle=skyG; attX.fillRect(-C,-C,S,C+po);
  const gndG=attX.createLinearGradient(0,po,0,C);
  gndG.addColorStop(0,'#523010'); gndG.addColorStop(1,'#381c08');
  attX.fillStyle=gndG; attX.fillRect(-C,po,S,C-po+1);
  attX.strokeStyle='#fff'; attX.lineWidth=1.5;
  attX.beginPath(); attX.moveTo(-C,po); attX.lineTo(C,po); attX.stroke();
  for(let d=-40;d<=40;d+=10){
    if(!d) continue;
    const py=po-d*(C/54);
    const ww=Math.abs(d)===10?14:Math.abs(d)===20?20:26;
    attX.strokeStyle='rgba(255,255,255,.5)'; attX.lineWidth=1;
    attX.beginPath(); attX.moveTo(-ww/2,py); attX.lineTo(ww/2,py); attX.stroke();
  }
  attX.restore();
  attX.strokeStyle='#ffdd00'; attX.lineWidth=2.5;
  attX.beginPath(); attX.moveTo(14,C); attX.lineTo(36,C); attX.stroke();
  attX.beginPath(); attX.moveTo(C+19,C); attX.lineTo(C+41,C); attX.stroke();
  attX.beginPath(); attX.moveTo(C,C-7); attX.lineTo(C,C+4); attX.stroke();
  attX.beginPath(); attX.arc(C,C,3.5,0,Math.PI*2);
  attX.fillStyle='#ffdd00'; attX.fill();
  attX.restore();
  attX.beginPath(); attX.arc(C,C,C-2,0,Math.PI*2);
  attX.strokeStyle='rgba(0,255,136,.38)'; attX.lineWidth=2; attX.stroke();
  attX.fillStyle='rgba(255,255,255,.65)';
  attX.beginPath(); attX.moveTo(C-4,2); attX.lineTo(C+4,2); attX.lineTo(C,9); attX.closePath(); attX.fill();
}

function updateHUD(){
  document.getElementById('v-spd').textContent=Math.round(pl.speed);
  document.getElementById('b-spd').style.width=Math.min(100,pl.speed/320*100)+'%';
  document.getElementById('v-alt').textContent=Math.round(pl.z);
  document.getElementById('b-alt').style.width=Math.min(100,pl.z/18000*100)+'%';
  document.getElementById('thr-fill').style.height=(pl.throttle*100)+'%';
  const hdg=((pl.yaw*180/Math.PI)%360+360)%360;
  document.getElementById('hdg').textContent=String(Math.round(hdg)).padStart(3,'0')+'°';
  const curHdg=Math.round(((pl.yaw*180/Math.PI)%360+360)%360/5)*5;
  if(updateHUD._hdg!==curHdg){
  updateHUD._hdg=curHdg;
  let html='';
  for(let d=-85;d<=85;d+=5){
    const deg=((Math.round(hdg)+d)+360)%360;
    if(CARDS[deg]) html+=`<span style="margin:0 5px;color:#00ff88;font-weight:bold">${CARDS[deg]}</span>`;
    else if(deg%10===0) html+=`<span style="margin:0 4px;color:rgba(0,255,136,.52)">${deg}</span>`;
    else html+=`<span style="margin:0 2px;color:rgba(0,255,136,.16)">·</span>`;
  }
  document.getElementById('cmp-inner').innerHTML=html;
  }
  const vs=Math.round(pl.vz*60);
  document.getElementById('v-vs').textContent=(vs>=0?'+':'')+vs;
  document.getElementById('v-vs').style.color=vs>10?'#00ff88':vs<-30?'#f55':'#aaffcc';
  const eEl=document.getElementById('v-eng');
  const flapLabels=['0°','10°','20°','40°'];
  eEl.textContent=(pl.throttle>.04?'ON':'OFF')+' F'+flapLabels[flaps];
  eEl.style.color=pl.throttle>.04?'#00ff88':'#f55';
  const cosR=Math.max(0.15,Math.cos(pl.roll));
  const gf=(1/cosR).toFixed(1); // G réel = 1/cos(bank)
  const gEl=document.getElementById('v-gf');
  gEl.textContent=gf; gEl.style.color=parseFloat(gf)>2.5?'#f55':'#00ff88';
  const curStallSpd=STALL_SPD_CLEAN-flaps*3.2;
  document.getElementById('stall').style.display=(pl.speed>8&&pl.speed<curStallSpd+8&&pl.z>80&&!pl.onGround)?'block':'none';
  if(!updateHUD._cm||updateHUD._cm!==camMode){
    const labels=['COCKPIT','POURSUITE','LATÉRALE'];
    document.getElementById('cam-btn').textContent='📷 '+labels[camMode];
    updateHUD._cm=camMode;
  }
}
