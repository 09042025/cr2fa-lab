/** Diamante lapidado (brilhante) em SVG: facetas gelo/prata/azul, brilho e reflexos. */
const g = [[3, 31], [20, 31], [34, 31], [48, 31], [62, 31], [76, 31], [93, 31]] as const;
const t = [[28, 8], [40, 8], [56, 8], [68, 8]] as const;
const C = [48, 71] as const;
const pts = (...p: (readonly [number, number] | readonly number[])[]) => p.map((q) => q.join(",")).join(" ");

const CROWN: [number[][], string][] = [
  [[[...g[0]], [...t[0]], [...g[1]]], "url(#dmd-c1)"],
  [[[...t[0]], [...g[1]], [...g[2]]], "url(#dmd-c2)"],
  [[[...t[0]], [...t[1]], [...g[2]]], "url(#dmd-c3)"],
  [[[...t[1]], [...g[2]], [...g[3]]], "url(#dmd-c4)"],
  [[[...t[1]], [...t[2]], [...g[3]]], "url(#dmd-c5)"],
  [[[...t[2]], [...g[3]], [...g[4]]], "url(#dmd-c4)"],
  [[[...t[2]], [...t[3]], [...g[4]]], "url(#dmd-c3)"],
  [[[...t[3]], [...g[4]], [...g[5]]], "url(#dmd-c2)"],
  [[[...t[3]], [...g[5]], [...g[6]]], "url(#dmd-c1)"],
];
const PAV = ["url(#dmd-p1)", "url(#dmd-p2)", "url(#dmd-p3)", "url(#dmd-p4)", "url(#dmd-p2)", "url(#dmd-p1)"];

export function Diamond({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 96 76" width={size} height={Math.round((size * 76) / 96)} className={className} role="img" aria-label="Diamante">
      <defs>
        <linearGradient id="dmd-c1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#a9cdf0" /></linearGradient>
        <linearGradient id="dmd-c2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e9f4ff" /><stop offset="1" stopColor="#7fb0e3" /></linearGradient>
        <linearGradient id="dmd-c3" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#bcd9f5" /><stop offset="1" stopColor="#ffffff" /></linearGradient>
        <linearGradient id="dmd-c4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8fbbe8" /><stop offset="1" stopColor="#e4f1ff" /></linearGradient>
        <linearGradient id="dmd-c5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#bfdcf7" /></linearGradient>
        <linearGradient id="dmd-p1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8db9e6" /><stop offset="1" stopColor="#3f72ab" /></linearGradient>
        <linearGradient id="dmd-p2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d7eaff" /><stop offset="1" stopColor="#6a9fd6" /></linearGradient>
        <linearGradient id="dmd-p3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b8fc7" /><stop offset="1" stopColor="#274d82" /></linearGradient>
        <linearGradient id="dmd-p4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f2f9ff" /><stop offset="1" stopColor="#8dbbea" /></linearGradient>
        <radialGradient id="dmd-glow" cx="50%" cy="45%" r="55%"><stop offset="0" stopColor="#bfe0ff" stopOpacity=".55" /><stop offset="1" stopColor="#bfe0ff" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="48" cy="38" rx="48" ry="38" fill="url(#dmd-glow)" />
      {/* pavilhão (parte de baixo) */}
      {PAV.map((f, i) => <polygon key={`p${i}`} points={pts(g[i], g[i + 1], C)} fill={f} stroke="#ffffff" strokeOpacity=".55" strokeWidth=".5" strokeLinejoin="round" />)}
      {/* coroa (parte de cima) */}
      {CROWN.map(([p, f], i) => <polygon key={`c${i}`} points={pts(...p)} fill={f} stroke="#ffffff" strokeOpacity=".7" strokeWidth=".5" strokeLinejoin="round" />)}
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
