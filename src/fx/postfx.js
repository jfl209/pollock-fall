import * as THREE from 'three';
import gsap from 'gsap';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
  NoiseEffect,
  SMAAEffect,
  SMAAPreset,
  BlendFunction,
} from 'postprocessing';

export class PostFX {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
    });

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    this.bloom = new BloomEffect({
      intensity: 0.85,
      luminanceThreshold: 0.72,
      luminanceSmoothing: 0.3,
      mipmapBlur: true,
    });

    this.chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.0006, 0.0006),
    });

    this.vignette = new VignetteEffect({
      offset: 0.32,
      darkness: 0.75,
    });

    this.noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY });
    this.noise.blendMode.setOpacity(0.055);

    this.smaa = new SMAAEffect({ preset: SMAAPreset.HIGH });

    // SMAA and ChromaticAberration both declare the CONVOLUTION attribute, which
    // the compound-shader merger refuses to combine into a single pass — so SMAA
    // gets its own pass, run last to anti-alias the fully composited frame.
    const effectPass = new EffectPass(camera, this.bloom, this.chroma, this.vignette, this.noise);
    this.composer.addPass(effectPass);

    const smaaPass = new EffectPass(camera, this.smaa);
    this.composer.addPass(smaaPass);

    this._baseChroma = 0.0006;
  }

  burst() {
    gsap.killTweensOf(this.chroma.offset);
    gsap.killTweensOf(this.bloom);

    gsap.timeline()
      .to(this.chroma.offset, { x: 0.0055, y: 0.0038, duration: 0.28, ease: 'power2.out' }, 0)
      .to(this.chroma.offset, { x: this._baseChroma, y: this._baseChroma, duration: 1.0, ease: 'power2.inOut' }, 0.28);

    gsap.timeline()
      .to(this.bloom, { intensity: 1.9, duration: 0.28, ease: 'power2.out' }, 0)
      .to(this.bloom, { intensity: 0.85, duration: 1.0, ease: 'power2.inOut' }, 0.28);
  }

  resize(width, height) {
    this.composer.setSize(width, height);
  }

  render(delta) {
    this.composer.render(delta);
  }
}
