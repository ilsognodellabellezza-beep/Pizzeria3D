import QRCode from "qrcode";
import { CalendarCheck, Smartphone } from "lucide-react";
import { SITE, telHref, whatsappHref } from "@/lib/site";
import type { Settings } from "@/lib/types";

async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1a19", light: "#ffffff" } });
}

/** Link per le prenotazioni: impostato dal gestionale, altrimenti WhatsApp, altrimenti telefono */
export function reservationsLink(s: Settings): string {
  if (s.reservations_url) return s.reservations_url;
  if (s.whatsapp) return whatsappHref(s.whatsapp, "Ciao! Vorrei prenotare un tavolo");
  return telHref(s.phone);
}

export function installLink(s: Settings): string {
  return s.app_install_url || `${SITE.url}/installa-app`;
}

/** Due QR code: prenotazioni e installazione dell'app */
export async function QrCodes({ settings }: { settings: Settings }) {
  const items = [
    { Icon: CalendarCheck, title: "Prenota un tavolo", text: "Inquadra il codice con la fotocamera per prenotare.", url: reservationsLink(settings), svg: await qrSvg(reservationsLink(settings)) },
    { Icon: Smartphone, title: "Installa l'app", text: "Inquadra il codice e aggiungi Epic Pizza alla schermata Home.", url: installLink(settings), svg: await qrSvg(installLink(settings)) },
  ];
  return (
    <section className="bg-farina py-16" aria-labelledby="qr">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brace-dark">Scansiona</p>
        <h2 id="qr" className="mt-2 font-serif text-4xl font-bold">Prenota e porta Epic Pizza con te</h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {items.map(({ Icon, title, text, url, svg }) => (
            <li key={title} className="flex items-center gap-5 rounded-3xl bg-white p-5 ring-1 ring-lava/5">
              <a href={url} aria-label={title} className="block h-32 w-32 shrink-0 overflow-hidden rounded-xl ring-1 ring-lava/10 sm:h-40 sm:w-40 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brace text-white"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-3 font-serif text-xl font-bold">{title}</h3>
                <p className="mt-1 text-sm text-pietra">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
