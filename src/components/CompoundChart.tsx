"use client";

import { useState } from "react";
import type { ProjectionPoint } from "@/lib/protocol";
import { brl } from "@/lib/format";

const W = 720, H = 300, L = 78, R = 16, T = 16, B = 34;
const COLORS = { invested: "#93a0c4", nominal: "#f3d27a", real: "#34d399" } as const;

/** Rótulo curto do eixo, escrito à mão para ser igual no servidor e no navegador. */
function short(v: number): string {
  const f = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
  if (v >= 1e9) return `R$ ${f(v / 1e9)} bi`;
  if (v >= 1e6) return `R$ ${f(v / 1e6)} mi`;
  if (v >= 1e3) return `R$ ${f(v / 1e3)} mil`;
  return `R$ ${f(v)}`;
}

/** Escolhe um teto "redondo" (1, 2, 2,5, 5 ou 10 vezes uma potência de 10) com 4 divisões. */
function niceStep(max: number): number {
  const raw = max / 4, pow = Math.pow(10, Math.floor(Math.log10(raw)));
  return ([1, 2, 2.5, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow;
}

const label = (m: number) => (m % 12 === 0 ? `${m / 12}a` : m < 12 ? `${m}m` : `${Math.floor(m / 12)}a${m % 12}m`);

/** Gráfico (SVG) de investido x nominal x valor de hoje. Atualiza sozinho a cada mudança na simulação. */
export function CompoundChart({ series }: { series: ProjectionPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const months = series[series.length - 1].month;
  const top = Math.max(1, ...series.map((p) => Math.max(p.nominal, p.invested, p.real)));
  const step = niceStep(top);
  const max = step * Math.ceil(top / step);
  const x = (m: number) => L + (m / Math.max(1, months)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = (k: keyof typeof COLORS) => series.map((p, i) => `${i ? "L" : "M"}${x(p.month).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const area = `${path("nominal")} L${x(months)},${y(0)} L${x(0)},${y(0)} Z`;
  const yTicks = Array.from({ length: Math.round(max / step) + 1 }, (_, k) => k * step);
  const xTicks = [0, 1, 2, 3, 4, 5].map((k) => Math.round((months * k) / 5)).filter((m, i, a) => a.indexOf(m) === i);
  const hp = hover === null ? null : series[hover];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const m = Math.round(((px - L) / (W - L - R)) * months);
    setHover(Math.min(months, Math.max(0, m)));
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span><i className="mr-1 inline-block h-2 w-3 rounded-sm align-middle" style={{ background: COLORS.nominal }} />Nominal</span>
        <span><i className="mr-1 inline-block h-2 w-3 rounded-sm align-middle" style={{ background: COLORS.real }} />Valor de hoje (sem inflação)</span>
        <span><i className="mr-1 inline-block h-2 w-3 rounded-sm align-middle" style={{ background: COLORS.invested }} />Investido</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" role="img" aria-label="Gráfico da evolução do patrimônio: nominal, valor de hoje e total investido" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="cc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.nominal} stopOpacity="0.28" /><stop offset="100%" stopColor={COLORS.nominal} stopOpacity="0" /></linearGradient>
        </defs>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#24335f" strokeDasharray={i ? "3 4" : undefined} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#93a0c4">{short(v)}</text>
          </g>
        ))}
        {xTicks.map((m) => <text key={m} x={x(m)} y={H - 10} textAnchor="middle" fontSize="11" fill="#93a0c4">{label(m)}</text>)}
        <path d={area} fill="url(#cc-fill)" />
        <path d={path("invested")} fill="none" stroke={COLORS.invested} strokeWidth="2" strokeDasharray="5 4" />
        <path d={path("real")} fill="none" stroke={COLORS.real} strokeWidth="2.5" />
        <path d={path("nominal")} fill="none" stroke={COLORS.nominal} strokeWidth="2.5" />
        {hp && (
          <g>
            <line x1={x(hp.month)} x2={x(hp.month)} y1={T} y2={H - B} stroke="#93a0c4" strokeOpacity="0.5" />
            {(["nominal", "real", "invested"] as const).map((k) => <circle key={k} cx={x(hp.month)} cy={y(hp[k])} r="4" fill={COLORS[k]} stroke="#070d1c" strokeWidth="1.5" />)}
          </g>
        )}
      </svg>
      <p className="mt-1 min-h-[2.5rem] text-xs text-muted" aria-live="polite">
        {hp ? (
          <>
            <strong className="text-white">{label(hp.month)}</strong>
            {" · "}Nominal <strong style={{ color: COLORS.nominal }}>{brl(hp.nominal)}</strong>
            {" · "}Valor de hoje <strong style={{ color: COLORS.real }}>{brl(hp.real)}</strong>
            {" · "}Investido {brl(hp.invested)}
          </>
        ) : "Passe o dedo ou o mouse sobre o gráfico para ver os valores em cada momento."}
      </p>
    </div>
  );
}
