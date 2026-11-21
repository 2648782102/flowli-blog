/*
 * Generates the paper assets under public/assets/scroll/:
 *   paper-{light,dark}.png     neutral, tileable sheet texture — used by
 *                              .scroll-edge
 *   curl-left-{light,dark}.png tileable left-edge curl (lit crest, cut edge,
 *                              fold line, cast shadow on the flat sheet).
 *                              No longer referenced: the curl read as a grey
 *                              bar in dark mode, so .scroll-edge is now a
 *                              flat sheet with no rolled edge. Kept so the
 *                              material stays reproducible if it returns.
 *
 * The hanging scrolls on the homepage no longer use CSS material textures;
 * they are physically rendered and baked by scripts/bake-scroll/.
 *
 * Rendered deterministically so the material stays stable across machines.
 * Run with: node scripts/generate-scroll-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/assets/scroll");
fs.mkdirSync(OUT, { recursive: true });

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v) => Math.max(0, Math.min(255, v));

/** Value noise that tiles on both axes. */
function noise(w, h, gx, gy, seed) {
  const rand = rng(seed);
  const lattice = new Float32Array(gx * gy);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = (y / h) * gy;
    const y0 = Math.floor(fy) % gy;
    const y1 = (y0 + 1) % gy;
    const ty = smooth(fy - Math.floor(fy));
    for (let x = 0; x < w; x++) {
      const fx = (x / w) * gx;
      const x0 = Math.floor(fx) % gx;
      const x1 = (x0 + 1) % gx;
      const tx = smooth(fx - Math.floor(fx));
      out[y * w + x] = lerp(
        lerp(lattice[y0 * gx + x0], lattice[y0 * gx + x1], tx),
        lerp(lattice[y1 * gx + x0], lattice[y1 * gx + x1], tx),
        ty,
      );
    }
  }
  return out;
}

/**
 * Paper tooth: a white-based tile consumed through `multiply`.
 *
 * The operator matters more than the tile here, and this is easy to get wrong.
 * `overlay` keys on the *backdrop*: at a backdrop of 253/255 its slope is
 * 0.016, so a ±1-level tile produces ±0.016 levels of output — the texture
 * mathematically disappears. `soft-light` behaves the same way near white.
 * That is why every paper surface in this project rendered as one flat value
 * while the CSS claimed to have grain.
 *
 * `multiply` has a slope of ~1 at every backdrop, so ±1 in the tile is ±1 on
 * screen, and the whole thing scales the base colour rather than washing it
 * toward white. The tile is therefore white-based: 255 means "no change",
 * and the tooth is always a darkening.
 */
async function paper(name, seed, tooth) {
  /*
   * 256px, not 512px.
   *
   * Tooth is high-frequency noise: mean absolute step between neighbouring
   * pixels is ~0.9, so PNG's filters find almost nothing to exploit and a
   * 512px tile of it costs 111KB — for a texture that is meant to be felt, not
   * seen. At 256px the same tooth tiles twice as often, which is invisible at
   * this amplitude, and the file drops to roughly a quarter of the size.
   *
   * The lattice counts below are halved to match, so the noise keeps the same
   * spatial frequency rather than becoming coarser.
   */
  const S = 256;
  const n1 = noise(S, S, 24, 24, seed + 1);
  const n2 = noise(S, S, 96, 96, seed + 2);
  const n3 = noise(S, S, 256, 256, seed + 3);
  const rand = rng(seed + 4);
  const fibers = new Map();
  for (let i = 0; i < 90; i++) {
    const x0 = Math.floor(rand() * S);
    const y0 = Math.floor(rand() * S);
    const len = 6 + Math.floor(rand() * 36);
    const vertical = rand() < 0.12;
    const a = 0.5 + rand();
    for (let k = 0; k < len; k++) {
      const x = (x0 + (vertical ? 0 : k)) % S;
      const y = (y0 + (vertical ? k : 0)) % S;
      const idx = y * S + x;
      fibers.set(idx, Math.max(fibers.get(idx) || 0, a));
    }
  }
  const buf = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const t = ((n1[i] - 0.5) * 1.4 + (n2[i] - 0.5) * 0.7 + (n3[i] - 0.5) * 0.35) * tooth;
      /*
       * Tooth depth.
       *
       * `multiply` can only darken, so the tile is white-based and the noise
       * is folded through `abs`: every deviation becomes a small shadow, which
       * is what tooth actually is under a raking light. The result is a tile
       * spanning 225–254 (σ ≈ 3) — enough to read on both paper values,
       * nowhere near the sandpaper end of the scale.
       */
      const v = clamp(255 - Math.abs(t - (fibers.get(i) || 0)) * 14);
      buf[i * 4] = v;
      buf[i * 4 + 1] = v;
      buf[i * 4 + 2] = v;
      buf[i * 4 + 3] = 255;
    }
  }
  await sharp(buf, { raw: { width: S, height: S, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, name));
}

/**
 * A left-edge paper curl, tileable vertically.
 * 0.00-0.055 lip  | 0.055-0.085 fold shadow | 0.085-0.16 cut edge
 * 0.16-0.34 crest  | 0.34-0.52 body          | 0.52+ cast shadow
 */
async function curl(name, p) {
  const W = 140, H = 480;
  const g1 = noise(W, H, 40, 60, 11);
  const g2 = noise(W, H, 160, 192, 13);
  const buf = Buffer.alloc(W * H * 4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const t = x / (W - 1);
      const grain = (g1[y * W + x] - 0.5) * 2.6 + (g2[y * W + x] - 0.5) * 1.1;

      let v;
      if (t < 0.055) v = lerp(p.lipEdge, p.lip, smooth(t / 0.055));
      else if (t < 0.085) v = p.foldShadow;
      else if (t < 0.16) v = lerp(p.foldShadow, p.crest, smooth((t - 0.085) / 0.075));
      else if (t < 0.34) v = lerp(p.crest, p.body, smooth((t - 0.16) / 0.18));
      else v = lerp(p.body, p.bodyDeep, smooth(Math.min(1, (t - 0.34) / 0.18)));

      let paperAlpha = 1;
      if (t >= 0.34) paperAlpha = 1 - smooth(Math.min(1, (t - 0.34) / 0.22));

      let shadowAlpha = 0;
      if (t >= 0.34) {
        const k = (t - 0.34) / (1 - 0.34);
        shadowAlpha =
          p.shadowAlpha *
          Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.2)), 1.1) *
          (1 - smooth(Math.max(0, (k - 0.42) / 0.58)));
      }

      paperAlpha = Math.max(0, paperAlpha);
      shadowAlpha = Math.max(0, Math.min(1, shadowAlpha));

      const pr = clamp(v * p.tint[0] + grain);
      const pg = clamp(v * p.tint[1] + grain);
      const pb = clamp(v * p.tint[2] + grain);
      const outA = shadowAlpha + paperAlpha * (1 - shadowAlpha);
      if (outA <= 0.002) {
        buf[i + 3] = 0;
        continue;
      }
      buf[i] = Math.round((p.shadow[0] * shadowAlpha + pr * paperAlpha * (1 - shadowAlpha)) / outA);
      buf[i + 1] = Math.round((p.shadow[1] * shadowAlpha + pg * paperAlpha * (1 - shadowAlpha)) / outA);
      buf[i + 2] = Math.round((p.shadow[2] * shadowAlpha + pb * paperAlpha * (1 - shadowAlpha)) / outA);
      buf[i + 3] = Math.round(255 * outA);
    }
  }

  await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, name));
}

await paper("paper-light.png", 101, 1.0);
await paper("paper-dark.png", 131, 1.2);

await curl("curl-left-light.png", {
  lipEdge: 214,
  lip: 255,
  foldShadow: 168,
  crest: 250,
  body: 247,
  bodyDeep: 240,
  shadowAlpha: 0.16,
  tint: [1.0, 0.993, 0.978],
  shadow: [70, 55, 36],
});

await curl("curl-left-dark.png", {
  lipEdge: 32,
  lip: 74,
  foldShadow: 14,
  crest: 66,
  body: 44,
  bodyDeep: 32,
  shadowAlpha: 0.5,
  tint: [0.94, 0.985, 1.045],
  shadow: [0, 0, 0],
});


console.log("Scroll assets written to", OUT);
