import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const q = new URLSearchParams(location.search);
const ART   = q.get('art')   || 'wanghui';
const THEME = q.get('theme') || 'light';
const W     = +(q.get('w') || 700);
let   H     = +(q.get('h') || 0);   // 0 → derived from content
const light = THEME === 'light';

/* ============ renderer ============ */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = light ? 1.00 : 0.90;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.environmentIntensity = light ? 0.34 : 0.20;

/* ============ the single physical key light ============ */
/*
 * Nothing solid is lit any more — the sheet and the 天杆 are both drawn unlit
 * so the photograph keeps its own values. This light now only feeds the
 * shadow map and the hemisphere bounce, and it is what keeps the cast shadow
 * on the wall consistent with the light painted into the silk.
 */
const key = new THREE.DirectionalLight(0xfff4e6, light ? 1.35 : 0.85);
/* Raking from the upper left: real museum plates are lit from one side, and
   the falloff across a curved sheet is most of what makes it read as paper. */
key.position.set(-2.6, 1.15, 1.05);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 7;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.5;
scene.add(key);

const fill = new THREE.DirectionalLight(0xdbe6f4, light ? 0.34 : 0.20);
fill.position.set(2.2, -0.9, 1.8);
scene.add(fill);

/* Bounce off the wall. Without it the underside of a cylinder falls to
   #1e1510 and the silhouette reads as a black pipe rather than as wood
   picking up the room. This is the cheapest fix for "plastic tube". */
const bounce = new THREE.HemisphereLight(
  light ? 0xf4ece0 : 0x2a2621,
  light ? 0x8f7d63 : 0x140f0a,
  light ? 1.05 : 0.50
);
scene.add(bounce);

/* ============ dimensions ============ */
/* the museum photograph fixes the true aspect of the mounted scroll */
const RATIO = ART === 'morikage' ? 1.8670 : 1.5950;
const silkW = W * 0.62;
const silkH = silkW * RATIO;
const rodR      = silkW * 0.0100;   // ≈12mm on a 60cm mount
const belly     = silkW * 0.0260;   // the sheet bellies off the wall

const CY = 0;
const SILK_TOP = CY + silkH / 2;
const SILK_BOT = CY - silkH / 2;

/* ============ procedural surface detail ============ */
/* Everything below is generated, so the bake stays reproducible and the site
   ships no extra assets beyond the two mount photographs. */
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d') };
}

/* ============ mounted sheet ============ */
/*
 * A real mount is not a rectangle. It is a paper sandwich that was hung and
 * has been hanging: the long edges carry a slow wave, the lower corners curl
 * away from the wall, and a diagonal ripple runs through the sheet. Those
 * three deformations are what separate "a photograph on a plane" from "paper
 * hanging on a wall".
 */
/*
 * Describes the sheet's out-of-plane displacement as a function of normalised
 * position (u across, v up, both 0-1). Used twice: once to displace the mesh,
 * and once to derive the shading that is painted into the sheet texture.
 * Keeping it in one place is what lets the painted light agree with the
 * silhouette — the last bake shaded against a flat plane while the mesh
 * curved, so the two fought each other.
 */
function sheetDisplacement(u, v) {
  /*
   * The main belly, and the sign matters. A hung scroll bows *toward* the
   * room — the weight of the roller pulls the sheet off the wall at its
   * centre. Written with the opposite sign the sheet curves away, both edges
   * turn their backs on the upper-left key, and the mount reads as a
   * concave dish with two dark creases down its sides.
   */
  let z = Math.sin(Math.PI * u) * belly * (0.22 + v * 0.78)
        + Math.sin(Math.PI * v) * belly * 0.22;

  /* the lower corners lift away from the wall as the paper relaxes */
  const corner = Math.pow(Math.max(0, 1 - v * 2.6), 2) *
                 Math.pow(Math.abs(u - 0.5) * 2, 4);
  z -= corner * belly * 1.05;

  /* a long, very shallow wave down each vertical edge */
  z -= Math.sin(v * Math.PI * 1.0 + 0.6) * Math.pow(Math.abs(u - 0.5) * 2, 6) * belly * 0.85;

  /* the diagonal ripple left by rolling and unrolling */
  z += Math.sin((u * 1.6 + v * 2.4) * Math.PI) * belly * 0.045 *
       Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
  return z;
}

const sheetGeo = new THREE.PlaneGeometry(silkW, silkH, 96, 160);
{
  const pos = sheetGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / silkW + 0.5;
    const v = pos.getY(i) / silkH + 0.5;
    pos.setZ(i, sheetDisplacement(u, v));
  }
  sheetGeo.computeVertexNormals();
}

/*
 * The mount is NOT relit.
 *
 * The museum photograph was taken under gallery light that is already correct
 * for silk: the damask weave, the panel seam and the way the paper falls off
 * toward its edges are all recorded in those pixels. Pushing that image
 * through a 2.1-intensity key light and ACES tone mapping clipped the silk to
 * near-white and erased the weave — which is precisely what made the last
 * bake read as a flat white board.
 *
 * So the sheet is drawn unlit and the only shading applied is what a sheet of
 * hanging paper actually carries: the form shading of its own curvature, the
 * narrow occlusion right under the 天杆, and a soft lift where the bottom
 * edge curls away from the wall. That shading is multiplied into the pixels
 * here so it survives the downscale to 377px on screen.
 */
function sheetTexture(img) {
  const W0 = img.width, H0 = img.height;
  const { c, ctx } = makeCanvas(W0, H0);
  ctx.drawImage(img, 0, 0);

  /*
   * The Met photographs are flatbed scans, and both of them carry 1-4 px of
   * near-black sliver along the left (and, on wanghui, the right) edge where
   * the mount ran past the scanner glass. Stretched over a 377px-wide scroll
   * that sliver becomes a hard drawn-looking border, which is the "framed
   * poster" tell. Replicate the interior colour outward across those pixels
   * before anything else touches the image.
   */
  const probe = ctx.getImageData(0, 0, W0, H0);
  const px = probe.data;
  const lumAt = (x, y) => {
    const i = (y * W0 + x) * 4;
    return 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
  };
  const EDGE = 12;
  for (let y = 0; y < H0; y++) {
    /* left */
    let x = 0;
    while (x < EDGE && lumAt(x, y) < 120) x++;
    if (x > 0 && x < EDGE) {
      const s = (y * W0 + x) * 4;
      for (let k = 0; k < x; k++) {
        const d = (y * W0 + k) * 4;
        px[d] = px[s]; px[d + 1] = px[s + 1]; px[d + 2] = px[s + 2]; px[d + 3] = 255;
      }
    }
    /* right */
    let xr = W0 - 1;
    while (xr > W0 - EDGE && lumAt(xr, y) < 120) xr--;
    if (xr < W0 - 1) {
      const s = (y * W0 + xr) * 4;
      for (let k = xr + 1; k < W0; k++) {
        const d = (y * W0 + k) * 4;
        px[d] = px[s]; px[d + 1] = px[s + 1]; px[d + 2] = px[s + 2]; px[d + 3] = 255;
      }
    }
  }
  ctx.putImageData(probe, 0, 0);

  const H = H0, W = W0;

  /*
   * Form shading from the same displacement the mesh uses.
   *
   * An unlit, unshaded plane reads as a sticker no matter how good its silk
   * is: a hanging sheet curves, and the eye uses the resulting brightness
   * change to place it in space. So the normal is derived per pixel from
   * sheetDisplacement() and multiplied into the photograph against the
   * upper-left key the shadow and the 天杆 both agree on.
   */
  ctx.globalCompositeOperation = 'multiply';
  {
    const shade = ctx.createImageData(W, H);
    const sd = shade.data;
    const stepU = 1 / W, stepV = 1 / H;
    /* The key comes down the -Z axis tilted to the upper left. */
    const kx = -0.46, ky = 0.34, kz = 0.82;
    const kl = Math.hypot(kx, ky, kz);

    for (let y = 0; y < H; y++) {
      /* image row 0 is the top, so v runs from 1 down to 0 */
      const v = 1 - y / H;
      for (let x = 0; x < W; x++) {
        const u = x / W;

        /* central difference in the two tangent directions */
        const dzdu = (sheetDisplacement(Math.min(1, u + stepU), v) -
                      sheetDisplacement(Math.max(0, u - stepU), v)) / (2 * stepU);
        const dzdv = (sheetDisplacement(u, Math.min(1, v + stepV)) -
                      sheetDisplacement(u, Math.max(0, v - stepV))) / (2 * stepV);

        /* For z = z(u,v) over the sheet plane, N ∝ (-z_u, -z_v, 1) scaled by
           the sheet's aspect so the slopes are in comparable units. */
        let nx = -dzdu / silkW * 2;
        let ny = -dzdv / silkH * 2;
        let nz = 1;
        const nl = Math.hypot(nx, ny, nz);
        nx /= nl; ny /= nl; nz /= nl;

        const diff = Math.max(0, (nx * kx + ny * ky + nz * kz) / kl);
        /*
         * Ambience plus a shaped diffuse term. The exponent is high because
         * the sheet is barely curved — most of the frame must stay even, and
         * only the edges, which turn away, should visibly deepen.
         */
        const k = 0.80 + 0.34 * Math.pow(diff, 2.6);
        const i = (y * W + x) * 4;
        const val = Math.min(255, Math.round(k * 255));
        sd[i] = val; sd[i + 1] = val; sd[i + 2] = val; sd[i + 3] = 255;
      }
    }
    /* Multiply the computed shade into the photograph. */
    const shadeCanvas = makeCanvas(W, H);
    shadeCanvas.ctx.putImageData(shade, 0, 0);
    ctx.drawImage(shadeCanvas.c, 0, 0);
  }

  /* Occlusion under the 天杆: tight, because the bar is only finger-thin,
     but it is the one place the mount meets a hard edge. */
  const rodOcc = ctx.createLinearGradient(0, 0, 0, H * 0.045);
  rodOcc.addColorStop(0, 'rgb(196,190,180)');
  rodOcc.addColorStop(0.35, 'rgb(240,237,231)');
  rodOcc.addColorStop(1, 'rgb(255,255,255)');
  ctx.fillStyle = rodOcc;
  ctx.fillRect(0, 0, W, H * 0.045);

  /* A faint bottom-corner lift on each side: the sheet relaxes away from the
     wall at the very bottom, so those few millimetres sit in their own light. */
  for (const sx of [0, W]) {
    const rr = W * 0.10;
    const glow = ctx.createRadialGradient(sx, H, 0, sx, H, rr);
    glow.addColorStop(0, 'rgb(255,255,255)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, H - rr, W, rr);
  }

  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const sheetMat = new THREE.MeshBasicMaterial({
  /* toneMapped:false keeps the photograph's own values, which is the whole
     point — the gallery light is already in the pixels. */
  toneMapped: false,
  side: THREE.DoubleSide,
});

/*
 * The 天杆 is wrapped in the same silk as the border, so it is sampled from
 * the photograph rather than guessed. A single pixel is not enough: the
 * border carries the damask, and one sample landed on a phosphor-yellow
 * thread and tinted the whole bar olive. Averaging a tall strip of the border
 * gives the silk's true mean.
 *
 * Returns the silk's mean colour as **sRGB bytes** (0-255), not as a
 * THREE.Color. That distinction matters: three stores Color in linear working
 * space, and writing `color.r * 255` into a canvas produces a canvas texture
 * roughly two stops too dark — which is exactly why the morikage bar baked to
 * #543a21 instead of its own amber border.
 */
function silkTone(img) {
  const sw = Math.max(4, Math.round(img.width * 0.02));
  const sh = Math.round(img.height * 0.30);
  const sx = Math.round(img.width * 0.055);
  const sy = Math.round(img.height * 0.35);
  const cv = makeCanvas(1, 1);
  cv.ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1, 1);
  const [r, g, b] = cv.ctx.getImageData(0, 0, 1, 1).data;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  /*
   * Only a light desaturation. Pulling 45% toward grey turned the morikage
   * border's amber into a pale cream rail that read as a picture-hanging
   * strip; 18% keeps the silk's hue while removing the scanner's cast.
   */
  const pull = 0.18;
  const k = 0.88;      // the bar sits in the shadow of its own overhang
  return [
    (r + (lum - r) * pull) * k,
    (g + (lum - g) * pull) * k,
    (b + (lum - b) * pull) * k,
  ];
}

/*
 * The 天杆 is silk-wrapped, so it must hold the mount's own tone. Lighting it
 * with the scene key blew it out to flat white — a bright rail above a cream
 * sheet, which is the single most "drawn" element in the composite. Instead
 * its cylinder shading is painted into a tiny texture from the sampled silk
 * colour and the bar is drawn unlit, exactly like the sheet.
 *
 * CylinderGeometry puts theta = 0 at +Z (front centre) and theta = π/2 at +X,
 * which after rotation lands at the top of the bar. So reading round the
 * barrel: u=0.25 is the lit crown, u=0.0 the front, u=0.75 the underside.
 */
function cylinderShadeTexture(base, top = 1.05, front = 0.99, bottom = 0.74) {
  const { c, ctx } = makeCanvas(256, 4);
  const [r, g, b] = base;
  const mix = (k) => `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, mix(front));
  grad.addColorStop(0.25, mix(top));
  grad.addColorStop(0.5, mix(front * 0.96));
  grad.addColorStop(0.75, mix(bottom));
  grad.addColorStop(1.0, mix(front));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let topRodMat = null;
let mountImage = null;

/* Both the sheet and the 天杆 take their tone from the photograph, and the
   two are built in either order, so whoever finishes second syncs the bar. */
function syncBarTone() {
  if (!topRodMat || !mountImage) return;
  let silk = silkTone(mountImage);
  if (!light) silk = silk.map((v) => v * 0.34);
  topRodMat.map = cylinderShadeTexture(silk);
  topRodMat.needsUpdate = true;
}

new THREE.TextureLoader().load(`./mount/${ART}.webp`, (t) => {
  mountImage = t.image;
  sheetMat.map = sheetTexture(t.image);
  sheetMat.needsUpdate = true;
  syncBarTone();
  window.__ART_READY = true;
});

const sheet = new THREE.Mesh(sheetGeo, sheetMat);
sheet.material.shadowSide = THREE.DoubleSide;
sheet.castShadow = true;
sheet.receiveShadow = true;
scene.add(sheet);

/* ============ 天杆 : slim silk-wrapped bar ============ */
/*
 * A 天杆 is a slim dowel wrapped in the same silk as the border, so it takes
 * the mount's own tone (sampled from the photograph) rather than a guessed
 * brass colour. It is barely visible at display size — the note that reads is
 * a soft lit top edge over a slightly darker underside.
 */
topRodMat = new THREE.MeshBasicMaterial({ toneMapped: false });
/*
 * The 天杆 is wrapped by the mount, so it does not project past the silk. The
 * previous version ran it silkW + 2·rodR wide, which drew a bright rail
 * floating out beyond both edges of the sheet — the clearest "not a real
 * object" cue left in the composite.
 */
const topRod = new THREE.Mesh(new THREE.CylinderGeometry(rodR, rodR, silkW + rodR * 0.5, 48, 1), topRodMat);
topRod.rotation.z = Math.PI / 2;
topRod.position.set(0, SILK_TOP + rodR * 0.55, -belly * 0.02);
topRod.castShadow = true;
topRod.receiveShadow = true;
scene.add(topRod);
syncBarTone();

/*
 * Deliberately no 地杆.
 *
 * The roller and its bone end knobs were the most literal, least convincing
 * part of the composite at display size — a lacquered dowel reads as plastic
 * long before the eye accepts it as a wooden fitting. The mount now ends in a
 * bare paper edge, so the sheet's own silhouette and its soft cast shadow do
 * the work, and the frame holds nothing that has to be a cylinder.
 */

/* shadow is added in CSS via drop-shadow; the bake keeps a transparent background */

/* ============ camera: near-orthographic, like a museum plate ============ */
const topB  = SILK_TOP + rodR * 3.2;
/*
 * With the 地杆 gone the frame is bounded by the sheet itself. A hair of
 * extra room below keeps the bottom edge from sitting on the pixel boundary,
 * where the WebP's soft alpha would get clipped.
 */
const botB  = SILK_BOT - silkW * 0.012;
const spanH = topB - botB;
const totalW = silkW;

/* pad the tight bounds so the object never touches the frame edge */
const padY = spanH * 0.045;
const padX = totalW * 0.045;
const needH = spanH + padY * 2;
const needW = totalW + padX * 2;

/* the canvas aspect follows the content, so the bake has no dead margin */
if (!H) H = Math.round(W * (needH / needW));
renderer.setSize(W, H);

const cyy = (topB + botB) / 2;
const fovDeg = 5;
const tanHalf = Math.tan((fovDeg * Math.PI / 180) / 2);
const distH = (needH * 0.5) / tanHalf;
const distW = (needW * 0.5) / (tanHalf * (W / H));
const dist = Math.max(distH, distW);

const camera = new THREE.PerspectiveCamera(fovDeg, W / H, dist * 0.4, dist * 3);
camera.position.set(0, cyy, dist);
camera.lookAt(0, cyy, 0);

key.target.position.set(0, cyy, 0);
scene.add(key.target);

/* A directional light is infinitely far away; pushing the source far back
   keeps the shadow frustum simple and avoids near-plane clipping. */
const LIGHT_DIST = spanH * 3.2;
key.position.set(-2.05, 1.30, 1.55).normalize().multiplyScalar(LIGHT_DIST);
key.position.y += cyy;
key.updateMatrixWorld();

const sm = Math.max(totalW * 0.72, spanH * 0.62);
key.shadow.camera.left = -sm;
key.shadow.camera.right = sm;
key.shadow.camera.top = sm * 1.4;
key.shadow.camera.bottom = -sm * 1.4;
key.shadow.camera.near = LIGHT_DIST * 0.35;
key.shadow.camera.far = LIGHT_DIST * 1.7;
key.shadow.camera.updateProjectionMatrix();

let frames = 0;
function tick() {
  renderer.render(scene, camera);
  if (++frames === 4) window.__READY = true;
  requestAnimationFrame(tick);
}
tick();
