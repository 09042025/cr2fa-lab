/**
 * Ícones em alto-relevo (metal escuro com glifo dourado em relevo), para os canais da White Flame Society.
 * `EmbossDefs` precisa aparecer uma vez na página: define o gradiente dourado e o filtro de relevo.
 */
const G: Record<string, React.ReactNode> = {
  shield: (<><path d="M12 2.8 4.6 5.8v5.6c0 4.4 3 7.9 7.4 9.8 4.4-1.9 7.4-5.4 7.4-9.8V5.8L12 2.8Z" /><path d="m8.6 12 2.5 2.5 4.5-5" /></>),
  bell: (<><path d="M5.8 16.8V11a6.2 6.2 0 0 1 12.4 0v5.8l1.6 1.7H4.2l1.6-1.7Z" /><path d="M10 20.8a2.2 2.2 0 0 0 4 0" /><path d="M12 3.2V4.8" /></>),
  users: (<><circle cx="9" cy="8.6" r="3.2" /><path d="M3.2 19.4c.5-3.3 2.8-5.4 5.8-5.4s5.3 2.1 5.8 5.4" /><circle cx="17.2" cy="9.4" r="2.4" /><path d="M16.6 14.2c2.4.1 4 1.7 4.4 4.4" /></>),
  trend: (<><path d="M6 4.5v3M6 15v3.5M12 3v3.5M12 14.5v5M18 6.5v3M18 17v3.5" /><rect x="4.1" y="7.5" width="3.8" height="7.5" rx="0.9" /><rect x="10.1" y="6.5" width="3.8" height="8" rx="0.9" /><rect x="16.1" y="9.5" width="3.8" height="7.5" rx="0.9" /></>),
  calendar: (<><rect x="3.4" y="5" width="17.2" height="15.6" rx="3" /><path d="M3.4 10h17.2M8 3v4.2M16 3v4.2" /><circle cx="12" cy="15.2" r="2.7" /><path d="M12 13.8v1.5l1 .7" /></>),
  lock: (<><rect x="4.8" y="10.4" width="14.4" height="10.4" rx="2.6" /><path d="M7.9 10.4V7.8a4.1 4.1 0 0 1 8.2 0v2.6" /><circle cx="12" cy="14.9" r="1.5" /><path d="M12 16.3v2.2" /></>),
  headset: (<><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3.5" y="13.5" width="4" height="6" rx="2" /><rect x="16.5" y="13.5" width="4" height="6" rx="2" /><path d="M18.5 19.5c0 1-1.2 1.8-3 1.8" /></>),
  video: (<><rect x="3" y="6.5" width="12.5" height="11" rx="3" /><path d="m15.5 10.5 5-2.5v8l-5-2.5" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></>),
};

export function EmbossDefs() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <linearGradient id="emb-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.45" stopColor="#e2b650" />
          <stop offset="1" stopColor="#8a6420" />
        </linearGradient>
        <linearGradient id="emb-dim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9aa3b8" />
          <stop offset="1" stopColor="#4c5469" />
        </linearGradient>
        <filter id="emb-bevel" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.55" result="b" />
          <feSpecularLighting in="b" surfaceScale="2.6" specularConstant="1" specularExponent="18" lightingColor="#fff6d6" result="spec">
            <feDistantLight azimuth="235" elevation="52" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="hi" />
          <feComposite in="SourceGraphic" in2="hi" operator="arithmetic" k1="0" k2="1" k3="0.75" k4="0" result="lit" />
          <feOffset in="SourceAlpha" dx="0.5" dy="0.9" result="o" />
          <feGaussianBlur in="o" stdDeviation="0.5" result="sh" />
          <feComponentTransfer in="sh" result="shadow"><feFuncA type="linear" slope="0.75" /></feComponentTransfer>
          <feMerge><feMergeNode in="shadow" /><feMergeNode in="lit" /></feMerge>
        </filter>
      </defs>
    </svg>
  );
}

export function EmbossedIcon({ name, size = 36, active = false, dim = false }: { name: string; size?: number; active?: boolean; dim?: boolean }) {
  const inner = Math.round(size * 0.62);
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center rounded-[28%] transition"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(120% 120% at 30% 20%, #2a3350 0%, #131a2c 48%, #070a13 100%)",
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,.28), inset 0 -3px 6px rgba(0,0,0,.65), 0 0 0 1px rgba(226,182,80,.75), 0 0 16px rgba(226,182,80,.38), 0 5px 10px rgba(0,0,0,.6)"
          : "inset 0 1px 0 rgba(255,255,255,.16), inset 0 -3px 6px rgba(0,0,0,.65), 0 0 0 1px rgba(226,182,80,.22), 0 4px 9px rgba(0,0,0,.55)",
        opacity: dim ? 0.55 : 1,
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none" stroke={dim ? "url(#emb-dim)" : "url(#emb-gold)"} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" filter="url(#emb-bevel)">
        {G[name] ?? G.users}
      </svg>
    </span>
  );
}
