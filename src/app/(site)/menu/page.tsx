import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { NotConfigured } from "@/components/site/NotConfigured";
import { PageHero } from "@/components/site/PageHero";
import { getMenu } from "@/lib/data";
import { jsonLdScript, menuJsonLd } from "@/lib/jsonld";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Menù",
  description: "Pizze normali e maxi, pizzoli, pinse, calzoni, smash burger, pan panini, fritti e dolci. Prezzi e ingredienti.",
  alternates: { canonical: "/menu" },
};

export default async function MenuPage() {
  const categories = await getMenu();
  return (
    <>
      <PageHero eyebrow="Il nostro menù" title="Pizze, panini e smash burger">
        Impasto alto e soffice, anche integrale. Tocca un piatto per ingredienti, allergeni e personalizzazioni.
      </PageHero>
      {categories.length ? <MenuBrowser categories={categories} /> : <NotConfigured />}
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(menuJsonLd(categories))} />
    </>
  );
}
