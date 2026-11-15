const BALL = {
  red: { bg: "radial-gradient(circle at 32% 26%, #fca5a5 0%, #ef4444 45%, #7f1d1d 100%)", glow: "rgba(239,68,68,.45)" },
  yellow: { bg: "radial-gradient(circle at 32% 26%, #fde68a 0%, #eab308 45%, #713f12 100%)", glow: "rgba(234,179,8,.4)" },
  green: { bg: "radial-gradient(circle at 32% 26%, #bbf7d0 0%, #22c55e 45%, #14532d 100%)", glow: "rgba(34,197,94,.4)" },
};

/** Bolinha em alto relevo com "pontos/total" (ex.: 5/13). Vermelha: mais da metade ruim; amarela: há pontos; verde: nenhum. */
export function AttentionBall({ a }: { a: { points: number; total: number; critical: boolean } | null }) {
  if (!a || a.total === 0) return <span title="Sem indicadores disponíveis para este ativo" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-panel text-[9px] font-bold text-muted" style={{ boxShadow: "inset 0 -2px 4px rgba(0,0,0,.5), inset 0 1px 2px rgba(255,255,255,.18)" }}>?</span>;
  const c = BALL[a.critical ? "red" : a.points > 0 ? "yellow" : "green"];
  return (
    <span
      title={`Pontos de atenção: ${a.points} de ${a.total}`} aria-label={`Pontos de atenção: ${a.points} de ${a.total}`}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[8px] tracking-tight font-bold leading-none text-white"
      style={{ background: c.bg, boxShadow: `inset 0 -3px 5px rgba(0,0,0,.45), inset 0 2px 3px rgba(255,255,255,.55), 0 3px 8px ${c.glow}, 0 1px 2px rgba(0,0,0,.6)`, textShadow: "0 1px 2px rgba(0,0,0,.7)" }}
    >{a.points}/{a.total}</span>
  );
}
