/* Marchio (pizza) disegnato per ImageResponse: favicon, icone PWA, Open Graph */
export function IconArt({ size, padding = 0 }: { size: number; padding?: number }) {
  const s = size - padding * 2;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#1c1a19" }}>
      <svg width={s} height={s} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="23" fill="#1c1a19" stroke="#d4a24c" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="16.5" fill="#d4a24c" />
        <circle cx="24" cy="24" r="13.2" fill="#c8412b" />
        <path d="M24 24 L24 10.8 A13.2 13.2 0 0 1 35.4 17.4 Z" fill="#f6f0e6" />
        <circle cx="18" cy="20" r="2.1" fill="#a3321f" />
        <circle cx="19.5" cy="30" r="2.1" fill="#a3321f" />
        <circle cx="30.5" cy="29.5" r="2.1" fill="#a3321f" />
        <circle cx="31" cy="21" r="1.2" fill="#4e7a3a" />
        <circle cx="24.6" cy="16" r="1.2" fill="#4e7a3a" />
      </svg>
    </div>
  );
}
