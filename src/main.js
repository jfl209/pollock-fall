import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { createScene } from './core/scene.js';
import { Tunnel } from './painting/tunnel.js';
import { Debris } from './painting/debris.js';
import { PostFX } from './fx/postfx.js';
import './style.css';

const canvas = document.getElementById('scene');
const overlay = document.getElementById('overlay');

const renderer = createRenderer(canvas);
const { scene, camera } = createScene();

const postfx = new PostFX(renderer, scene, camera);

const tunnel = new Tunnel(scene, camera, {
  onCrossingStart: () => postfx.burst(),
});

const debris = new Debris(scene, camera);

// subtle parallax: mouse/touch nudges camera look slightly, always relaxes back
const pointer = { x: 0, y: 0 };
const pointerTarget = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerTarget.y = (e.clientY / window.innerHeight) * 2 - 1;
});

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  postfx.resize(w, h);
}
window.addEventListener('resize', onResize);

let running = true;
document.addEventListener('visibilitychange', () => {
  running = document.visibilityState === 'visible';
  if (running) clock.getDelta(); // discard the paused-time jump
});

const clock = new THREE.Clock();
const parallaxAxis = { pitch: new THREE.Vector3(1, 0, 0), yaw: new THREE.Vector3(0, 1, 0) };

function animate() {
  requestAnimationFrame(animate);
  if (!running) return;

  const delta = Math.min(clock.getDelta(), 0.05);

  tunnel.update(delta);

  // authoritative orientation, before the transient parallax nudge below
  const baseQuat = camera.quaternion.clone();

  pointer.x += (pointerTarget.x - pointer.x) * 0.04;
  pointer.y += (pointerTarget.y - pointer.y) * 0.04;
  const parallax = new THREE.Quaternion()
    .setFromAxisAngle(parallaxAxis.yaw, -pointer.x * 0.05)
    .multiply(new THREE.Quaternion().setFromAxisAngle(parallaxAxis.pitch, -pointer.y * 0.035));
  camera.quaternion.copy(baseQuat).multiply(parallax);

  debris.update(delta, 4.4 * tunnel.speedMult);

  postfx.render(delta);

  // parallax is render-only; restore the authoritative orientation for next frame's fall logic
  camera.quaternion.copy(baseQuat);
}

// fade the intro overlay once the first frame is up
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    overlay.classList.add('hidden');
  });
});

onResize();
animate();
