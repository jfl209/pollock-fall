import * as THREE from 'three';
import gsap from 'gsap';
import { createPollockMaterial, randomizeSeed } from './pollockMaterial.js';

const POOL_SIZE = 5;
const SPAWN_DIST = 24;
const CROSS_EPS = 0.9;
const BASE_SPEED = 4.4;
const PLANE_W = 60;
const PLANE_H = 38;
const ASPECT = PLANE_W / PLANE_H;

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

export class Tunnel {
  constructor(scene, camera, { onCrossingStart, onCrossingSettle } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.onCrossingStart = onCrossingStart || (() => {});
    this.onCrossingSettle = onCrossingSettle || (() => {});

    this.time = 0;
    this.speedMult = 1;
    this.transitioning = false;
    this.activeIndex = 0;

    const geometry = new THREE.PlaneGeometry(PLANE_W, PLANE_H);
    this.pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const material = createPollockMaterial(ASPECT);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, material });
    }

    this._spawnPlane(0, camera.position, camera.quaternion, true);
  }

  _spawnPlane(index, originPos, orientationQuat, isIntro = false) {
    const slot = this.pool[index];
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(orientationQuat);
    slot.mesh.position.copy(originPos).addScaledVector(forward, SPAWN_DIST);
    slot.mesh.quaternion.copy(orientationQuat);
    slot.mesh.visible = true;
    gsap.killTweensOf(slot.material.uniforms.uOpacity);
    slot.material.uniforms.uOpacity.value = 1;
    randomizeSeed(slot.material);
    slot.material.uniforms.uReveal.value = 0;
    gsap.to(slot.material.uniforms.uReveal, {
      value: 1,
      duration: isIntro ? 2.2 : 1.5,
      delay: isIntro ? 0.3 : 0.15,
      ease: 'power2.out',
    });
    this.activeIndex = index;
  }

  _triggerCrossing() {
    this.transitioning = true;
    this.onCrossingStart();

    const startQuat = this.camera.quaternion.clone();

    const useYaw = Math.random() < 0.5;
    const sign = Math.random() < 0.5 ? 1 : -1;
    const axis = useYaw ? AXIS_Y : AXIS_X;
    const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axis, sign * (Math.PI / 2));
    const targetQuat = startQuat.clone().multiply(deltaQuat);

    const wobbleSign = Math.random() < 0.5 ? 1 : -1;
    const originPos = this.camera.position.clone();

    // the plane we're currently passing through: dissolve it away so it doesn't
    // linger edge-on in view once the camera has turned onto a new heading
    const oldSlot = this.pool[this.activeIndex];
    gsap.to(oldSlot.material.uniforms.uOpacity, {
      value: 0,
      duration: 0.9,
      delay: 0.15,
      ease: 'power1.in',
      onComplete: () => {
        oldSlot.mesh.visible = false;
      },
    });

    const nextIndex = (this.activeIndex + 1) % POOL_SIZE;
    this._spawnPlane(nextIndex, originPos, targetQuat, false);

    const proxy = { t: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        this.camera.quaternion.copy(targetQuat);
        this.transitioning = false;
        this.onCrossingSettle();
      },
    });

    tl.to(
      proxy,
      {
        t: 1,
        duration: 1.25,
        ease: 'power2.inOut',
        onUpdate: () => {
          const base = new THREE.Quaternion().slerpQuaternions(startQuat, targetQuat, proxy.t);
          const wobbleAngle = Math.sin(proxy.t * Math.PI) * 0.22 * wobbleSign;
          const wobble = new THREE.Quaternion().setFromAxisAngle(AXIS_Z, wobbleAngle);
          base.multiply(wobble);
          this.camera.quaternion.copy(base);
        },
      },
      0
    );

    tl.to(this, { speedMult: 2.1, duration: 0.32, ease: 'power2.out' }, 0);
    tl.to(this, { speedMult: 1, duration: 0.93, ease: 'power2.inOut' }, 0.32);
  }

  update(delta) {
    this.time += delta;

    this.camera.translateZ(-BASE_SPEED * this.speedMult * delta);

    const active = this.pool[this.activeIndex];
    const toPlane = active.mesh.position.clone().sub(this.camera.position);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const distAhead = toPlane.dot(forward);

    if (!this.transitioning && distAhead < CROSS_EPS) {
      this._triggerCrossing();
    }

    for (const slot of this.pool) {
      if (slot.mesh.visible) slot.material.uniforms.uTime.value = this.time;
    }
  }
}
