import Link from "next/link";
import { ArrowRight, Bike, Flame, MapPin, Phone, Pizza, Sandwich, Store } from "lucide-react";
import { PizzaStory } from "@/components/pizza3d/PizzaStory";
import { ProductImage } from "@/components/menu/ProductImage";
import { HoursTable } from "@/components/site/HoursTable";
import { LocationMap } from "@/components/site/LocationMap";
import { OpenBadge } from "@/components/site/OpenBadge";
import { EpicLogo } from "@/components/site/Logo";
import { PromoSection } from "@/components/site/PromoSection";
import { QrCodes } from "@/components/site/QrCodes";
import { getActivePromotions, getMenu, getPublicInfo } from "@/lib/data";
import { jsonLdScript, restaurantJsonLd } from "@/lib/jsonld";
import { formatEuro } from "@/lib/pricing";
import { fullAddress, telHref } from "@/lib/site";

export const revalidate = 60;

export default async function HomePage() {
  const [{ settings, hours }, menu, promotions] = await Promise.all([getPublicInfo(), getMenu(), getActivePromotions()]);
  const featured = menu
    .flatMap((c) => c.products.filter((p) => p.is_featured && p.is_available).map((p) => ({ ...p, slug: c.slug })))
    .slice(0, 6);

  return (
    <>
      {/* HERO */}
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden text-crema">
        <div className="bg-epic-hero absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-6 px-5 pb-28 pt-28 sm:px-6 lg:grid-cols-[1fr_auto] lg:gap-10 lg:pb-16 lg:pt-32">
          <div className="order-last max-w-2xl text-center lg:order-first lg:text-left">
            <OpenBadge />
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-brace sm:text-sm">Pizzeria · Hamburgheria · Catania</p>
            <h1 className="mt-3 font-serif text-[2.6rem] font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
              Impasto leggero, <span className="block italic text-brace">anima catanese.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-crema/85 sm:text-lg lg:mx-0">
              Pizze normali e maxi, pizzoli, pinse, calzoni e smash burger. Ordina online per asporto o consegna a domicilio, dal cuore di Cibali.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/ordina" className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-brace bg-brace px-8 text-lg font-semibold text-white shadow-[0_0_28px_rgb(237_28_36/0.55)] transition active:scale-[0.98] hover:bg-brace-dark">
                Ordina ora <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link href="/menu" className="inline-flex h-14 items-center justify-center rounded-full border border-brace/80 bg-black px-8 text-lg font-semibold text-crema transition active:scale-[0.98] hover:bg-brace/10">
                Sfoglia il menù
              </Link>
            </div>
            <p className="mt-7 hidden text-xs uppercase tracking-[0.3em] text-brace sm:block">↓ <span className="ml-2 text-crema/70">Scorri: guarda nascere la tua pizza</span></p>
          </div>
          <div className="mx-auto">
            <div className="rounded-full shadow-[0_0_70px_rgb(237_28_36/0.55)] ring-2 ring-brace/60">
              <EpicLogo priority className="h-48 w-48 rounded-full sm:h-64 sm:w-64 lg:h-[26rem] lg:w-[26rem]" />
            </div>
          </div>
        </div>
      </section>

      {/* ANIMAZIONE 3D: dall'impasto al forno */}
      <PizzaStory />

      <PromoSection promotions={promotions} />

      {/* SPECIALITÀ */}
      <section className="bg-farina py-20" aria-labelledby="specialita">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brace-dark">Il nostro menù</p>
          <h2 id="specialita" className="mt-2 font-serif text-4xl font-bold">Pizze, panini e tanto altro</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { Icon: Pizza, title: "Pizze normali e maxi", text: "Dalla Margherita alla Porcosa, da 4 € la Napoletana: scegli il formato e aggiungi gli ingredienti che vuoi.", href: "/menu#cat-pizze" },
              { Icon: Flame, title: "Pizze speciali", text: "Pistacchio, mortadella, porchetta, crocchette e tartufo: Epica, Oro Verde, Nati Per La Pizza e le altre creazioni della casa.", href: "/menu#cat-pizze-speciali" },
              { Icon: Sandwich, title: "Smash burger e panini", text: "Hamburger smash da 150 g con salsa a scelta, pan panini, pizzoli e pinse. E i fritti: nuggets e anelli di cipolla nostri.", href: "/menu#cat-hamburger" },
            ].map(({ Icon, title, text, href }) => (
              <Link key={title} href={href} className="group rounded-3xl bg-white p-7 ring-1 ring-lava/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-lava/5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lava text-oro">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-serif text-2xl font-bold">{title}</h3>
                <p className="mt-2 text-pietra">{text}</p>
                <span className="mt-4 inline-flex items-center gap-1 font-semibold text-brace-dark">
                  Scopri <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>

          {featured.length > 0 && (
            <>
              <h3 className="mt-16 font-serif text-2xl font-bold">I più amati</h3>
              <ul className="no-scrollbar -mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
                {featured.map((p) => (
                  <li key={p.id} className="w-72 shrink-0 snap-start sm:w-auto">
                    <Link href="/ordina" className="block h-full overflow-hidden rounded-3xl bg-white ring-1 ring-lava/5 transition hover:shadow-xl hover:shadow-lava/5">
                      <ProductImage src={p.image_url} alt={p.name} className="aspect-[4/3] w-full" sizes="(max-width:640px) 288px, 33vw" />
                      <div className="flex items-start justify-between gap-3 p-5">
                        <div>
                          <h4 className="font-serif text-xl font-bold">{p.name}</h4>
                          {p.description && <p className="mt-1 line-clamp-3 text-sm text-pietra">{p.description}</p>}
                        </div>
                        <span className="shrink-0 font-semibold">{formatEuro(p.price)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* COME ORDINARE */}
      <section className="bg-epic-texture py-20 text-crema" aria-labelledby="come">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-oro-light">Ordina online</p>
            <h2 id="come" className="mt-2 font-serif text-4xl font-bold">A casa tua o al banco</h2>
            <p className="mt-5 text-lg text-crema/80">
              Scegli i piatti, personalizza gli ingredienti, scegli l&apos;orario e segui l&apos;ordine in tempo reale. Senza commissioni.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { Icon: Bike, t: "Consegna a domicilio", d: "A Catania, con costo e ordine minimo in base alla zona." },
                { Icon: Store, t: "Asporto", d: "Ritiri da noi in Via Martelli Castaldi, all'orario che preferisci." },
              ].map(({ Icon, t, d }) => (
                <li key={t} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                  <Icon className="h-6 w-6 text-oro" aria-hidden="true" />
                  <p className="mt-3 font-semibold">{t}</p>
                  <p className="text-sm text-crema/70">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <QrCodes settings={settings} />

      {/* DOVE SIAMO */}
      <section className="bg-farina py-20" aria-labelledby="dove">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brace-dark">Dove siamo</p>
            <h2 id="dove" className="mt-2 font-serif text-4xl font-bold">Ti aspettiamo a Cibali</h2>
            <p className="mt-4 flex items-start gap-2 text-lg">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-brace" aria-hidden="true" /> {fullAddress}
            </p>
            <a href={telHref(settings.phone)} className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-brace-dark">
              <Phone className="h-5 w-5" aria-hidden="true" /> {settings.phone}
            </a>
            <div className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-lava/5">
              <h3 className="mb-3 font-serif text-xl font-bold">Orari</h3>
              <HoursTable hours={hours} />
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl ring-1 ring-lava/10">
            <LocationMap className="h-full min-h-96" />
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(restaurantJsonLd(settings, hours))} />
    </>
  );
}
