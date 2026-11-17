import * as THREE from 'three';
import type { DoughType, SauceBase } from '../types';

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createDoughTexture(dough: DoughType, maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(dough === 'classico' ? 101 : dough === 'integrale' ? 202 : 303);

  const baseColors: Record<DoughType, [string, string, string]> = {
    classico: ['#E7C086', '#D5A25C', '#3A2312'],
    integrale: ['#B88753', '#966638', '#2C190B'],
    carbone: ['#2F3136', '#1F2024', '#0B0B0D'],
  };
  const [lightCol, midCol, charCol] = baseColors[dough];

  ctx.fillStyle = lightCol;
  ctx.fillRect(0, 0, size, size);

  // Baked grain mottling
  for (let i = 0; i < 650; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 4 + rand() * 18;
    ctx.fillStyle = midCol;
    ctx.globalAlpha = 0.08 + rand() * 0.14;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wood-fired leopard spotting (leopardatura)
  for (let i = 0; i < 140; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 2 + rand() * 9;
    ctx.fillStyle = charCol;
    ctx.globalAlpha = 0.15 + rand() * 0.48;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rand() * 0.6), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine flour dusting
  for (let i = 0; i < 240; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 3.5;
    ctx.fillStyle = dough === 'carbone' ? '#8C8F96' : '#FFF8ED';
    ctx.globalAlpha = 0.08 + rand() * 0.14;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSauceTexture(base: SauceBase, maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(base === 'pomodoro' ? 404 : base === 'pistacchio' ? 505 : 606);

  if (base === 'pomodoro') {
    ctx.fillStyle = '#B8231B';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = rand() > 0.5 ? '#D63826' : '#8E1610';
      ctx.globalAlpha = 0.25 + rand() * 0.25;
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 3 + rand() * 14, 0, Math.PI * 2);
      ctx.fill();
    }
    // Oregano flecks
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = '#2E401C';
      ctx.globalAlpha = 0.6;
      ctx.fillRect(rand() * size, rand() * size, 3, 2);
    }
  } else if (base === 'pistacchio') {
    ctx.fillStyle = '#7AA84B';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 380; i++) {
      ctx.fillStyle = rand() > 0.45 ? '#96BF65' : '#587E31';
      ctx.globalAlpha = 0.22 + rand() * 0.28;
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 4 + rand() * 16, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#F3EAD8';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = rand() > 0.5 ? '#FFFDF8' : '#E2D2B4';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 6 + rand() * 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createPeelWoodTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(777);

  ctx.fillStyle = '#5B3E28';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const shade = Math.floor(rand() * 18 - 9);
    ctx.fillStyle = `rgb(${85 + shade}, ${57 + shade}, ${36 + shade})`;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, y, size, 2);
  }

  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = '#3B2616';
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    const y = rand() * size;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + (rand() - 0.5) * 14, size * 0.7, y + (rand() - 0.5) * 14, size, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(10, 10, 12, 0.55)');
  grad.addColorStop(0.55, 'rgba(10, 10, 12, 0.22)');
  grad.addColorStop(1, 'rgba(10, 10, 12, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
