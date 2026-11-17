import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nati x la Pizza",
    short_name: "Nati x la Pizza",
    description: "Pizze, panini e smash burger a Catania. Ordina online per asporto o consegna.",
    start_url: "/ordina",
    scope: "/",
    display: "standalone",
    background_color: "#1c1a19",
    theme_color: "#1c1a19",
    lang: "it",
    categories: ["food"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ordina", url: "/ordina" },
    ],
  };
}
