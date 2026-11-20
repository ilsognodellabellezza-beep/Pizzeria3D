import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Installa l'app",
  description: "Come aggiungere Epic Pizza alla schermata Home del telefono, su iPhone e Android.",
  alternates: { canonical: "/installa-app" },
};

const steps = [
  {
    title: "iPhone (Safari)",
    items: ["Apri il sito con Safari.", "Tocca il tasto Condividi (il quadrato con la freccia in su).", "Scorri e scegli «Aggiungi a Home».", "Conferma con «Aggiungi»: l'icona Epic Pizza appare tra le tue app."],
  },
  {
    title: "Android (Chrome)",
    items: ["Apri il sito con Chrome.", "Tocca i tre puntini in alto a destra.", "Scegli «Installa app» oppure «Aggiungi a schermata Home».", "Conferma: l'icona Epic Pizza appare tra le tue app."],
  },
];

export default function InstallPage() {
  return (
    <>
      <PageHero eyebrow="App" title="Installa l'app" />
      <div className="bg-farina">
        <div className="mx-auto grid max-w-4xl gap-5 px-4 py-16 sm:px-6 md:grid-cols-2">
          {steps.map((s) => (
            <section key={s.title} className="rounded-3xl bg-white p-6 ring-1 ring-lava/5">
              <h2 className="font-serif text-2xl font-bold">{s.title}</h2>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-pietra marker:font-semibold marker:text-brace">
                {s.items.map((i) => <li key={i}>{i}</li>)}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
