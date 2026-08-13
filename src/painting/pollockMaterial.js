import * as THREE from 'three';
import vertexShader from '../shaders/pollock.vert.glsl';
import fragmentShader from '../shaders/pollock.frag.glsl';

export function createPollockMaterial(aspect = 1.6) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uSeed: { value: Math.random() * 1000.0 },
      uReveal: { value: 0.0 },
      uAspect: { value: aspect },
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
}

export function randomizeSeed(material) {
  material.uniforms.uSeed.value = Math.random() * 10000.0;
}
