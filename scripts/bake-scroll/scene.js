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
scene.environmentIntensity = light ? 0.55 : 0.26;

/* ============ the single physical key light ============ */
const key = new THREE.DirectionalLight(0xfff4e6, light ? 2.0 : 1.0);
key.position.set(-2.05, 1.30, 1.55);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 7;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.5;
scene.add(key);

const fill = new THREE.DirectionalLight(0xdbe6f4, light ? 0.20 : 0.14);
fill.position.set(2.2, -0.9, 1.8);
scene.add(fill);

/* ============ dimensions ============ */
/* the museum photograph fixes the true aspect of the mounted scroll */
const RATIO = ART === 'morikage' ? 1.8670 : 1.5950;
const silkW = W * 0.62;
const silkH = silkW * RATIO;
const rodR      = silkW * 0.0100;   // ≈12mm on a 60cm mount
const rollerR   = silkW * 0.0250;   // ≈34mm roller
const capLen    = silkW * 0.0600;   // ≈75mm knob
const belly     = silkW * 0.0130;   // the sheet bellies off the wall
const wallGap   = silkW * 0.1550;   // ≈5cm standoff from the wall   // paper sandwich sits this far in front of the wall

const CY = 0;
const SILK_TOP = CY + silkH / 2;
const SILK_BOT = CY - silkH / 2;

/* ============ mounted sheet ============ */
const sheetGeo = new THREE.PlaneGeometry(silkW, silkH, 64, 96);
{
  const pos = sheetGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const u = x / silkW + 0.5, v = y / silkH + 0.5;
    /* a hanging scroll bellies out; more at the foot where the weight hangs */
    const z = -Math.sin(Math.PI * u) * belly * (0.28 + v * 0.72)
            + Math.sin(Math.PI * v) * belly * 0.22
            + Math.sin(v * Math.PI * 3.0) * Math.sin(Math.PI * u) * belly * 0.16;
    pos.setZ(i, z);
  }
  sheetGeo.computeVertexNormals();
}

const sheetMat = new THREE.MeshPhysicalMaterial({
  roughness: 0.82,
  metalness: 0,
  sheen: 0.35,
  sheenRoughness: 0.62,
  sheenColor: new THREE.Color(light ? '#fff6e6' : '#8f8878'),
  specularIntensity: 0.22,
  side: THREE.DoubleSide,
});
new THREE.TextureLoader().load(`./mount/${ART}.webp`, (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  sheetMat.map = t;
  sheetMat.needsUpdate = true;
  window.__ART_READY = true;
});

const sheet = new THREE.Mesh(sheetGeo, sheetMat);
sheet.material.shadowSide = THREE.DoubleSide;
sheet.castShadow = true;
sheet.receiveShadow = true;
scene.add(sheet);

/* paper edge: the mount has real thickness, visible from a raking angle */
const edgeDepth = silkW * 0.012;
const edge = new THREE.Mesh(
  new THREE.BoxGeometry(silkW + edgeDepth * 0.4, silkH, edgeDepth),
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(light ? '#b3a184' : '#1d1a14'),
    roughness: 0.95, metalness: 0,
  })
);
edge.position.set(0, CY, -belly - edgeDepth / 2 - silkW * 0.002);
edge.castShadow = true;
scene.add(edge);

/* ============ 天杆 : slim silk-wrapped bar ============ */
const rodMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(light ? '#9d8a68' : '#302a20'),
  roughness: 0.74, metalness: 0,
  sheen: 0.30, sheenRoughness: 0.65,
  sheenColor: new THREE.Color(light ? '#fff0d4' : '#6b6152'),
});
const topRod = new THREE.Mesh(new THREE.CylinderGeometry(rodR, rodR, silkW + rodR * 2, 48, 1), rodMat);
topRod.rotation.z = Math.PI / 2;
topRod.position.set(0, SILK_TOP + rodR * 0.55, -belly * 0.02);
topRod.castShadow = true;
topRod.receiveShadow = true;
scene.add(topRod);

/* ============ 地杆 : the roller ============ */
const rollerMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(light ? '#5a3d26' : '#281b11'),
  roughness: 0.40, metalness: 0.02,
  clearcoat: 0.34, clearcoatRoughness: 0.34,
  sheen: 0.40, sheenRoughness: 0.35,
  sheenColor: new THREE.Color(light ? '#ffd6a2' : '#57432c'),
});
const rollerY = SILK_BOT - rollerR * 0.35;
const rollerZ = rollerR * 0.30;
const roller = new THREE.Mesh(
  new THREE.CylinderGeometry(rollerR, rollerR, silkW + rollerR * 1.4, 64, 1),
  rollerMat
);
roller.rotation.z = Math.PI / 2;
roller.position.set(0, rollerY, rollerZ);
roller.castShadow = true;
roller.receiveShadow = true;
scene.add(roller);

/* ============ 轴头 : turned end knobs ============ */
const knobMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(light ? '#cfc3ad' : '#695845'),
  roughness: 0.30, metalness: 0,
  clearcoat: 0.45, clearcoatRoughness: 0.30,
  sheen: 0.35, sheenColor: new THREE.Color('#fff8ea'),
});
function capProfile(r, len) {
  const pts = [new THREE.Vector2(0.0001, 0)];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    /* a turned ivory knob: a bead near the rod, then a long taper */
    const bead  = 1 + 0.16 * Math.exp(-Math.pow((t - 0.16) / 0.14, 2));
    const taper = 1 - 0.42 * Math.pow(t, 1.7);
    const r0 = r * 0.94 * bead * taper;
    pts.push(new THREE.Vector2(Math.max(r0, 0.3), t * len));
  }
  pts.push(new THREE.Vector2(0.0001, len));
  return pts;
}
for (const sgn of [-1, 1]) {
  const cap = new THREE.Mesh(new THREE.LatheGeometry(capProfile(rollerR, capLen), 64), knobMat);
  /* lathe axis is +Y → lay along X; flip so both flare outward */
  cap.rotation.z = sgn > 0 ? -Math.PI / 2 : Math.PI / 2;
  cap.position.set(sgn * (silkW / 2 + rollerR * 0.7), rollerY, rollerZ);
  cap.castShadow = true;
  cap.receiveShadow = true;
  scene.add(cap);
}

/* shadow is added in CSS via drop-shadow; the bake keeps a transparent background */

/* ============ camera: near-orthographic, like a museum plate ============ */
const topB  = SILK_TOP + rodR * 3.2;
const botB  = rollerY - rollerR * 1.55;
const spanH = topB - botB;
const totalW = silkW + 2 * (capLen + rollerR * 0.7);

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
