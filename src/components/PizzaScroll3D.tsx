import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createPizzaRig3D } from '../three/PizzaModel3D';
import type { SiteConfig } from '../types';

interface PizzaScroll3DProps {
  siteConfig: SiteConfig;
  onExploreMenu: () => void;
}

const CHAPTERS = [
  {
    index: '01',
    title: 'Lievitazione naturale 48 ore',
    description:
      'Farine selezionate ad alta idratazione e maturazione lenta. Il cornicione sviluppa una alveolatura leggera e croccante, pensata per garantire massima digeribilità.',
    explode: 0.05,
    base: 'pomodoro' as const,
    toppings: ['basilico'] as const,
  },
  {
    index: '02',
    title: 'Pomodoro San Marzano o Pistacchio di Bronte',
    description:
      'Passata corposa di San Marzano DOP oppure vellutata crema di pistacchio verde siciliano stesa a mano prima del passaggio su pietra rovente.',
    explode: 0.45,
    base: 'pomodoro' as const,
    toppings: ['basilico', 'salame', 'olive'] as const,
  },
  {
    index: '03',
    title: 'Fior di latte e farciture generose',
    description:
      'Mozzarella fior di latte tagliata fresca, porchetta arrosto, mortadella IGP e crocchette di patate dorate: ogni fetta unisce sapidità e scioglievolezza.',
    explode: 0.88,
    base: 'pistacchio' as const,
    toppings: ['porchetta', 'crocchette', 'pistacchio', 'basilico'] as const,
  },
  {
    index: '04',
    title: 'Dal forno a casa tua a Catania',
    description:
      'Sfornata su pala e consegnata caldissima in tutta Catania — Cibali, Borgo e centro — in 30–40 minuti.',
    explode: 0.0,
    base: 'pistacchio' as const,
    toppings: ['porchetta', 'crocchette', 'pistacchio', 'basilico'] as const,
  },
];

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function PizzaScroll3D({ siteConfig, onExploreMenu }: PizzaScroll3DProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [contextLost, setContextLost] = useState(false);

  const scrollTargetRef = useRef(0);
  const chapterIndexRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight;
      // Continuous progress from entering viewport to leaving section
      const totalSpan = Math.max(el.offsetHeight + viewportH * 0.25, 1);
      const passed = Math.min(Math.max(viewportH * 0.65 - rect.top, 0), totalSpan);
      const progress = passed / totalSpan;
      scrollTargetRef.current = progress;
      setScrollPercent(Math.round(progress * 100));

      const idx = Math.min(
        CHAPTERS.length - 1,
        Math.max(0, Math.floor(progress * CHAPTERS.length)),
      );
      if (idx !== chapterIndexRef.current) {
        chapterIndexRef.current = idx;
        setActiveChapter(idx);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: true,
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = mount.clientWidth || 560;
    const height = mount.clientHeight || 480;
    renderer.setSize(width, height);
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111214);
    scene.fog = new THREE.FogExp2(0x111214, 0.045);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60);
    camera.position.set(0, 3.3, 5.1);
    camera.lookAt(0, 0.2, 0);

    const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x3b2416, 0.68);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.25);
    keyLight.position.set(4.5, 6.5, 4.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -3.5;
    keyLight.shadow.camera.right = 3.5;
    keyLight.shadow.camera.top = 3.5;
    keyLight.shadow.camera.bottom = -3.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff8e53, 1.35);
    rimLight.position.set(-4.5, 3.0, -4.0);
    scene.add(rimLight);

    const pizzaRig = createPizzaRig3D(renderer.capabilities.getMaxAnisotropy());
    pizzaRig.setConfig({
      format: 'normale',
      dough: 'classico',
      base: 'pomodoro',
      toppings: ['basilico'],
    });
    scene.add(pizzaRig.root);

    // Rising oven ember particles reactive to scroll
    const particleCount = 85;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 7.5;
      pPositions[i * 3 + 1] = -0.6 + Math.random() * 4.4;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffb870,
      size: 0.048,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    let lastAppliedChapter = -1;
    let currentProgress = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      currentProgress = THREE.MathUtils.damp(currentProgress, scrollTargetRef.current, 6.0, delta);

      const chIdx = chapterIndexRef.current;
      if (chIdx !== lastAppliedChapter) {
        lastAppliedChapter = chIdx;
        const ch = CHAPTERS[chIdx];
        pizzaRig.setConfig({
          format: 'normale',
          dough: 'classico',
          base: ch.base,
          toppings: [...ch.toppings],
        });
        pizzaRig.setExplode(ch.explode);
      }

      // Rich scroll-driven 3D motion: full 2-turn orbit, pitch tilt, and camera glide
      pizzaRig.root.rotation.y = currentProgress * Math.PI * 2.2 + elapsed * 0.12;
      pizzaRig.root.rotation.x = Math.sin(currentProgress * Math.PI) * 0.24;
      pizzaRig.root.rotation.z = Math.cos(currentProgress * Math.PI * 2) * 0.06;

      camera.position.x = Math.sin(currentProgress * Math.PI) * 0.8;
      camera.position.y = THREE.MathUtils.lerp(3.5, 2.15, Math.sin(currentProgress * Math.PI));
      camera.position.z = THREE.MathUtils.lerp(5.2, 4.35, Math.sin(currentProgress * Math.PI));
      camera.lookAt(0, 0.25, 0);

      particles.rotation.y = elapsed * 0.04 + currentProgress * 1.1;
      particles.position.y = Math.sin(currentProgress * Math.PI) * 0.35;
      pizzaRig.updateAnimation(delta, elapsed);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!mount || disposed) return;
      const w = mount.clientWidth || 560;
      const h = mount.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      pizzaRig.dispose();
      pGeo.dispose();
      pMat.dispose();
      if (scene.environment) scene.environment.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="bg-[#111214] text-white border-y border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 lg:mb-16">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wider uppercase text-zinc-400 mb-3">
              Animazione 3D allo Scorrimento · Catania
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              {siteConfig.storyTitle}
            </h2>
            <p className="mt-4 text-base text-zinc-300 leading-relaxed">
              {siteConfig.storyParagraph}
            </p>
          </div>
          <div className="text-xs font-mono-tabular text-zinc-400">
            Avanzamento 3D: {scrollPercent}%
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Sticky 3D Viewport */}
          <div className="lg:col-span-7 lg:sticky lg:top-24">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#111214] h-[380px] sm:h-[460px] lg:h-[540px]">
              {contextLost ? (
                <img
                  src={siteConfig.heroImageUrl}
                  alt="Forno Nati x la Pizza"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div ref={canvasMountRef} className="w-full h-full" />
              )}

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-[#181A1E]/95 border border-white/10 text-xs text-zinc-300">
                <span>
                  Fase 3D attiva: <strong className="text-white">{CHAPTERS[activeChapter].title}</strong>
                </span>
                <span className="font-mono-tabular text-zinc-400 whitespace-nowrap">
                  {CHAPTERS[activeChapter].index} / 04
                </span>
              </div>
            </div>
          </div>

          {/* 4 Scroll Chapters */}
          <div className="lg:col-span-5 space-y-6">
            {CHAPTERS.map((ch, idx) => {
              const isActive = activeChapter === idx;
              return (
                <div
                  key={ch.index}
                  onClick={() => {
                    chapterIndexRef.current = idx;
                    setActiveChapter(idx);
                    scrollTargetRef.current = idx / (CHAPTERS.length - 1);
                  }}
                  className={`cursor-pointer rounded-xl p-6 transition-colors border ${
                    isActive
                      ? 'bg-[#1B1D22] border-white/25'
                      : 'bg-[#15171B] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="font-mono-tabular text-xs text-zinc-400">
                      {ch.index}. Fase di lavorazione
                    </span>
                    {isActive && (
                      <span
                        className="text-xs font-medium"
                        style={{ color: siteConfig.accentColor }}
                      >
                        In vista 3D
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white mb-2">
                    {ch.title}
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">{ch.description}</p>
                </div>
              );
            })}

            <div className="pt-4">
              <button
                type="button"
                onClick={onExploreMenu}
                style={{ backgroundColor: siteConfig.accentColor }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                Sfoglia il Menu e Ordina
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
