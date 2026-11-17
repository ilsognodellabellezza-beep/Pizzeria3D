"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Flame } from "lucide-react";
import type { PizzaScene } from "./scene";

const CHAPTERS = [
  { from: 0, to: 0.17, tag: "01", title: "L'impasto", text: "Si parte da un impasto leggero e alveolato. Si lancia, si gira e si stende fino a formare il cornicione." },
  { from: 0.17, to: 0.34, tag: "02", title: "La salsa", text: "Il pomodoro viene steso a spirale dal centro verso il bordo, con un pizzico di origano." },
  { from: 0.34, to: 0.46, tag: "03", title: "La mozzarella", text: "Fior di latte e bocconcini di mozzarella: in forno si sciolgono, fanno le bolle e filano." },
  { from: 0.46, to: 0.6, tag: "04", title: "Le farciture", text: "Salame piccante, granella di pistacchio e un filo d'olio. Sul menù trovi anche porchetta, crocchette, mortadella e tanto altro." },
  { from: 0.6, to: 0.82, tag: "05", title: "Il forno", text: "Pochi minuti ad alta temperatura: il cornicione si gonfia e si dora, il formaggio si macchia di oro." },
  { from: 0.82, to: 1.01, tag: "06", title: "In tavola", text: "Basilico fresco, un taglio deciso e la pizza parte ancora fumante verso casa tua, a Catania." },
];

export function PizzaStory() {
  const wrapRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PizzaScene | null>(null);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    let onScroll: (() => void) | null = null;

    (async () => {
      let scene: PizzaScene;
      try {
        const { createPizzaScene } = await import("./scene");
        if (cancelled) return;
        scene = createPizzaScene(mount);
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      sceneRef.current = scene;
      setReady(true);

      // ?pizzaP=0.55 fissa il progresso (utile per controllare le singole fasi)
      const fixed = new URLSearchParams(window.location.search).get("pizzaP");
      const readProgress = () => {
        const el = wrapRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const span = Math.max(rect.height - window.innerHeight, 1);
        return Math.min(1, Math.max(0, -rect.top / span));
      };
      const update = () => {
        const p = fixed !== null ? Math.min(1, Math.max(0, Number(fixed) || 0)) : readProgress();
        scene.setProgress(p, fixed !== null);
        setProgress(p);
      };
      onScroll = update;
      update();
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);

      ro = new ResizeObserver(() => scene.resize());
      ro.observe(mount);
      io = new IntersectionObserver(([e]) => scene.setActive(e.isIntersecting), { rootMargin: "100px" });
      if (wrapRef.current) io.observe(wrapRef.current);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      io?.disconnect();
      if (onScroll) {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const idx = Math.max(0, CHAPTERS.findIndex((c) => progress >= c.from && progress < c.to));
  const chapter = CHAPTERS[idx];
  const local = Math.min(1, Math.max(0, (progress - chapter.from) / (chapter.to - chapter.from)));
  const last = idx === CHAPTERS.length - 1;

  return (
    <section ref={wrapRef} className="relative bg-lava" style={{ height: "650svh" }} aria-label="Come nasce la nostra pizza">
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />
        {(failed || !ready) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#5a2518_0%,#141211_70%)]">
            <p className="px-6 text-center font-serif text-2xl text-crema/80">
              {failed ? "Anteprima 3D non disponibile su questo dispositivo." : "Accendiamo il forno…"}
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(10,6,4,0.62)_100%)]" aria-hidden="true" />

        {/* testo del capitolo */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-8 sm:px-6 lg:inset-y-0 lg:flex lg:items-center lg:pb-0">
          <div className="mx-auto w-full max-w-7xl">
            <div key={chapter.tag} className="animate-slide-up pointer-events-auto max-w-md rounded-3xl bg-lava/70 p-6 text-crema shadow-2xl ring-1 ring-white/10 backdrop-blur-md sm:p-8">
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-oro">
                <Flame className="h-4 w-4" aria-hidden="true" /> Passo {chapter.tag} / 06
              </p>
              <h2 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">{chapter.title}</h2>
              <p className="mt-3 text-lg leading-relaxed text-crema/85">{chapter.text}</p>
              <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div className="h-full rounded-full bg-gradient-to-r from-oro to-brace" style={{ width: `${Math.round(local * 100)}%` }} />
              </div>
              {last && (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/ordina" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brace px-6 font-semibold text-white shadow-lg shadow-brace/30 transition hover:bg-brace-dark">
                    Ordina ora <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link href="/menu" className="inline-flex h-12 items-center justify-center rounded-full border border-crema/40 px-6 font-semibold transition hover:bg-white/10">
                    Sfoglia il menù
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* indicatore passi */}
        <ol className="pointer-events-none absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 sm:flex" aria-hidden="true">
          {CHAPTERS.map((c, i) => (
            <li key={c.tag} className="flex items-center justify-end gap-3 text-xs font-semibold uppercase tracking-widest">
              <span className={i === idx ? "text-oro" : "text-crema/0"}>{c.title}</span>
              <span className={`block h-2.5 rounded-full transition-all ${i === idx ? "w-8 bg-oro" : i < idx ? "w-2.5 bg-crema/70" : "w-2.5 bg-crema/25"}`} />
            </li>
          ))}
        </ol>

        {progress < 0.04 && (
          <p className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-pulse text-sm uppercase tracking-[0.3em] text-crema/70 lg:block">
            Scorri per vedere come nasce
          </p>
        )}
      </div>
    </section>
  );
}
