import * as THREE from "three";

/* ---------- rumore procedurale ---------- */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(ix: number, iy: number, seed: number) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed + 1, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function noise2(x: number, y: number, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** fbm normalizzato 0..1 */
export function fbm(x: number, y: number, octaves = 4, seed = 0) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq, seed + i * 17);
    norm += amp;
    freq *= 2;
    amp *= 0.5;
  }
  return sum / norm;
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/* Dimensione mondo coperta dalle texture planari (x,z in [-WORLD, WORLD]) */
export const WORLD = 2.3;
/** Altezza del formaggio sciolto, condivisa tra texture, geometria e posizionamento dei topping */
export function cheeseField(x: number, z: number) {
  return fbm(x * 2.1 + 7.3, z * 2.1 + 3.1, 4, 5);
}
/* ---------- canvas helpers ---------- */
function canvas(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c: HTMLCanvasElement, aniso: number, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

function paint(size: number, fn: (x: number, z: number, set: (r: number, g: number, b: number, a?: number) => void) => void) {
  const c = canvas(size);
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1) - 0.5) * 2 * WORLD;
      const z = (py / (size - 1) - 0.5) * 2 * WORLD;
      const i = (py * size + px) * 4;
      fn(x, z, (r, g, b, a = 255) => {
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
        d[i + 3] = a;
      });
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* ---------- impasto cotto: cornicione dorato con macchie "leopardate" ---------- */
export function doughTexture(aniso: number) {
  const c = paint(1024, (x, z, set) => {
    const r = Math.hypot(x, z);
    const ang = Math.atan2(z, x);
    const rim = smoothstep(1.45, 1.75, r);
    const n = fbm(x * 3.2, z * 3.2, 4, 1);
    const fine = fbm(x * 14, z * 14, 3, 2);
    // base: dorato chiaro -> ambra verso l'esterno
    let R = mix(236, 214, rim) + (n - 0.5) * 34;
    let G = mix(206, 156, rim) + (n - 0.5) * 30;
    let B = mix(158, 88, rim) + (n - 0.5) * 22;
    // bolle ed aree bruciate (leopardatura), concentrate sul cornicione
    const blister = smoothstep(0.58, 0.7, fbm(x * 6.5 + 3, z * 6.5 - 2, 3, 9)) * (0.25 + rim * 0.9);
    const spots = smoothstep(0.66, 0.74, fine) * rim;
    const char = Math.min(1, blister * 0.85 + spots * 0.55);
    R = mix(R, 74, char);
    G = mix(G, 38, char);
    B = mix(B, 16, char);
    // sfumatura più scura sul bordo esterno
    const edge = smoothstep(1.95, 2.12, r + 0.04 * Math.sin(ang * 7));
    R *= 1 - edge * 0.22;
    G *= 1 - edge * 0.3;
    B *= 1 - edge * 0.35;
    // farina sparsa
    const flour = smoothstep(0.78, 0.9, fbm(x * 18, z * 18, 2, 4)) * 0.35 * (1 - char);
    set(mix(R, 252, flour), mix(G, 244, flour), mix(B, 226, flour));
  });
  return toTexture(c, aniso);
}

export function doughBump(aniso: number) {
  const c = paint(512, (x, z, set) => {
    const r = Math.hypot(x, z);
    const rim = smoothstep(1.4, 1.8, r);
    const v = 128 + (fbm(x * 9, z * 9, 4, 11) - 0.5) * 120 * (0.25 + rim) + smoothstep(0.62, 0.72, fbm(x * 6.5 + 3, z * 6.5 - 2, 3, 9)) * 60;
    set(v, v, v);
  });
  return toTexture(c, aniso, false);
}

/* ---------- salsa di pomodoro con olio e erbe ---------- */
export function sauceTexture(aniso: number) {
  const rand = rng(77);
  const c = paint(768, (x, z, set) => {
    const n = fbm(x * 2.6, z * 2.6, 4, 21);
    const n2 = fbm(x * 9, z * 9, 3, 22);
    let R = mix(158, 206, n) + (n2 - 0.5) * 26;
    let G = mix(28, 62, n) + (n2 - 0.5) * 14;
    let B = mix(16, 34, n);
    const oil = smoothstep(0.7, 0.82, fbm(x * 5 + 40, z * 5, 3, 23));
    R = mix(R, 238, oil * 0.55);
    G = mix(G, 120, oil * 0.55);
    B = mix(B, 38, oil * 0.55);
    set(R, G, B);
  });
  const ctx = c.getContext("2d")!;
  // erbe (origano / basilico tritato)
  for (let i = 0; i < 260; i++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * 1.66;
    const px = ((Math.cos(a) * rr) / (2 * WORLD) + 0.5) * c.width;
    const py = ((Math.sin(a) * rr) / (2 * WORLD) + 0.5) * c.height;
    ctx.fillStyle = `rgba(${50 + rand() * 40},${96 + rand() * 50},${34 + rand() * 20},${0.5 + rand() * 0.4})`;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rand() * Math.PI);
    ctx.fillRect(-2, -1, 3 + rand() * 4, 1.4 + rand() * 1.2);
    ctx.restore();
  }
  return toTexture(c, aniso);
}

/* ---------- mozzarella: chiazze fuse con zone dorate dopo la cottura (alpha = copertura) ---------- */
export function cheeseTexture(aniso: number) {
  const c = paint(1024, (x, z, set) => {
    const r = Math.hypot(x, z);
    const f = cheeseField(x, z);
    const cover = smoothstep(0.38, 0.5, f + (fbm(x * 12, z * 12, 2, 31) - 0.5) * 0.08) * smoothstep(1.66, 1.5, r);
    const lobe = smoothstep(0.42, 0.66, f);
    let R = mix(238, 255, lobe);
    let G = mix(214, 248, lobe);
    let B = mix(158, 232, lobe);
    // dorature da cottura
    const gold = smoothstep(0.56, 0.7, fbm(x * 7 + 11, z * 7, 4, 33)) * (0.5 + 0.5 * (1 - lobe));
    const burnt = smoothstep(0.7, 0.8, fbm(x * 9 - 4, z * 9 + 6, 3, 34));
    R = mix(R, 216, gold * 0.75);
    G = mix(G, 150, gold * 0.75);
    B = mix(B, 70, gold * 0.75);
    R = mix(R, 150, burnt * 0.6);
    G = mix(G, 84, burnt * 0.6);
    B = mix(B, 38, burnt * 0.6);
    set(R, G, B, cover * 255);
  });
  return toTexture(c, aniso);
}

/* ---------- salame piccante ---------- */
export function salameTexture(aniso: number) {
  const size = 256;
  const c = canvas(size);
  const ctx = c.getContext("2d")!;
  const rand = rng(404);
  const g = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  g.addColorStop(0, "#b3342a");
  g.addColorStop(0.75, "#a02a22");
  g.addColorStop(0.93, "#7e1d1a");
  g.addColorStop(1, "#5a1412");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * size * 0.4;
    ctx.fillStyle = `rgba(${238 + rand() * 17},${205 + rand() * 30},${190 + rand() * 30},${0.75 + rand() * 0.25})`;
    ctx.beginPath();
    ctx.arc(size / 2 + Math.cos(a) * rr, size / 2 + Math.sin(a) * rr, 3 + rand() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(60,10,10,${0.2 + rand() * 0.3})`;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 1 + rand() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c, aniso);
}

/* ---------- foglia di basilico (nervature) ---------- */
export function basilTexture(aniso: number) {
  const w = 256;
  const h = 384;
  const c = canvas(w, h);
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#2f7a2c");
  g.addColorStop(0.55, "#3f8f36");
  g.addColorStop(1, "#245f22");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rand = rng(909);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(${20 + rand() * 60},${70 + rand() * 80},${20 + rand() * 30},0.12)`;
    ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 6, 1 + rand() * 2);
  }
  ctx.strokeStyle = "rgba(190,230,150,0.75)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w / 2, h);
  ctx.lineTo(w / 2, 14);
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "rgba(170,220,130,0.6)";
  for (let i = 0; i < 7; i++) {
    const y = h * (0.9 - i * 0.12);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w / 2, y);
      ctx.quadraticCurveTo(w / 2 + s * 46, y - 28, w / 2 + s * 100, y - 66);
      ctx.stroke();
    }
  }
  return toTexture(c, aniso);
}

/* ---------- tagliere / pala in legno ---------- */
export function woodTexture(aniso: number) {
  const size = 768;
  const c = canvas(size);
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = px / size;
      const v = py / size;
      const grain = fbm(u * 5, v * 90, 4, 61);
      const rings = 0.5 + 0.5 * Math.sin((u * 22 + fbm(u * 3, v * 3, 3, 62) * 6) * Math.PI);
      const t = grain * 0.6 + rings * 0.4;
      const i = (py * size + px) * 4;
      img.data[i] = mix(112, 168, t);
      img.data[i + 1] = mix(72, 118, t);
      img.data[i + 2] = mix(42, 76, t);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, aniso);
}

/* ---------- sprite morbidi (vapore, bagliore, braci) ---------- */
export function softSprite(inner: string, outer = "rgba(255,255,255,0)") {
  const size = 128;
  const c = canvas(size);
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sfondo del forno: bagliore arancio sfumato */
export function ovenGlowTexture() {
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,196,96,1)");
  g.addColorStop(0.25, "rgba(255,120,36,0.85)");
  g.addColorStop(0.55, "rgba(190,52,18,0.3)");
  g.addColorStop(1, "rgba(60,10,4,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
