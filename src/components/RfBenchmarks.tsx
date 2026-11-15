"use client";
import { useState } from "react";
import type { BenchPoint } from "@/lib/benchmarks";

const PERIODS: { label: string; months: number }[] = [{ label: "6 meses", months: 6 }, { label: "1 ano", months: 12 }, { label: "2 anos", months: 24 }, { label: "3 anos", months: 36 }, { label: "5 anos", months: 60 }];
const SERIES = [
  { key: "cdi", label: "CDI", color: "#d9a520" },
  { key: "ipca", label: "IPCA", color: "#60a5fa" },
  { key: "ibov", label: "Ibovespa", color: "#34d399" },
] as const;
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** Comparativo CDI x IPCA x Ibovespa no período escolhido: retorno acumulado, todos partindo de 0% no início. */
export function RfBenchmarks({ points }: { points: BenchPoint[] }) {
  const [months, setMonths] = useState(60);
  const [on, setOn] = useState<Record<string, boolean>>({ cdi: true, ipca: true, ibov: true });
  const slice = points.slice(-Math.min(points.length, months + 1));
  const [hover, setHover] = useState<number | null>(null);
  const first = slice[0];
  const data = SERIES.map((s) => { const b = slice.find((p) => p[s.key] !== null)?.[s.key] ?? null; return { ...s, vals: slice.map((p) => { const v = p[s.key]; return v === null || b === null ? null : (v / b - 1) * 100; }) }; });
  const shown = data.filter((d) => on[d.key] && d.vals.some((v) => v !== null));
  const all = shown.flatMap((d) => d.vals.filter((v): v is number => v !== null));
  const min = Math.min(0, ...all), max = Math.max(0.1, ...all), span = max - min || 1;
  const W = 800, H = 260, padL = 44, padB = 22, padT = 8, padR = 8;
  const x = (i: number) => padL + (i / Math.max(1, slice.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);
  const ticks = [0, 1, 2, 3, 4].map((i) => min + (span * i) / 4);
  const at = (clientX: number, el: SVGSVGElement) => { const r = el.getBoundingClientRect(); const px = ((clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(slice.length - 1, Math.round(((px - padL) / (W - padL - padR)) * (slice.length - 1))))); };
  const hi = hover !== null && hover < slice.length ? hover : null;
  const lbl = (t: number) => new Date(t).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
  return (
    <section className="card mb-6 p-4">
      <h2 className="font-semibold">Renda fixa x referências do mercado</h2>
      <p className="mb-1 h-4 text-xs text-gold-soft">{hi !== null ? `Acumulado de ${lbl(first.ts)} até ${lbl(slice[hi].ts)}` : "Passe o cursor (ou o dedo) sobre o gráfico para ver cada mês."}</p>
      <p className="mb-3 text-xs text-muted">Retorno acumulado de CDI, IPCA e Ibovespa no período, todos começando em 0%. Serve para comparar o que o seu título rendeu com a inflação e com a bolsa.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {PERIODS.map((p) => <button key={p.months} type="button" onClick={() => setMonths(p.months)} aria-pressed={months === p.months} className={`rounded-full border px-3 py-1 text-xs ${months === p.months ? "border-gold bg-gold/20 text-gold-soft" : "border-line text-muted"}`}>{p.label}</button>)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y" role="img" aria-label="Gráfico comparativo de CDI, IPCA e Ibovespa" onMouseMove={(e) => at(e.clientX, e.currentTarget)} onMouseLeave={() => setHover(null)} onTouchMove={(e) => at(e.touches[0].clientX, e.currentTarget)} onTouchEnd={() => setHover(null)}>
        {ticks.map((t) => <g key={t}><line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#24335f" strokeWidth={t === 0 ? 1.2 : 0.5} /><text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#8f9bc0">{t.toFixed(0)}%</text></g>)}
        {shown.map((d) => { const path = d.vals.map((v, i) => (v === null ? "" : `${i === 0 || d.vals[i - 1] === null ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join(" "); return <path key={d.key} d={path} fill="none" stroke={d.color} strokeWidth="2" strokeLinejoin="round" />; })}
        {hi !== null && <g pointerEvents="none"><line x1={x(hi)} x2={x(hi)} y1={padT} y2={H - padB} stroke="#8f9bc0" strokeWidth="0.8" strokeDasharray="3 3" />{shown.map((d) => d.vals[hi] === null ? null : <circle key={d.key} cx={x(hi)} cy={y(d.vals[hi] as number)} r="4" fill={d.color} stroke="#0b1020" strokeWidth="1.5" />)}</g>}
        <text x={padL} y={H - 6} fontSize="10" fill="#8f9bc0">{lbl(first.ts)}</text>
        <text x={W - padR} y={H - 6} textAnchor="end" fontSize="10" fill="#8f9bc0">{lbl(slice[slice.length - 1].ts)}</text>
      </svg>
      <ul className="mt-3 grid grid-cols-3 gap-2 text-sm">
        {data.map((d) => { const last = hi !== null ? d.vals[hi] : ([...d.vals].reverse().find((v) => v !== null) ?? null); return (
          <li key={d.key}><label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={on[d.key]} onChange={(e) => setOn((o) => ({ ...o, [d.key]: e.target.checked }))} /><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /><span className="text-muted">{d.label}</span></label><p className={`mt-0.5 text-lg font-semibold ${last !== null && last < 0 ? "text-down" : ""}`}>{last === null ? (d.vals.every((v) => v === null) ? <span className="text-xs font-normal text-muted">indisponível agora</span> : "—") : pct(last)}</p></li>
        ); })}
      </ul>
      <p className="mt-3 text-xs text-muted">Fontes: Banco Central (CDI e IPCA) e Yahoo Finance (Ibovespa, fechamento mensal). Rentabilidade passada não garante resultado futuro.</p>
    </section>
  );
}
