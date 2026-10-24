/** Gráfico de linha simples em SVG, desenhado no servidor (sem JavaScript no navegador). */
export function LineChart({ points, color = "#d9a520", height = 220, format, startTs, endTs }: {
  points: number[]; color?: string; height?: number; format: (v: number) => string; startTs?: number; endTs?: number;
}) {
  if (points.length < 2) return <p className="text-sm text-muted">Sem dados suficientes para o gráfico.</p>;
  const W = 800;
  const H = height;
  const padT = 10;
  const padB = 8;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const up = points[points.length - 1] >= points[0];
  const c = color === "auto" ? (up ? "#34d399" : "#f87171") : color;
  const id = `g${Math.abs(Math.round(points[0] * 1000 + points.length))}`;
  const d = (t?: number) => (t ? new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }) : "");
  return (
    <div>
      <div className="flex justify-between text-xs text-muted"><span>Máx. {format(max)}</span><span>Mín. {format(min)}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-1 w-full" style={{ height }} role="img" aria-label="Gráfico de evolução">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity="0.35" /><stop offset="100%" stopColor={c} stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#24335f" strokeDasharray="4 6" />)}
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted"><span>{d(startTs)}</span><span>{d(endTs)}</span></div>
    </div>
  );
}
