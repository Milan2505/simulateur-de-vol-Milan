import { Terrain } from './terrain.js';
import { getCam, project } from './camera.js';
import { state, resetPlane } from './state.js';

console.info('flightSimulator module loaded');

const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// NOTE: le reste du système (update, rendu, input...) doit être porté ici.

function loop(ts){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='black';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  requestAnimationFrame(loop);
}

resetPlane([]/*AIRPORTS a définir*/ , Terrain.terrainH);
requestAnimationFrame(loop);
