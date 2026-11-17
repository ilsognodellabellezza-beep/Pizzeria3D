import type { Metadata } from "next";
import Link from "next/link";
import { Beef, Flame, Heart, Wheat } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Chi siamo",
  description: "La storia di Nati x la Pizza a Catania: impasto leggero a lunga maturazione, specialità al pistacchio e smash burger, dal forno a casa tua.",
  alternates: { canonical: "/chi-siamo" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="Chi siamo" title="Nati per la pizza">
        Una pizzeria di quartiere a Cibali, con la passione per l&apos;impasto e per i sapori siciliani.
      </PageHero>
      <div className="bg-farina">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-16 text-lg leading-relaxed sm:px-6">
          <p>
            Siamo a Catania, in Via Sabato Martelli Castaldi, e ogni sera lavoriamo per portare sulla tua tavola una pizza leggera, croccante e digeribile: pizze normali e maxi, pizzoli, pinse, calzoni e panini.
          </p>
          <p>Ingredienti buoni, tanta fantasia — dal pistacchio alla porchetta, dagli smash burger alle crocchette fatte da noi — e una consegna che arriva calda.</p>
        </div>
        <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-2">
          {[
            { Icon: Wheat, t: "L'impasto", d: "Lunga maturazione per un impasto leggero e digeribile, con il cornicione alveolato e croccante. Disponibile in formato normale e maxi." },
            { Icon: Flame, t: "Le nostre specialità", d: "La Porcosa, Oro Verde, Nati Per La Pizza, Epica: creazioni con pistacchio, mortadella, porchetta e crocchette di patate." },
            { Icon: Beef, t: "Smash burger e panini", d: "Hamburger smash da 150 g con salse a scelta, pan panini, anelli di cipolla e nuggets di nostra produzione." },
            { Icon: Heart, t: "Fatto come piace a te", d: "Vuoi aggiungere o togliere un ingrediente? Puoi farlo direttamente dall'ordine online, o scriverci una nota." },
          ].map(({ Icon, t, d }) => (
            <article key={t} className="rounded-3xl bg-white p-8 ring-1 ring-lava/5">
              <Icon className="h-8 w-8 text-brace" aria-hidden="true" />
              <h2 className="mt-4 font-serif text-2xl font-bold">{t}</h2>
              <p className="mt-2 text-pietra">{d}</p>
            </article>
          ))}
        </div>
      </div>
      <section className="bg-lava-texture py-16 text-center text-crema">
        <p className="mx-auto max-w-xl font-serif text-3xl">Impasto leggero, anima catanese.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 px-4 sm:flex-row">
          <Link href="/ordina" className="inline-flex h-12 items-center justify-center rounded-full bg-brace px-6 font-semibold text-white">Ordina ora</Link>
          <Link href="/menu" className="inline-flex h-12 items-center justify-center rounded-full border border-crema/40 px-6 font-semibold">Sfoglia il menù</Link>
        </div>
      </section>
    </>
  );
}
