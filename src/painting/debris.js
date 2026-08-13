import * as THREE from 'three';

const PALETTE = [
  0xf5f3e8, // titanium white
  0x0c0c0d, // ivory black
  0xdba71c, // cadmium yellow
  0x851013, // venetian red
  0x101a3b, // prussian blue
  0x452a17, // raw umber
  0xa8acb0, // aluminum
];

const COUNT = 320;
const RADIUS = 15;
const NEAR_LIMIT = 2.0;
const FAR_DIST = 55;

export class Debris {
  constructor(scene, camera) {
    this.camera = camera;

    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, COUNT);
    scene.add(this.mesh);

    this.local = [];
    this.drift = [];
    this.rot = [];
    this.rotSpeed = [];
    this.scale = [];

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      const pos = this._randomSpawn(true);
      this.local.push(pos);
      this.drift.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6,
          0
        )
      );
      this.rot.push(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
      this.rotSpeed.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4
        )
      );
      const s = 0.05 + Math.pow(Math.random(), 2.2) * 0.32;
      this.scale.push(s);

      dummy.position.copy(pos);
      dummy.rotation.copy(this.rot[i]);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);

      color.set(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
      this.mesh.setColorAt(i, color);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  _randomSpawn(initial = false) {
    const z = initial ? -Math.random() * FAR_DIST : -(FAR_DIST * 0.55 + Math.random() * FAR_DIST * 0.45);
    const r = Math.random() * RADIUS;
    const a = Math.random() * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z);
  }

  update(delta, forwardSpeed) {
    this.camera.updateMatrixWorld();
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      const pos = this.local[i];
      pos.z += forwardSpeed * delta;
      pos.addScaledVector(this.drift[i], delta);

      if (pos.z > NEAR_LIMIT) {
        const fresh = this._randomSpawn(false);
        pos.copy(fresh);
        color.set(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
        this.mesh.setColorAt(i, color);
        this.mesh.instanceColor.needsUpdate = true;
      }

      const rot = this.rot[i];
      const rs = this.rotSpeed[i];
      rot.x += rs.x * delta;
      rot.y += rs.y * delta;
      rot.z += rs.z * delta;

      dummy.position.copy(this.camera.localToWorld(pos.clone()));
      dummy.rotation.copy(rot);
      dummy.scale.setScalar(this.scale[i]);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
