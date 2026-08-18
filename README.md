# Falling Through Paint

An endless, generative descent through a Jackson Pollock–style painting. There
are no textures or photos anywhere in this project — every drip, splatter, and
fleck of spray is painted live by a GLSL shader from a random seed. The camera
never stops falling forward; each time it passes through a canvas, it randomly
tumbles onto a new heading — down, up, left, or right — and a brand new
painting bleeds into existence ahead of it.

**[→ Live demo](https://jfl209.github.io/pollock-fall/)**

![preview](docs/preview.png)

## How it works

- **The paintings are code, not images.** A single fragment shader
  ([`pollock.frag.glsl`](src/shaders/pollock.frag.glsl)) procedurally layers
  seeded drip strokes (curl-noise-drifted capsule SDFs), organic splatter
  blobs, and fine spray speckle in a Pollock-ish palette. Every canvas gets a
  fresh random seed, so no two are alike.
- **The fall never stops.** The camera always moves along its own local
  forward axis. On reaching a canvas, it triggers a ~1.25s eased 90° pitch or
  yaw turn (picked at random), so the felt direction of the fall keeps
  changing, plus a small counter-roll flourish and a momentary speed lunge.
- **New art, every crossing.** A new canvas spawns facing the camera along the
  new heading and paint-bleeds into view through a noise-driven reveal wipe;
  the canvas just passed fades out and is recycled.
- **Depth and atmosphere.** Instanced, additive-blended paint flecks drift
  past for parallax, with ACES filmic tonemapping and a bloom / chromatic
  aberration / vignette / film-grain / SMAA postprocessing stack.

Built with [Three.js](https://threejs.org/), [pmndrs
postprocessing](https://github.com/pmndrs/postprocessing), and
[GSAP](https://gsap.com/) for the transition tweens, on [Vite](https://vite.dev/).

## Running it locally

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL.

```bash
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

## Deployment

Pushes to `main` build and deploy automatically to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
