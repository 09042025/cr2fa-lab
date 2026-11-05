"use client";
import { useState } from "react";

interface Pt { t: number; value: number; hold: number }
const usd = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const day = (t: number) => new Date(t * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });

/** Valor da posição (dourado) contra segurar os tokens (HOLD, tracejado), com cursor interativo. A diferença é a divergência. */
export function HistoryChart({ points }: { points: Pt[] }) {
  const [i, setI] = useState<number | null>(null);
  if (points.length < 2) return <p className="text-sm text-muted">Histórico de preços indisponível para esta posição.</p>;
  const W = 800, H = 280, L = 52, B = 22, T = 10;
  const all = points.flatMap((p) => [p.value, p.hold]);
  const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo || 1) * 0.08;
  const y0 = lo - pad, y1 = hi + pad;
  const x = (k: number) => L + (k / (points.length - 1)) * (W - L - 8);
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const path = (f: (p: Pt) => number) => points.map((p, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(f(p)).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => y0 + f * (y1 - y0));
  const cur = i === null ? null : points[i];
  const last = points[points.length - 1];
  const show = cur ?? last;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        <span className="flex items-center gap-1"><i className="inline-block h-0.5 w-4 bg-gold" /> Posição (sem taxas) <b className="text-white">{usd(show.value)}</b></span>
        <span className="flex items-center gap-1"><i className="inline-block h-0.5 w-4 border-t-2 border-dashed border-muted" /> Segurar (HOLD) <b className="text-white">{usd(show.hold)}</b></span>
        <span className={show.value - show.hold >= 0 ? "text-up" : "text-down"}>Divergência {usd(show.value - show.hold)}</span>
        <span className="text-muted">{day(show.t)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" style={{ height: 280 }} role="img" aria-label="Valor da posição contra HOLD"
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const f = ((e.clientX - r.left) / r.width) * W; setI(Math.min(points.length - 1, Math.max(0, Math.round(((f - L) / (W - L - 8)) * (points.length - 1))))); }}
        onPointerLeave={() => setI(null)}>
        <defs><linearGradient id="hv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d9a520" stopOpacity="0.30" /><stop offset="100%" stopColor="#d9a520" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((v) => <g key={v}><line x1={L} x2={W - 8} y1={y(v)} y2={y(v)} stroke="#24335f" strokeDasharray="3 6" /><text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#8791b5">{usd(v)}</text></g>)}
        <path d={`${path((p) => p.value)} L${x(points.length - 1)},${H - B} L${x(0)},${H - B} Z`} fill="url(#hv)" />
        <path d={path((p) => p.hold)} fill="none" stroke="#8791b5" strokeWidth="1.6" strokeDasharray="5 5" strokeLinejoin="round" />
        <path d={path((p) => p.value)} fill="none" stroke="#d9a520" strokeWidth="2.2" strokeLinejoin="round" />
        <text x={L} y={H - 6} fontSize="10" fill="#8791b5">{day(points[0].t)}</text>
        <text x={W - 8} y={H - 6} fontSize="10" fill="#8791b5" textAnchor="end">{day(last.t)}</text>
        {i !== null && cur && <g><line x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="#fff" strokeOpacity="0.4" /><circle cx={x(i)} cy={y(cur.value)} r="4" fill="#d9a520" /><circle cx={x(i)} cy={y(cur.hold)} r="3.5" fill="#8791b5" /></g>}
      </svg>
    </div>
  );
}
