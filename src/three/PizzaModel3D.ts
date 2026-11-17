import * as THREE from 'three';
import type { CustomPizzaConfig, DoughType, SauceBase, ToppingId } from '../types';
import {
  createContactShadowTexture,
  createDoughTexture,
  createPeelWoodTexture,
  createSauceTexture,
} from './pizzaTextures';

interface LayerTarget {
  group: THREE.Group;
  baseY: number;
  explodeOffset: number;
}

export interface PizzaRig3D {
  root: THREE.Group;
  setConfig: (config: CustomPizzaConfig) => void;
  setExplode: (factor: number) => void;
  updateAnimation: (delta: number, elapsed: number) => void;
  dispose: () => void;
}

function createLeafGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.14, 0.08, 0.16, 0.26, 0, 0.36);
  shape.bezierCurveTo(-0.16, 0.26, -0.14, 0.08, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  geo.center();
  return geo;
}

function createPeelGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const r = 1.92;
  shape.absarc(0, 0, r, 0.24, Math.PI * 2 - 0.24, false);
  // Handle extension
  shape.lineTo(r + 1.35, -0.22);
  shape.quadraticCurveTo(r + 1.5, 0, r + 1.35, 0.22);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3,
    curveSegments: 36,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function createCornicioneGeometry(): THREE.LatheGeometry {
  // Cross-section from center (x=0) out to puffy blistered rim (x=1.65)
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(1.22, 0.0),
    new THREE.Vector2(1.48, 0.01),
    new THREE.Vector2(1.66, 0.06),
    new THREE.Vector2(1.69, 0.15),
    new THREE.Vector2(1.61, 0.25),
    new THREE.Vector2(1.48, 0.26),
    new THREE.Vector2(1.36, 0.19),
    new THREE.Vector2(1.26, 0.085),
    new THREE.Vector2(0.0, 0.07),
  ];
  const geo = new THREE.LatheGeometry(pts, 64);
  geo.computeVertexNormals();
  return geo;
}

const TOPPING_COORDS: [number, number][] = [
  [0.52, 0.28],
  [-0.58, 0.22],
  [0.14, -0.64],
  [-0.24, 0.68],
  [0.74, -0.42],
  [-0.76, -0.34],
  [0.02, 0.08],
  [0.36, 0.78],
  [-0.48, -0.78],
  [0.88, 0.12],
  [-0.9, 0.04],
  [-0.08, -0.35],
];

export function createPizzaRig3D(maxAnisotropy: number): PizzaRig3D {
  const root = new THREE.Group();
  const scaleGroup = new THREE.Group();
  root.add(scaleGroup);

  const disposableTextures: THREE.Texture[] = [];
  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];

  const doughTexMap: Record<DoughType, THREE.CanvasTexture> = {
    classico: createDoughTexture('classico', maxAnisotropy),
    integrale: createDoughTexture('integrale', maxAnisotropy),
    carbone: createDoughTexture('carbone', maxAnisotropy),
  };
  const sauceTexMap: Record<SauceBase, THREE.CanvasTexture> = {
    pomodoro: createSauceTexture('pomodoro', maxAnisotropy),
    bianca: createSauceTexture('bianca', maxAnisotropy),
    pistacchio: createSauceTexture('pistacchio', maxAnisotropy),
  };
  const woodTex = createPeelWoodTexture(maxAnisotropy);
  const shadowTex = createContactShadowTexture();

  disposableTextures.push(
    ...Object.values(doughTexMap),
    ...Object.values(sauceTexMap),
    woodTex,
    shadowTex,
  );

  // Layer 0: Contact Shadow + Wooden Peel
  const peelLayer = new THREE.Group();
  const shadowGeo = new THREE.PlaneGeometry(5.6, 5.6);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.position.y = -0.14;
  peelLayer.add(shadowPlane);

  const peelGeo = createPeelGeometry();
  const peelMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.78,
    metalness: 0.04,
  });
  const peelMesh = new THREE.Mesh(peelGeo, peelMat);
  peelMesh.position.y = -0.1;
  peelMesh.rotation.y = -0.45;
  peelMesh.castShadow = true;
  peelMesh.receiveShadow = true;
  peelLayer.add(peelMesh);
  scaleGroup.add(peelLayer);

  // Layer 1: Dough & Cornicione
  const doughLayer = new THREE.Group();
  const crustGeo = createCornicioneGeometry();
  const crustMat = new THREE.MeshStandardMaterial({
    map: doughTexMap.classico,
    roughness: 0.88,
    metalness: 0.02,
  });
  const crustMesh = new THREE.Mesh(crustGeo, crustMat);
  crustMesh.castShadow = true;
  crustMesh.receiveShadow = true;
  doughLayer.add(crustMesh);
  scaleGroup.add(doughLayer);

  // Layer 2: Sauce Base
  const sauceLayer = new THREE.Group();
  const sauceGeo = new THREE.CylinderGeometry(1.31, 1.31, 0.025, 56);
  const sauceMat = new THREE.MeshPhysicalMaterial({
    map: sauceTexMap.pomodoro,
    roughness: 0.28,
    metalness: 0.0,
    clearcoat: 0.65,
    clearcoatRoughness: 0.22,
  });
  const sauceMesh = new THREE.Mesh(sauceGeo, sauceMat);
  sauceMesh.position.y = 0.088;
  sauceMesh.receiveShadow = true;
  sauceLayer.add(sauceMesh);
  scaleGroup.add(sauceLayer);

  // Layer 3: Melted Fior di Latte Mozzarella
  const mozzarellaLayer = new THREE.Group();
  const mozzGeo = new THREE.SphereGeometry(0.22, 20, 14);
  const mozzMat = new THREE.MeshPhysicalMaterial({
    color: 0xfff8eb,
    roughness: 0.26,
    metalness: 0.0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
  });
  const mozzPositions: [number, number, number][] = [
    [0.0, 0.0, 1.15],
    [0.54, 0.42, 0.95],
    [-0.58, 0.36, 1.0],
    [0.44, -0.56, 1.05],
    [-0.46, -0.52, 0.92],
    [0.86, -0.08, 0.85],
    [-0.84, -0.06, 0.88],
    [-0.08, 0.78, 0.9],
    [0.05, -0.82, 0.86],
  ];
  mozzPositions.forEach(([x, z, s], idx) => {
    const m = new THREE.Mesh(mozzGeo, mozzMat);
    m.position.set(x, 0.115, z);
    m.scale.set(s * 1.15, 0.18, s * 0.92);
    m.rotation.y = idx * 0.8;
    m.castShadow = true;
    m.receiveShadow = true;
    mozzarellaLayer.add(m);
  });
  scaleGroup.add(mozzarellaLayer);

  // Layer 4: Dynamic Toppings Group
  const toppingsLayer = new THREE.Group();
  scaleGroup.add(toppingsLayer);

  // Shared topping geometries & materials
  const salameGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.022, 24);
  const salameMat = new THREE.MeshStandardMaterial({
    color: 0xa61d1d,
    roughness: 0.42,
    metalness: 0.05,
  });
  const mortadellaGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.018, 24);
  const mortadellaMat = new THREE.MeshStandardMaterial({
    color: 0xe69597,
    roughness: 0.38,
    metalness: 0.02,
  });
  const porchettaGeo = new THREE.BoxGeometry(0.26, 0.036, 0.2);
  const porchettaMat = new THREE.MeshStandardMaterial({
    color: 0xc27b48,
    roughness: 0.56,
    metalness: 0.04,
  });
  const crocchettaGeo = new THREE.CapsuleGeometry(0.085, 0.14, 6, 12);
  crocchettaGeo.rotateZ(Math.PI / 2);
  const crocchettaMat = new THREE.MeshStandardMaterial({
    color: 0xd99429,
    roughness: 0.82,
    metalness: 0.02,
  });
  const pistachioGeo = new THREE.DodecahedronGeometry(0.035, 0);
  const pistachioMat = new THREE.MeshStandardMaterial({
    color: 0x76b041,
    roughness: 0.72,
    metalness: 0.02,
  });
  const mushroomCapGeo = new THREE.SphereGeometry(0.11, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const mushroomMat = new THREE.MeshStandardMaterial({
    color: 0x9b826b,
    roughness: 0.75,
  });
  const oliveGeo = new THREE.TorusGeometry(0.065, 0.028, 10, 18);
  oliveGeo.rotateX(Math.PI / 2);
  const oliveMat = new THREE.MeshStandardMaterial({
    color: 0x1a191b,
    roughness: 0.28,
    metalness: 0.08,
  });
  const onionGeo = new THREE.TorusGeometry(0.11, 0.016, 8, 20);
  onionGeo.rotateX(Math.PI / 2);
  const onionMat = new THREE.MeshStandardMaterial({
    color: 0x942e6a,
    roughness: 0.4,
  });
  const basilGeo = createLeafGeometry();
  const basilMat = new THREE.MeshStandardMaterial({
    color: 0x2f7a32,
    roughness: 0.45,
    metalness: 0.02,
  });

  disposableGeometries.push(
    shadowGeo,
    peelGeo,
    crustGeo,
    sauceGeo,
    mozzGeo,
    salameGeo,
    mortadellaGeo,
    porchettaGeo,
    crocchettaGeo,
    pistachioGeo,
    mushroomCapGeo,
    oliveGeo,
    onionGeo,
    basilGeo,
  );
  disposableMaterials.push(
    shadowMat,
    peelMat,
    crustMat,
    sauceMat,
    mozzMat,
    salameMat,
    mortadellaMat,
    porchettaMat,
    crocchettaMat,
    pistachioMat,
    mushroomMat,
    oliveMat,
    onionMat,
    basilMat,
  );

  // Build sub-groups per topping so toggling is instant and leak-free
  const toppingGroups: Record<ToppingId, THREE.Group> = {
    salame: new THREE.Group(),
    mortadella: new THREE.Group(),
    porchetta: new THREE.Group(),
    crocchette: new THREE.Group(),
    pistacchio: new THREE.Group(),
    funghi: new THREE.Group(),
    olive: new THREE.Group(),
    cipolla: new THREE.Group(),
    basilico: new THREE.Group(),
  };

  TOPPING_COORDS.slice(0, 8).forEach(([x, z], i) => {
    const s = new THREE.Mesh(salameGeo, salameMat);
    s.position.set(x * 1.05, 0.142, z * 1.05);
    s.castShadow = true;
    toppingGroups.salame.add(s);

    const m = new THREE.Mesh(mortadellaGeo, mortadellaMat);
    m.position.set(x * 0.92, 0.138, z * 0.92);
    m.rotation.x = (i % 2 === 0 ? 1 : -1) * 0.04;
    m.castShadow = true;
    toppingGroups.mortadella.add(m);
  });

  TOPPING_COORDS.slice(0, 7).forEach(([x, z], i) => {
    const p = new THREE.Mesh(porchettaGeo, porchettaMat);
    p.position.set(x * 0.95, 0.15, z * 0.95);
    p.rotation.y = i * 0.9;
    p.castShadow = true;
    toppingGroups.porchetta.add(p);
  });

  TOPPING_COORDS.slice(1, 7).forEach(([x, z], i) => {
    const c = new THREE.Mesh(crocchettaGeo, crocchettaMat);
    c.position.set(x * 0.9, 0.185, z * 0.9);
    c.rotation.y = i * 1.1;
    c.castShadow = true;
    toppingGroups.crocchette.add(c);
  });

  // Pistacchio InstancedMesh (36 crunchy grains)
  const pistCount = 36;
  const pistInst = new THREE.InstancedMesh(pistachioGeo, pistachioMat, pistCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < pistCount; i++) {
    const angle = i * 2.39996;
    const rad = 0.18 + Math.sqrt(i / pistCount) * 0.95;
    dummy.position.set(Math.cos(angle) * rad, 0.165, Math.sin(angle) * rad);
    dummy.rotation.set(i, i * 0.7, 0);
    const sc = 0.8 + (i % 4) * 0.15;
    dummy.scale.set(sc, sc * 0.7, sc);
    dummy.updateMatrix();
    pistInst.setMatrixAt(i, dummy.matrix);
  }
  pistInst.instanceMatrix.needsUpdate = true;
  pistInst.computeBoundingSphere();
  toppingGroups.pistacchio.add(pistInst);

  TOPPING_COORDS.slice(0, 9).forEach(([x, z], i) => {
    const f = new THREE.Mesh(mushroomCapGeo, mushroomMat);
    f.position.set(x * 0.98, 0.135, z * 0.98);
    f.scale.set(1, 0.6, 1);
    f.rotation.y = i * 0.6;
    toppingGroups.funghi.add(f);

    const o = new THREE.Mesh(oliveGeo, oliveMat);
    o.position.set(x * 1.06, 0.148, z * 1.06);
    toppingGroups.olive.add(o);

    const cip = new THREE.Mesh(onionGeo, onionMat);
    cip.position.set(x * 0.88, 0.152, z * 0.88);
    cip.rotation.z = 0.08 * (i % 2 === 0 ? 1 : -1);
    toppingGroups.cipolla.add(cip);
  });

  const basilCoords: [number, number][] = [
    [0.0, 0.04],
    [0.55, 0.35],
    [-0.52, 0.32],
    [0.32, -0.58],
    [-0.36, -0.52],
  ];
  basilCoords.forEach(([x, z], i) => {
    const leaf = new THREE.Mesh(basilGeo, basilMat);
    leaf.position.set(x, 0.175, z);
    leaf.rotation.y = i * 1.25;
    leaf.rotation.x = 0.08;
    leaf.castShadow = true;
    toppingGroups.basilico.add(leaf);
  });

  (Object.keys(toppingGroups) as ToppingId[]).forEach((key) => {
    toppingsLayer.add(toppingGroups[key]);
  });

  const layers: LayerTarget[] = [
    { group: peelLayer, baseY: 0, explodeOffset: -0.35 },
    { group: doughLayer, baseY: 0, explodeOffset: 0.0 },
    { group: sauceLayer, baseY: 0, explodeOffset: 0.42 },
    { group: mozzarellaLayer, baseY: 0, explodeOffset: 0.78 },
    { group: toppingsLayer, baseY: 0, explodeOffset: 1.18 },
  ];

  let targetScale = 1.0;
  let currentScale = 1.0;
  let targetExplode = 0.0;
  let currentExplode = 0.0;

  function setConfig(config: CustomPizzaConfig) {
    targetScale = config.format === 'maxi' ? 1.22 : 1.0;
    crustMat.map = doughTexMap[config.dough];
    crustMat.needsUpdate = true;

    sauceMat.map = sauceTexMap[config.base];
    sauceMat.needsUpdate = true;

    (Object.keys(toppingGroups) as ToppingId[]).forEach((id) => {
      toppingGroups[id].visible = config.toppings.includes(id);
    });
  }

  function setExplode(factor: number) {
    targetExplode = THREE.MathUtils.clamp(factor, 0, 1);
  }

  function updateAnimation(delta: number, elapsed: number) {
    const dt = Math.min(delta, 0.05);
    currentScale = THREE.MathUtils.damp(currentScale, targetScale, 8, dt);
    currentExplode = THREE.MathUtils.damp(currentExplode, targetExplode, 7, dt);

    scaleGroup.scale.setScalar(currentScale);
    layers.forEach((layer) => {
      layer.group.position.y = layer.baseY + layer.explodeOffset * currentExplode;
    });

    // Subtle living hover on toppings when exploded
    if (currentExplode > 0.05) {
      toppingsLayer.position.y += Math.sin(elapsed * 2.2) * 0.02 * currentExplode;
    }
  }

  function dispose() {
    disposableGeometries.forEach((g) => g.dispose());
    disposableMaterials.forEach((m) => m.dispose());
    disposableTextures.forEach((t) => t.dispose());
  }

  return {
    root,
    setConfig,
    setExplode,
    updateAnimation,
    dispose,
  };
}
