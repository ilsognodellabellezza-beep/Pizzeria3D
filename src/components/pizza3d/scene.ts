import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  WORLD,
  basilTexture,
  cheeseField,
  cheeseTexture,
  doughBump,
  doughTexture,
  fbm,
  ovenGlowTexture,
  rng,
  salameTexture,
  sauceTexture,
  setTexScale,
  smoothstep,
  softSprite,
  woodTexture,
} from "./textures";

/* =====================================================================
 * Scena 3D della pizza guidata dallo scroll (progresso 0 → 1):
 *  0.00–0.17  l'impasto viene lanciato e steso
 *  0.17–0.34  la salsa di pomodoro si allarga
 *  0.34–0.46  mozzarella (fior di latte) e bocconcini
 *  0.46–0.60  salame piccante, granella di pistacchio, filo d'olio
 *  0.60–0.82  nel forno: cottura, bolle, dorature, bagliore
 *  0.82–1.00  fuori dal forno: basilico, vapore, taglio
 * ===================================================================== */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

type V3 = [number, number, number];
const CAMERA_KEYS: { p: number; pos: V3; look: V3 }[] = [
  { p: 0.0, pos: [0, 2.4, 7.4], look: [0, 0.9, 0] },
  { p: 0.17, pos: [0, 5.0, 5.6], look: [0, 0.1, 0] },
  { p: 0.34, pos: [2.4, 5.6, 3.5], look: [0, 0.1, 0] },
  { p: 0.5, pos: [-2.1, 3.7, 3.1], look: [0, 0.2, 0] },
  { p: 0.6, pos: [0, 3.6, 5.0], look: [0, 0.1, 0] },
  { p: 0.72, pos: [0, 1.8, 4.3], look: [0, 0.25, -1.6] },
  { p: 0.86, pos: [1.3, 3.1, 4.7], look: [0, 0.25, 0] },
  { p: 1.0, pos: [-1.3, 4.5, 4.3], look: [0, 0.2, 0] },
];

function sampleCamera(p: number, pos: THREE.Vector3, look: THREE.Vector3) {
  let i = 0;
  while (i < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[i + 1].p) i++;
  const a = CAMERA_KEYS[i];
  const b = CAMERA_KEYS[i + 1];
  const t = ease(clamp01((p - a.p) / (b.p - a.p)));
  pos.set(lerp(a.pos[0], b.pos[0], t), lerp(a.pos[1], b.pos[1], t), lerp(a.pos[2], b.pos[2], t));
  look.set(lerp(a.look[0], b.look[0], t), lerp(a.look[1], b.look[1], t), lerp(a.look[2], b.look[2], t));
}

/* ---------- iniezioni negli shader standard di three ---------- */
type Shader = { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string };

function patchMaterial(
  mat: THREE.Material,
  key: string,
  opts: { bake?: { uBake: THREE.IUniform<number>; raw: THREE.Color }; reveal?: THREE.IUniform<number> },
) {
  mat.onBeforeCompile = (shader: Shader) => {
    let vHead = "";
    let fHead = "";
    if (opts.bake) {
      shader.uniforms.uBake = opts.bake.uBake;
      shader.uniforms.uRaw = { value: opts.bake.raw };
      fHead += "uniform float uBake;\nuniform vec3 uRaw;\n";
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  float bakeLuma = dot( sampledDiffuseColor.rgb, vec3( 0.299, 0.587, 0.114 ) );
  vec3 rawColor = uRaw * ( 0.62 + 0.38 * bakeLuma );
  sampledDiffuseColor.rgb = mix( rawColor, sampledDiffuseColor.rgb, uBake );
  diffuseColor *= sampledDiffuseColor;
#endif`,
      );
    }
    if (opts.reveal) {
      shader.uniforms.uReveal = opts.reveal;
      vHead += "varying vec3 vObj;\n";
      fHead += "varying vec3 vObj;\nuniform float uReveal;\n";
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
  if ( uReveal < 0.999 ) {
    float revAng = atan( vObj.z, vObj.x );
    float revR = uReveal * ${(WORLD * 0.78).toFixed(3)} * ( 1.0 + 0.07 * sin( revAng * 5.0 + uReveal * 9.0 ) + 0.04 * sin( revAng * 11.0 - uReveal * 5.0 ) );
    if ( length( vObj.xz ) > revR ) discard;
  }`,
      );
    }
    shader.vertexShader = vHead + shader.vertexShader;
    shader.fragmentShader = fHead + shader.fragmentShader;
  };
  mat.customProgramCacheKey = () => key;
}

/* ---------- geometrie ---------- */
function buildCrust(lite: boolean) {
  const bottom = [new THREE.Vector2(0, 0), new THREE.Vector2(0.9, 0)];
  const rimCtrl = [
    [1.6, 0],
    [1.92, 0.012],
    [2.06, 0.07],
    [2.13, 0.19],
    [2.1, 0.31],
    [2.0, 0.41],
    [1.86, 0.45],
    [1.74, 0.4],
    [1.66, 0.3],
    [1.6, 0.2],
    [1.52, 0.155],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const rim = new THREE.SplineCurve(rimCtrl).getPoints(lite ? 32 : 56);
  const top = [new THREE.Vector2(0.9, 0.15), new THREE.Vector2(0, 0.15)];
  let geo: THREE.BufferGeometry = new THREE.LatheGeometry([...bottom, ...rim, ...top], lite ? 96 : 200);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const ang = Math.atan2(z, x);
    const w = smoothstep(1.55, 2.05, r);
    const lump = fbm(Math.cos(ang) * 1.7 + 9, Math.sin(ang) * 1.7 + 9, 3, 7) - 0.5;
    const bl = Math.max(0, fbm(x * 3.4, z * 3.4, 3, 12) - 0.5);
    const up = smoothstep(0.02, 0.25, y);
    const nr = r * (1 + 0.04 * lump * w);
    y += up * w * (0.1 * lump + 0.2 * bl);
    x = Math.cos(ang) * nr;
    z = Math.sin(ang) * nr;
    pos.setXYZ(i, x, y, z);
  }
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  geo = mergeVertices(geo, 1e-4);
  geo.computeVertexNormals();
  planarUV(geo);
  return geo;
}

function planarUV(geo: THREE.BufferGeometry) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const rr = Math.hypot(x, z);
    // sul fianco del cornicione la texture scorre verso l'esterno in base all'altezza
    const k = rr > 1.5 ? 1 + (Math.max(0, 0.46 - pos.getY(i)) * 0.85) / Math.max(rr, 0.001) * smoothstep(1.5, 1.9, rr) : 1;
    uv[i * 2] = (x * k) / (2 * WORLD) + 0.5;
    uv[i * 2 + 1] = (z * k) / (2 * WORLD) + 0.5;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

function buildDisc(radius: number, rings: number, segs: number, height: (x: number, z: number) => number) {
  const geo = new THREE.RingGeometry(0.0001, radius, segs, rings);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  planarUV(geo);
  return geo;
}

function buildSalameGeo(lite: boolean) {
  const geo = new THREE.CylinderGeometry(0.255, 0.255, 0.034, lite ? 16 : 32, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const rr = Math.hypot(pos.getX(i), pos.getZ(i)) / 0.255;
    pos.setY(i, pos.getY(i) + 0.05 * rr * rr);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildLeafGeo(lite: boolean) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.2, 0.08, 0.27, 0.34, 0.02, 0.62);
  s.lineTo(0, 0.64);
  s.lineTo(-0.02, 0.62);
  s.bezierCurveTo(-0.27, 0.34, -0.2, 0.08, 0, 0);
  const geo = new THREE.ShapeGeometry(s, lite ? 8 : 18);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv[i * 2] = x / 0.6 + 0.5;
    uv[i * 2 + 1] = y / 0.66;
    // la foglia si ripiega sulla nervatura e si arriccia in punta
    pos.setZ(i, 0.07 * Math.abs(x) + 0.12 * y * y);
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/* ---------- scena ---------- */
export interface PizzaScene {
  setProgress: (p: number, immediate?: boolean) => void;
  setActive: (on: boolean) => void;
  resize: () => void;
  dispose: () => void;
}

interface Drop {
  obj: THREE.Object3D;
  start: number;
  dur: number;
  rest: THREE.Vector3;
  rotY: number;
  spin: number;
  scale: THREE.Vector3;
  kind: "mozz" | "salame" | "basil";
}

export function createPizzaScene(container: HTMLElement): PizzaScene {
  // telefono / dispositivo debole: niente antialias nativo, niente ombre, pixel ratio basso, geometrie e texture ridotte
  const coarse = window.matchMedia("(pointer: coarse)").matches || Math.min(window.innerWidth, window.innerHeight) < 700;
  const lowCpu = (navigator.hardwareConcurrency || 8) <= 4;
  const lite = coarse || lowCpu;
  setTexScale(lite ? 0.5 : 1);
  const renderer = new THREE.WebGLRenderer({ antialias: !lite, powerPreference: lite ? "default" : "high-performance" });
  const maxDpr = lite ? 1.25 : 2;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
  container.appendChild(renderer.domElement);
  const aniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f0b09);
  const pmrem = new THREE.PMREMGenerator(renderer);
  if (!lite) {
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.32;
  }
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);

  /* luci */
  scene.add(new THREE.HemisphereLight(0xffe9d0, 0x2a140a, lite ? 0.95 : 0.55));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(3.6, 7.5, 4.2);
  key.castShadow = !lite;
  key.shadow.mapSize.set(1536, 1536);
  Object.assign(key.shadow.camera, { left: -3.6, right: 3.6, top: 3.6, bottom: -3.6, near: 1, far: 20 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9a55, 1.1);
  rim.position.set(-5, 3, -4);
  scene.add(rim);
  const fire = new THREE.PointLight(0xff6a1c, 0, 14, 1.6);
  fire.position.set(0, 1.4, -3.4);
  scene.add(fire);

  /* sfondo: bagliore del forno + braci */
  const glowTex = ovenGlowTexture();
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 10),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.position.set(0, 1.2, -7);
  scene.add(glow);

  const EMBERS = lite ? 40 : 140;
  const emberPos = new Float32Array(EMBERS * 3);
  const emberSpeed = new Float32Array(EMBERS);
  const er = rng(5);
  for (let i = 0; i < EMBERS; i++) {
    emberPos[i * 3] = (er() - 0.5) * 12;
    emberPos[i * 3 + 1] = er() * 7 - 1;
    emberPos[i * 3 + 2] = (er() - 0.5) * 9 - 1;
    emberSpeed[i] = 0.2 + er() * 0.55;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
  const emberTex = softSprite("rgba(255,190,100,1)", "rgba(255,120,30,0)");
  const emberMat = new THREE.PointsMaterial({ map: emberTex, size: 0.14, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffa860 });
  const embers = new THREE.Points(emberGeo, emberMat);
  scene.add(embers);

  /* ---------- pala + pizza ---------- */
  const rig = new THREE.Group();
  scene.add(rig);

  const woodTex = woodTexture(aniso);
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.82, metalness: 0, transparent: true });
  const boardGeo = new THREE.CylinderGeometry(2.62, 2.62, 0.09, lite ? 48 : 96);
  const board = new THREE.Mesh(boardGeo, woodMat);
  board.position.y = -0.05;
  board.receiveShadow = true;
  board.castShadow = true;
  const handleGeo = new THREE.BoxGeometry(3.6, 0.09, 0.72);
  const handle = new THREE.Mesh(handleGeo, woodMat);
  handle.position.set(3.9, -0.05, 0);
  handle.castShadow = true;
  handle.receiveShadow = true;
  rig.add(board, handle);

  const pizza = new THREE.Group();
  rig.add(pizza);

  const bake: THREE.IUniform<number> = { value: 0 };
  const sauceReveal: THREE.IUniform<number> = { value: 0 };
  const cheeseReveal: THREE.IUniform<number> = { value: 0 };

  const doughTex = doughTexture(aniso);
  const bumpTex = doughBump(aniso);
  const crustGeo = buildCrust(lite);
  const crustMat = new THREE.MeshStandardMaterial({ map: doughTex, bumpMap: bumpTex, bumpScale: 2.2, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  patchMaterial(crustMat, "crust", { bake: { uBake: bake, raw: new THREE.Color(0.93, 0.84, 0.66) } });
  const crust = new THREE.Mesh(crustGeo, crustMat);
  crust.castShadow = true;
  crust.receiveShadow = true;
  pizza.add(crust);

  const sauceTex = sauceTexture(aniso);
  const sauceGeo = buildDisc(1.68, lite ? 16 : 36, lite ? 72 : 160, (x, z) => 0.158 + 0.018 * fbm(x * 3, z * 3, 3, 40));
  const sauceMat = new THREE.MeshPhysicalMaterial({ map: sauceTex, roughness: 0.38, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.3 });
  patchMaterial(sauceMat, "sauce", { reveal: sauceReveal });
  const sauce = new THREE.Mesh(sauceGeo, sauceMat);
  sauce.receiveShadow = true;
  pizza.add(sauce);

  const cheeseTex = cheeseTexture(aniso);
  const cheeseGeo = buildDisc(1.64, lite ? 30 : 70, lite ? 72 : 160, (x, z) => 0.185 + 0.075 * smoothstep(0.4, 0.62, cheeseField(x, z)));
  const cheeseMat = new THREE.MeshPhysicalMaterial({
    map: cheeseTex,
    transparent: true,
    alphaTest: 0.42,
    roughness: 0.46,
    clearcoat: 0.4,
    clearcoatRoughness: 0.35,
    side: THREE.DoubleSide,
  });
  patchMaterial(cheeseMat, "cheese", { reveal: cheeseReveal, bake: { uBake: bake, raw: new THREE.Color(1, 0.98, 0.93) } });
  const cheese = new THREE.Mesh(cheeseGeo, cheeseMat);
  cheese.castShadow = true;
  cheese.receiveShadow = true;
  pizza.add(cheese);

  const cheeseTop = (x: number, z: number) => 0.185 + 0.075 * smoothstep(0.4, 0.62, cheeseField(x, z));

  /* ---------- topping che cadono ---------- */
  const drops: Drop[] = [];
  const r = rng(2024);
  const spot = (i: number, n: number, maxR: number, jitter: number) => {
    const rr = Math.sqrt((i + 0.5) / n) * maxR;
    const a = i * 2.39996 + (r() - 0.5) * jitter;
    return [Math.cos(a) * rr, Math.sin(a) * rr] as const;
  };

  // bocconcini di fior di latte che si sciolgono in forno
  const mozzGeo = new THREE.SphereGeometry(0.2, lite ? 14 : 24, lite ? 10 : 16);
  const mozzMat = new THREE.MeshPhysicalMaterial({ color: 0xfffaf0, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const mozzBase: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const [x, z] = spot(i, 8, 1.3, 0.9);
    const m = new THREE.Mesh(mozzGeo, mozzMat);
    m.castShadow = true;
    m.receiveShadow = true;
    const sc = 0.85 + r() * 0.45;
    const s = new THREE.Vector3(sc * 1.1, sc * 0.62, sc);
    m.scale.copy(s);
    pizza.add(m);
    mozzBase.push(m);
    drops.push({ obj: m, start: 0.37 + i * 0.008, dur: 0.07, rest: new THREE.Vector3(x, cheeseTop(x, z) + 0.06 * sc, z), rotY: r() * 6, spin: 1.6, scale: s, kind: "mozz" });
  }

  // salame piccante
  const salameGeo = buildSalameGeo(lite);
  const salameTexMap = salameTexture(aniso);
  const salameMat = new THREE.MeshStandardMaterial({ map: salameTexMap, roughness: 0.5, metalness: 0.02 });
  for (let i = 0; i < 13; i++) {
    const [x, z] = spot(i, 13, 1.38, 0.5);
    const m = new THREE.Mesh(salameGeo, salameMat);
    m.castShadow = true;
    m.receiveShadow = true;
    const s = new THREE.Vector3(1, 1, 1);
    pizza.add(m);
    drops.push({ obj: m, start: 0.455 + i * 0.0085, dur: 0.075, rest: new THREE.Vector3(x, cheeseTop(x, z) + 0.035, z), rotY: r() * 6, spin: 2.4, scale: s, kind: "salame" });
  }

  // granella di pistacchio (istanziata)
  const PIST = lite ? 40 : 90;
  const pistGeo = new THREE.DodecahedronGeometry(0.034, 0);
  const pistMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.02 });
  const pist = new THREE.InstancedMesh(pistGeo, pistMat, PIST);
  pist.castShadow = true;
  const pistRest: { x: number; z: number; y: number; delay: number; rx: number; rz: number; s: number }[] = [];
  const col = new THREE.Color();
  for (let i = 0; i < PIST; i++) {
    const [x, z] = spot(i, PIST, 1.45, 3);
    pistRest.push({ x, z, y: cheeseTop(x, z) + 0.05 + r() * 0.04, delay: r() * 0.05, rx: r() * 6, rz: r() * 6, s: 0.7 + r() * 0.8 });
    col.setHSL(0.25 + r() * 0.06, 0.45 + r() * 0.2, 0.28 + r() * 0.12);
    pist.setColorAt(i, col);
  }
  pizza.add(pist);

  // basilico fresco: aggiunto a fine cottura
  const leafGeo = buildLeafGeo(lite);
  const basilTex = basilTexture(aniso);
  const leafMat = new THREE.MeshStandardMaterial({ map: basilTex, roughness: 0.5, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const [x, z] = spot(i, 8, 1.15, 1.2);
    const m = new THREE.Mesh(leafGeo, leafMat);
    m.castShadow = true;
    const sc = 0.85 + r() * 0.5;
    const s = new THREE.Vector3(sc, sc, sc);
    m.scale.copy(s);
    pizza.add(m);
    drops.push({ obj: m, start: 0.83 + i * 0.012, dur: 0.07, rest: new THREE.Vector3(x, cheeseTop(x, z) + 0.07, z), rotY: r() * 6.28, spin: 3.4, scale: s, kind: "basil" });
  }

  // filo d'olio extravergine a spirale
  const oilPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 220; i++) {
    const t = i / 220;
    const a = t * Math.PI * 2 * 3.4;
    const rr = 0.14 + t * 1.3 + 0.07 * Math.sin(a * 3.1);
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    oilPts.push(new THREE.Vector3(x, cheeseTop(x, z) + 0.05, z));
  }
  const oilGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(oilPts), lite ? 200 : 520, 0.0125, lite ? 5 : 7, false);
  const oilMat = new THREE.MeshPhysicalMaterial({ color: 0xe6b422, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.82, ior: 1.47 });
  const oil = new THREE.Mesh(oilGeo, oilMat);
  oil.castShadow = false;
  pizza.add(oil);
  const oilIndexCount = oilGeo.index!.count;

  // tagli della rotella
  const cutMat = new THREE.MeshBasicMaterial({ color: 0x2a1408, transparent: true, opacity: 0.38, depthWrite: false });
  const cutGeo = new THREE.BoxGeometry(4.22, 0.01, 0.012);
  const cuts: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(cutGeo, cutMat);
    c.rotation.y = (i * Math.PI) / 3 + 0.2;
    c.position.y = 0.36;
    c.renderOrder = 5;
    pizza.add(c);
    cuts.push(c);
  }

  // vapore
  const steamTex = softSprite("rgba(255,255,255,0.9)", "rgba(255,255,255,0)");
  const steam: { s: THREE.Sprite; phase: number; x: number; z: number; mat: THREE.SpriteMaterial }[] = [];
  const sr = rng(808);
  for (let i = 0; i < (lite ? 12 : 34); i++) {
    const mat = new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false, color: 0xffffff });
    const s = new THREE.Sprite(mat);
    scene.add(s);
    steam.push({ s, phase: sr(), x: (sr() - 0.5) * 2.6, z: (sr() - 0.5) * 2.6, mat });
  }

  /* ---------- aggiornamento in base al progresso ---------- */
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const lookNow = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let progress = 0;
  let target = 0;
  let active = true;
  let time = 0;
  let aspectBoost = 1;

  const onPointer = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    mouse.tx = ((e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    mouse.ty = ((e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
  };
  if (!lite) window.addEventListener("pointermove", onPointer, { passive: true });

  function apply(p: number, dt: number) {
    // 1) impasto lanciato e steso
    const toss = seg(p, 0, 0.17);
    const stretch = ease(seg(p, 0.01, 0.15));
    const sxz = lerp(0.55, 1, stretch);
    const sy = lerp(1.9, 1, stretch);
    pizza.scale.set(sxz, sy, sxz);
    const air = Math.sin(Math.PI * toss);
    pizza.position.y = 1.55 * air * (1 - 0.15 * toss);
    pizza.rotation.x = 0.55 * air;
    pizza.rotation.z = -0.25 * air;
    pizza.rotation.y = easeOut(toss) * Math.PI * 5 + (p > 0.17 ? (p - 0.17) * Math.PI * 1.9 : 0) + time * 0.05;

    // la pala compare quando l'impasto atterra
    const boardIn = ease(seg(p, 0.1, 0.19));
    woodMat.opacity = boardIn;
    board.visible = handle.visible = boardIn > 0.01;
    board.position.y = -0.05 - (1 - boardIn) * 0.6;
    handle.position.y = board.position.y;

    // 2) salsa e formaggio
    sauceReveal.value = ease(seg(p, 0.17, 0.31));
    cheeseReveal.value = ease(seg(p, 0.33, 0.42));
    sauce.visible = sauceReveal.value > 0.002;
    cheese.visible = cheeseReveal.value > 0.002;

    // 3) cottura
    const b = ease(seg(p, 0.64, 0.8));
    bake.value = b;
    const sc = 1 - 0.18 * b;
    sauceMat.color.setRGB(sc, sc * 0.97, sc * 0.95);

    // 4) topping
    for (const d of drops) {
      const t = seg(p, d.start, d.start + d.dur);
      d.obj.visible = t > 0;
      if (t <= 0) continue;
      const e = easeOut(t);
      const bounce = t > 0.72 ? Math.sin(((t - 0.72) / 0.28) * Math.PI) * 0.045 * (1 - t) * 4 : 0;
      d.obj.position.set(d.rest.x, d.rest.y + (1 - e) * 3.1 + bounce, d.rest.z);
      d.obj.rotation.y = d.rotY + (1 - e) * d.spin;
      const pop = lerp(0.55, 1, e);
      if (d.kind === "mozz") {
        d.obj.scale.set(d.scale.x * pop * (1 + 0.45 * b), d.scale.y * pop * (1 - 0.62 * b), d.scale.z * pop * (1 + 0.45 * b));
        d.obj.position.y = d.rest.y - 0.05 * b + (1 - e) * 3.1 + bounce;
      } else if (d.kind === "salame") {
        d.obj.scale.setScalar(pop);
        d.obj.scale.y = lerp(1, 0.8, b);
        d.obj.rotation.x = (1 - e) * 1.4 + 0.04 * b;
      } else {
        d.obj.scale.set(d.scale.x * pop, d.scale.y * pop, d.scale.z * pop);
        d.obj.rotation.x = (1 - e) * 2.2;
      }
    }
    mozzMat.color.setRGB(1 - 0.06 * b, 0.98 - 0.16 * b, 0.94 - 0.3 * b);

    pist.visible = p > 0.5;
    for (let i = 0; i < PIST; i++) {
      const it = pistRest[i];
      const t = seg(p, 0.5 + it.delay, 0.5 + it.delay + 0.05);
      const e = easeOut(t);
      dummy.position.set(it.x, it.y + (1 - e) * 2.6, it.z);
      dummy.rotation.set(it.rx + (1 - e) * 5, it.rz, it.rx);
      dummy.scale.setScalar(t > 0 ? it.s * lerp(0.4, 1, e) : 0.0001);
      dummy.updateMatrix();
      pist.setMatrixAt(i, dummy.matrix);
    }
    pist.instanceMatrix.needsUpdate = true;

    // olio
    const oilT = seg(p, 0.545, 0.605);
    oil.visible = oilT > 0;
    oilGeo.setDrawRange(0, Math.floor((oilIndexCount * oilT) / 3) * 3);

    // 5) forno: la pala entra, bagliore, camera
    const oven = ease(seg(p, 0.6, 0.7)) - ease(seg(p, 0.76, 0.86));
    rig.position.z = -2.4 * oven;
    rig.position.y = 0;
    const glowAmt = clamp01(oven * 1.15);
    const flick = 1 + 0.07 * Math.sin(time * 13) + 0.05 * Math.sin(time * 27.3) + 0.03 * Math.sin(time * 5.1);
    fire.intensity = (0.4 + 20 * glowAmt) * flick;
    (glow.material as THREE.MeshBasicMaterial).opacity = (0.08 + 0.62 * glowAmt) * flick;
    emberMat.opacity = 0.25 + 0.6 * glowAmt;
    emberMat.size = 0.12 + 0.1 * glowAmt;
    rim.intensity = 1.1 + 0.8 * glowAmt;
    (scene.background as THREE.Color).setRGB(0.058 + 0.05 * glowAmt, 0.043 + 0.014 * glowAmt, 0.036 + 0.004 * glowAmt);
    renderer.toneMappingExposure = 1.12 - 0.08 * glowAmt;

    // 6) servita: vapore e tagli
    const steamAmt = ease(seg(p, 0.8, 0.9));
    steam.forEach((st) => {
      const k = (time * 0.18 + st.phase) % 1;
      const wob = Math.sin(time * 1.1 + st.phase * 9) * 0.22 * k;
      st.s.position.set(st.x * 0.6 + wob, 0.55 + k * 2.6, st.z * 0.6 + rig.position.z);
      const sz = 0.7 + k * 1.9;
      st.s.scale.set(sz, sz, 1);
      st.mat.opacity = steamAmt * Math.sin(Math.PI * k) * 0.2;
      st.s.visible = steamAmt > 0.01;
    });
    const cutAmt = ease(seg(p, 0.9, 0.96));
    cuts.forEach((c) => {
      c.visible = cutAmt > 0.01;
      c.scale.x = Math.max(cutAmt, 0.001);
    });

    // brace
    for (let i = 0; i < EMBERS; i++) {
      let y = emberPos[i * 3 + 1] + emberSpeed[i] * dt * (0.6 + 2.2 * glowAmt);
      if (y > 6.5) y = -1;
      emberPos[i * 3 + 1] = y;
      emberPos[i * 3] += Math.sin(time * 0.8 + i) * 0.0025;
    }
    emberGeo.attributes.position.needsUpdate = true;

    // camera
    sampleCamera(p, camPos, camLook);
    camPos.sub(camLook).multiplyScalar(aspectBoost).add(camLook);
    camPos.x += mouse.x * 0.35;
    camPos.y -= mouse.y * 0.2;
    camera.position.copy(camPos);
    lookNow.copy(camLook);
    camera.lookAt(lookNow);
  }

  /* ---------- loop ---------- */
  let raf = 0;
  let last = performance.now();
  let disposed = false;
  let forceRender = true;
  let slowAcc = 0.016;
  let idleTick = 0;

  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!active && !forceRender) return;
    // dispositivo lento: se i frame durano troppo scala la risoluzione, se vanno bene la rialza
    slowAcc = slowAcc * 0.92 + Math.min(dt, 0.1) * 0.08;
    if (slowAcc > 0.034 && dpr > 0.75) {
      dpr = Math.max(0.75, dpr - 0.25);
      renderer.setPixelRatio(dpr);
      renderer.setSize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1), false);
      slowAcc = 0.02;
    }
    // su telefono ridisegna solo quando lo scroll muove l'animazione (o ogni tanto per il bagliore del forno)
    const moving = Math.abs(target - progress) > 0.00005;
    if (lite && !moving && !forceRender) {
      idleTick += dt;
      if (idleTick < 0.12) return;
    }
    idleTick = 0;
    time += dt;
    progress += (target - progress) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - progress) < 0.00005) progress = target;
    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 3));
    mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 3));
    apply(progress, dt);
    renderer.render(scene, camera);
    forceRender = false;
  }
  raf = requestAnimationFrame(frame);

  function resize() {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // su schermi stretti allontana la camera per inquadrare tutta la pizza
    aspectBoost = 1.25 * (camera.aspect < 1 ? lerp(1.0, 1.65, clamp01((1 - camera.aspect) / 0.6)) : 1);
    // su schermi larghi sposta la pizza verso destra, lasciando spazio al testo
    if (camera.aspect > 1.35) camera.setViewOffset(w, h, -w * 0.13, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    forceRender = true;
  }
  resize();

  return {
    setProgress(p, immediate = false) {
      target = clamp01(p);
      if (immediate) progress = target;
    },
    setActive(on) {
      active = on;
      if (on) forceRender = true;
    },
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      [doughTex, bumpTex, sauceTex, cheeseTex, salameTexMap, basilTex, woodTex, glowTex, emberTex, steamTex].forEach((t) => t.dispose());
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
