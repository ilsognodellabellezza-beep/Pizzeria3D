import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Logo Epic Pizza per ImageResponse: favicon, icone PWA, Open Graph */
const LOGO = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "logo-epic-pizza-256.png")).toString("base64")}`;

export function IconArt({ size, padding = 0 }: { size: number; padding?: number }) {
  const s = size - padding * 2;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#1c1a19" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO} width={s} height={s} alt="" />
    </div>
  );
}

export { LOGO as LOGO_DATA_URI };
