/** Diamante em relevo dourado/azulado (SVG), usado na Mentoria com Niza. */
export function Diamond({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label="Diamante">
      <defs>
        <linearGradient id="dm-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6d6" /><stop offset="1" stopColor="#e3b64a" /></linearGradient>
        <linearGradient id="dm-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9fd8ff" /><stop offset="1" stopColor="#2f6fb8" /></linearGradient>
        <linearGradient id="dm-r" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6fb4f0" /><stop offset="1" stopColor="#1b4c8c" /></linearGradient>
        <linearGradient id="dm-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4d92d8" /><stop offset="1" stopColor="#123a73" /></linearGradient>
      </defs>
      <path d="M16 8h32l12 16H4Z" fill="url(#dm-top)" stroke="#8a6a1c" strokeWidth="1" strokeLinejoin="round" />
      <path d="M4 24h20L32 58Z" fill="url(#dm-l)" stroke="#8a6a1c" strokeWidth="1" strokeLinejoin="round" />
      <path d="M60 24H40L32 58Z" fill="url(#dm-r)" stroke="#8a6a1c" strokeWidth="1" strokeLinejoin="round" />
      <path d="M24 24h16L32 58Z" fill="url(#dm-b)" stroke="#8a6a1c" strokeWidth="1" strokeLinejoin="round" />
      <path d="M24 24 16 8M40 24 48 8M24 24l8-16 8 16" fill="none" stroke="#fff3c4" strokeOpacity=".7" strokeWidth="1" />
      <path d="M12 22h8" stroke="#fff" strokeOpacity=".8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function DiamondBadge() {
  return <span className="inline-flex items-center gap-1 rounded-md bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-sky-200"><Diamond size={10} />DIAMOND</span>;
}
