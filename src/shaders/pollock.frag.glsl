precision highp float;

varying vec2 vUv;
varying vec3 vWorldPos;

uniform float uSeed;
uniform float uReveal;
uniform float uAspect;
uniform float uTime;
uniform float uOpacity;

// ---------- hashing / noise ----------

float hash1(float n) { return fract(sin(n) * 43758.5453123); }

vec2 hash2(float n) {
  return fract(sin(vec2(n, n + 1.0)) * vec2(43758.5453123, 22578.1459123));
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash1(dot(i, vec2(12.9898, 78.233)));
  float b = hash1(dot(i + vec2(1.0, 0.0), vec2(12.9898, 78.233)));
  float c = hash1(dot(i + vec2(0.0, 1.0), vec2(12.9898, 78.233)));
  float d = hash1(dot(i + vec2(1.0, 1.0), vec2(12.9898, 78.233)));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * vnoise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return v;
}

float fbm2(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 2; i++) {
    v += amp * vnoise(p);
    p *= 2.1;
    amp *= 0.5;
  }
  return v;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// ---------- Pollock palette ----------

vec3 palette(int i) {
  if (i == 0) return vec3(0.96, 0.95, 0.90); // titanium white
  if (i == 1) return vec3(0.045, 0.045, 0.05); // ivory black
  if (i == 2) return vec3(0.86, 0.65, 0.11); // cadmium yellow
  if (i == 3) return vec3(0.52, 0.06, 0.08); // venetian red
  if (i == 4) return vec3(0.06, 0.10, 0.23); // prussian blue
  if (i == 5) return vec3(0.27, 0.16, 0.09); // raw umber
  return vec3(0.66, 0.68, 0.70); // aluminum
}

const int STROKES = 34;
const int SEGMENTS = 7;
const int SPLATTERS = 110;

void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);

  // raw stretched canvas base
  vec3 canvas = vec3(0.90, 0.86, 0.77);
  canvas *= 0.88 + 0.16 * fbm(p * 5.0 + uSeed * 3.1);
  canvas -= 0.07 * fbm(p * 46.0 + uSeed * 9.7);

  vec3 color = canvas;

  // ---- drip strokes ----
  for (int i = 0; i < STROKES; i++) {
    float si = uSeed * 97.13 + float(i) * 13.37;
    vec2 pos = mix(vec2(-0.3 * uAspect, -0.3), vec2(1.3 * uAspect, 1.3), hash2(si));
    float ang = hash1(si + 5.1) * 6.2831853;
    float baseWidth = mix(0.0035, 0.02, pow(hash1(si + 9.3), 2.0));
    int colIdx = int(floor(hash1(si + 2.7) * 7.0));
    vec3 strokeColor = palette(colIdx);
    float segLen = mix(0.12, 0.38, hash1(si + 4.4));

    float d = 1.0e5;
    vec2 prev = pos;
    for (int s = 0; s < SEGMENTS; s++) {
      float fs = float(s);
      ang += (hash1(si + fs * 3.7 + 1.0) - 0.5) * 2.6;
      vec2 next = prev + vec2(cos(ang), sin(ang)) * segLen * (0.7 + 0.6 * hash1(si + fs * 5.5));
      d = min(d, sdSegment(p, prev, next));
      prev = next;
    }

    float w = baseWidth * (0.55 + 0.85 * fbm2(p * 14.0 + si));
    float edge = fwidth(d) * 1.4 + 0.0016;
    float cov = 1.0 - smoothstep(w - edge, w + edge, d);
    color = mix(color, strokeColor, cov);
  }

  // ---- larger splatter blobs ----
  for (int j = 0; j < SPLATTERS; j++) {
    float sj = uSeed * 53.7 + float(j) * 7.91 + 500.0;
    vec2 c = mix(vec2(-0.15 * uAspect, -0.15), vec2(1.15 * uAspect, 1.15), hash2(sj));
    float r = mix(0.004, 0.055, pow(hash1(sj + 1.0), 2.2));
    vec3 col = palette(int(floor(hash1(sj + 2.0) * 7.0)));

    float ang2 = atan(p.y - c.y, p.x - c.x);
    float rad = length(p - c);
    vec2 rim = vec2(cos(ang2), sin(ang2)) * 2.3 + sj * 0.61;
    float wobble = 0.5 + 0.95 * fbm2(rim);
    float dd = rad - r * wobble;
    float edge2 = fwidth(dd) * 1.4 + 0.0012;
    float cov2 = 1.0 - smoothstep(-edge2, edge2, dd);
    color = mix(color, col, cov2);
  }

  // ---- fine spray speckle (single-cell nearest-point, cheap) ----
  vec2 sp = p * 105.0 + uSeed * 13.0;
  vec2 gi = floor(sp);
  vec2 gf = fract(sp);
  float rnd = hash1(dot(gi, vec2(12.9898, 78.233)) + uSeed * 3.1);
  float rnd2 = hash1(dot(gi, vec2(39.3, 11.7)) + uSeed * 7.7);
  vec2 center = vec2(rnd, rnd2);
  float distp = length(gf - center);
  float speckR = 0.06 + 0.13 * hash1(dot(gi, vec2(5.3, 9.1)) + uSeed);
  float presence = step(0.78, hash1(dot(gi, vec2(3.7, 91.3)) + uSeed * 2.0));
  float speck = presence * (1.0 - smoothstep(speckR * 0.4, speckR, distp));
  vec3 speckColor = palette(int(floor(hash1(dot(gi, vec2(17.1, 5.9)) + uSeed) * 7.0)));
  color = mix(color, speckColor, speck * 0.85);

  // ---- wet-paint sheen shimmer ----
  float sheen = smoothstep(0.72, 1.0, fbm(p * 9.0 - uSeed * 4.0 + sin(uTime * 0.06) * 0.4));
  color += sheen * 0.06;

  // ---- highlight glow boost for bloom ----
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  color += color * pow(max(lum - 0.8, 0.0), 1.0) * 1.4;

  // ---- gentle edge darkening ----
  float vig = smoothstep(0.95, 0.3, length(vUv - 0.5));
  color *= mix(0.72, 1.0, vig);

  // ---- organic reveal wipe: painting bleeds in from raw canvas ----
  float revealField = fbm(p * 2.6 + uSeed * 5.3);
  float paintedMask = smoothstep(revealField - 0.14, revealField + 0.14, uReveal);
  vec3 raw = canvas * 0.5;
  vec3 finalColor = mix(raw, color, paintedMask);

  gl_FragColor = vec4(finalColor, uOpacity);
}
