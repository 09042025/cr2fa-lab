/** Diamante lapidado (brilhante) em SVG: facetas gelo/prata/azul, brilho e reflexos. */
const g = [[3, 31], [20, 31], [34, 31], [48, 31], [62, 31], [76, 31], [93, 31]] as const;
const t = [[28, 8], [40, 8], [56, 8], [68, 8]] as const;
const C = [48, 71] as const;
const pts = (...p: (readonly [number, number] | readonly number[])[]) => p.map((q) => q.join(",")).join(" ");

const CROWN: [number[][], string][] = [
  [[[...g[0]], [...t[0]], [...g[1]]], "url(#KK-c1)"],
  [[[...t[0]], [...g[1]], [...g[2]]], "url(#KK-c2)"],
  [[[...t[0]], [...t[1]], [...g[2]]], "url(#KK-c3)"],
  [[[...t[1]], [...g[2]], [...g[3]]], "url(#KK-c4)"],
  [[[...t[1]], [...t[2]], [...g[3]]], "url(#KK-c5)"],
  [[[...t[2]], [...g[3]], [...g[4]]], "url(#KK-c4)"],
  [[[...t[2]], [...t[3]], [...g[4]]], "url(#KK-c3)"],
  [[[...t[3]], [...g[4]], [...g[5]]], "url(#KK-c2)"],
  [[[...t[3]], [...g[5]], [...g[6]]], "url(#KK-c1)"],
];
const PAV = ["url(#KK-p1)", "url(#KK-p2)", "url(#KK-p3)", "url(#KK-p4)", "url(#KK-p2)", "url(#KK-p1)"];

/** Versão "black": mesmas facetas, convertidas para preto/grafite com brilho prateado. */
const toBlack = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g2 = (n >> 8) & 255, b = n & 255;
  const l = Math.pow((0.299 * r + 0.587 * g2 + 0.114 * b) / 255, 2.6);
  const mix = (a: number, z: number) => Math.round(a + (z - a) * l);
  return `rgb(${mix(4, 150)},${mix(5, 156)},${mix(9, 172)})`;
};

export function Diamond({ size = 64, className = "", black = false }: { size?: number; className?: string; black?: boolean }) {
  const k = black ? "dbk" : "dmd";
  const c = (h: string) => (black ? toBlack(h) : h);
  const fillOf = (f: string) => f.replace("KK", k);
  return (
    <svg viewBox="0 0 96 76" width={size} height={Math.round((size * 76) / 96)} className={className} role="img" aria-label={black ? "Diamante black" : "Diamante"}>
      <defs>
        <linearGradient id={`${k}-c1`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c("#ffffff")} /><stop offset="1" stopColor={c("#a9cdf0")} /></linearGradient>
        <linearGradient id={`${k}-c2`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c("#e9f4ff")} /><stop offset="1" stopColor={c("#7fb0e3")} /></linearGradient>
        <linearGradient id={`${k}-c3`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor={c("#bcd9f5")} /><stop offset="1" stopColor={c("#ffffff")} /></linearGradient>
        <linearGradient id={`${k}-c4`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c("#8fbbe8")} /><stop offset="1" stopColor={c("#e4f1ff")} /></linearGradient>
        <linearGradient id={`${k}-c5`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c("#ffffff")} /><stop offset="1" stopColor={c("#bfdcf7")} /></linearGradient>
        <linearGradient id={`${k}-p1`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c("#8db9e6")} /><stop offset="1" stopColor={c("#3f72ab")} /></linearGradient>
        <linearGradient id={`${k}-p2`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c("#d7eaff")} /><stop offset="1" stopColor={c("#6a9fd6")} /></linearGradient>
        <linearGradient id={`${k}-p3`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c("#5b8fc7")} /><stop offset="1" stopColor={c("#274d82")} /></linearGradient>
        <linearGradient id={`${k}-p4`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c("#f2f9ff")} /><stop offset="1" stopColor={c("#8dbbea")} /></linearGradient>
        <radialGradient id={`${k}-glow`} cx="50%" cy="45%" r="55%"><stop offset="0" stopColor={black ? "#d4af37" : "#bfe0ff"} stopOpacity={black ? ".4" : ".55"} /><stop offset="1" stopColor={black ? "#d4af37" : "#bfe0ff"} stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="48" cy="38" rx="48" ry="38" fill={`url(#${k}-glow)`} />
      {/* pavilhão (parte de baixo) */}
      {PAV.map((f, i) => <polygon key={`p${i}`} points={pts(g[i], g[i + 1], C)} fill={fillOf(f)} stroke={black ? "#d4af37" : "#ffffff"} strokeOpacity={black ? ".7" : ".55"} strokeWidth=".5" strokeLinejoin="round" />)}
      {/* coroa (parte de cima) */}
      {CROWN.map(([p, f], i) => <polygon key={`c${i}`} points={pts(...p)} fill={fillOf(f)} stroke={black ? "#d4af37" : "#ffffff"} strokeOpacity={black ? ".85" : ".7"} strokeWidth=".5" strokeLinejoin="round" />)}
      {/* mesa (topo) */}
      <polygon points="28,8 68,8 62,3.5 34,3.5" fill="#ffffff" fillOpacity=".92" stroke="#ffffff" strokeOpacity=".8" strokeWidth=".5" strokeLinejoin="round" />
      <line x1="3" y1="31" x2="93" y2="31" stroke="#ffffff" strokeOpacity=".8" strokeWidth=".8" />
      {/* reflexos */}
      <polygon points="31,10 37,10 27,27 22,27" fill="#ffffff" fillOpacity=".55" />
      <polygon points="57,12 62,12 69,26 65,26" fill="#ffffff" fillOpacity=".35" />
      <polygon points="40,36 46,36 47,52" fill="#ffffff" fillOpacity=".45" />
      {/* brilho em estrela */}
      <g fill="#ffffff"><path d="M24 12 25.2 16 29 17.2 25.2 18.4 24 22.4 22.8 18.4 19 17.2 22.8 16Z" /><circle cx="72" cy="20" r="1.1" /><circle cx="14" cy="34" r=".9" /></g>
    </svg>
  );
}

export function DiamondBadge() {
  return <span className="inline-flex items-center gap-1 rounded-md bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-sky-200"><Diamond size={12} />DIAMOND</span>;
}

export function BlackBadge() {
  return <span className="inline-flex items-center gap-1 rounded-md border border-gold/50 bg-black/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-gold-soft"><Diamond size={12} black />BLACK VIP</span>;
}
