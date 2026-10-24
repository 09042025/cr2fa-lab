/** Gráficos de barras em SVG, desenhados no servidor. */

interface Props { height?: number; format: (v: number) => string }

/** Barras para cima (verde, positivo) e para baixo (vermelho, negativo) em torno do zero. */
export function FlowBars({ items, height = 240, format }: Props & { items: { label: string; value: number }[] }) {
  if (items.length < 2) return <p className="text-sm text-muted">Sem dados suficientes para o gráfico.</p>;
  const W = 800;
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  const mid = height / 2;
  const bw = W / items.length;
  return (
    <div>
      <div className="flex justify-between text-xs text-muted"><span>+{format(max)}</span><span>−{format(max)}</span></div>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="mt-1 w-full" style={{ height }} role="img" aria-label="Fluxo diário líquido">
        <line x1="0" x2={W} y1={mid} y2={mid} stroke="#24335f" />
        {items.map((it, i) => {
          const h = (Math.abs(it.value) / max) * (mid - 4);
          return <rect key={i} x={i * bw + bw * 0.15} width={bw * 0.7} y={it.value >= 0 ? mid - h : mid} height={Math.max(h, 0.5)} fill={it.value >= 0 ? "#34d399" : "#f87171"}><title>{`${it.label}: ${format(it.value)}`}</title></rect>;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted"><span>{items[0].label}</span><span>{items[items.length - 1].label}</span></div>
    </div>
  );
}

/** Barras empilhadas: `a` (embaixo, vermelho: longs) e `b` (em cima, verde: shorts). */
export function StackedBars({ items, height = 240, format, aLabel, bLabel }: Props & { items: { label: string; a: number; b: number }[]; aLabel: string; bLabel: string }) {
  if (items.length < 2) return <p className="text-sm text-muted">Sem dados suficientes para o gráfico.</p>;
  const W = 800;
  const max = Math.max(...items.map((i) => i.a + i.b), 1);
  const bw = W / items.length;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Máx. {format(max)}</span>
        <span className="flex gap-3"><span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: "#f87171" }} />{aLabel}</span><span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: "#34d399" }} />{bLabel}</span></span>
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="mt-1 w-full" style={{ height }} role="img" aria-label="Liquidações">
        {items.map((it, i) => {
          const ha = (it.a / max) * (height - 4);
          const hb = (it.b / max) * (height - 4);
          return (
            <g key={i}>
              <rect x={i * bw + bw * 0.12} width={bw * 0.76} y={height - ha} height={Math.max(ha, 0)} fill="#f87171"><title>{`${it.label}: ${aLabel} ${format(it.a)}`}</title></rect>
              <rect x={i * bw + bw * 0.12} width={bw * 0.76} y={height - ha - hb} height={Math.max(hb, 0)} fill="#34d399"><title>{`${it.label}: ${bLabel} ${format(it.b)}`}</title></rect>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted"><span>{items[0].label}</span><span>{items[items.length - 1].label}</span></div>
    </div>
  );
}
