import type { Block } from "@/lib/protocol";

/** Pizza SVG estática dos cinco blocos (renderizada no servidor). */
export function ProtocolPie({ blocks, size = 280 }: { blocks: Block[]; size?: number }) {
  const r = size / 2 - 6;
  const c = size / 2;
  let angle = -Math.PI / 2;
  const total = blocks.reduce((a, b) => a + b.pct, 0);

  const slices = blocks.map((b) => {
    const a0 = angle;
    const a1 = angle + (b.pct / total) * Math.PI * 2;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a: number) => `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`;
    const mid = (a0 + a1) / 2;
    return {
      b,
      d: `M ${c} ${c} L ${p(a0)} A ${r} ${r} 0 ${large} 1 ${p(a1)} Z`,
      lx: c + r * 0.62 * Math.cos(mid),
      ly: c + r * 0.62 * Math.sin(mid),
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Cinco blocos de 20%: criptomoedas, fundos imobiliários, ações, renda fixa e reserva para oportunidades">
      {slices.map(({ b, d }) => (
        <path key={b.key} d={d} fill={b.color} stroke="#070d1c" strokeWidth={3} />
      ))}
      {slices.map(({ b, lx, ly }) => (
        <text key={b.key} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={size / 16} fontWeight={700} fill="#fff" style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.45)", strokeWidth: 3 }}>
          {b.pct}%
        </text>
      ))}
    </svg>
  );
}
