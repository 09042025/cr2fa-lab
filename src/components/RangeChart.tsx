"use client";
import { useRef, useState } from "react";

interface Props {
  price: number; min: number; max: number; bins?: { lo: number; hi: number; values: number[] } | null;
  onChange: (min: number, max: number) => void; fmtPct: (v: number) => string;
}
const COLS = 100;

/** Gráfico de liquidez com a faixa arrastável (alças de mínimo e máximo), como na Krystal. Escala de preço logarítmica. */
export function RangeChart({ price, min, max, bins, onChange, fmtPct }: Props) {
  const [zoom, setZoom] = useState(3);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: "min" | "max" | "body"; startF: number; min: number; max: number } | null>(null);
  const lo = price / zoom, hi = price * zoom, llo = Math.log(lo), lhi = Math.log(hi);
  const toF = (v: number) => (v <= 0 ? 0 : !Number.isFinite(v) ? 1 : (Math.log(v) - llo) / (lhi - llo));
  const fromF = (f: number) => Math.exp(llo + f * (lhi - llo));
  const clampF = (f: number) => Math.min(1, Math.max(0, f));
  const fMin = clampF(toF(min)), fMax = clampF(toF(max));

  const cols = Array.from({ length: COLS }, (_, i) => {
    if (!bins) return 0;
    const v = fromF((i + 0.5) / COLS);
    const f = (Math.log(v) - Math.log(bins.lo)) / (Math.log(bins.hi) - Math.log(bins.lo));
    const idx = Math.floor(f * bins.values.length);
    return idx >= 0 && idx < bins.values.length ? bins.values[idx] : 0;
  });

  const pointerF = (ev: React.PointerEvent) => { const r = box.current!.getBoundingClientRect(); return clampF((ev.clientX - r.left) / r.width); };
  const start = (kind: "min" | "max" | "body") => (ev: React.PointerEvent) => {
    ev.preventDefault(); ev.stopPropagation();
    (box.current as HTMLDivElement).setPointerCapture(ev.pointerId);
    drag.current = { kind, startF: pointerF(ev), min, max };
  };
  const move = (ev: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const f = pointerF(ev);
    if (d.kind === "min") onChange(f <= 0.005 ? 0 : Math.min(fromF(f), (Number.isFinite(max) ? max : hi * 100) * 0.9999), max);
    else if (d.kind === "max") onChange(min, f >= 0.995 ? Infinity : Math.max(fromF(f), min * 1.0001));
    else {
      const delta = (f - d.startF) * (lhi - llo), k = Math.exp(delta);
      onChange(d.min > 0 ? d.min * k : 0, Number.isFinite(d.max) ? d.max * k : Infinity);
    }
  };
  const end = () => { drag.current = null; };
  const ticks = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => ({ f, v: fromF(f) }));
  const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 4 });

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-muted">Distribuição de liquidez{bins ? "" : " (indisponível para este pool: arraste a faixa mesmo assim)"}</span>
        <span className="flex gap-1">
          <button type="button" className="btn btn-ghost px-2 py-0.5 text-sm" aria-label="Aproximar" onClick={() => setZoom((z) => Math.max(1.15, z / 1.5))}>+</button>
          <button type="button" className="btn btn-ghost px-2 py-0.5 text-sm" aria-label="Afastar" onClick={() => setZoom((z) => Math.min(30, z * 1.5))}>−</button>
        </span>
      </div>
      <div ref={box} className="relative h-40 touch-none select-none overflow-hidden rounded-lg border border-line bg-black/20" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <div className="absolute inset-x-0 bottom-0 top-0 flex items-end">
          {cols.map((c, i) => { const f = (i + 0.5) / COLS; const inside = f >= fMin && f <= fMax; return <div key={i} style={{ width: `${100 / COLS}%`, height: `${Math.max(c > 0 ? 3 : 0, c * 90)}%`, background: inside ? "#38bdf8" : "#38bdf855" }} />; })}
        </div>
        <div className="absolute inset-y-0 cursor-grab bg-emerald-400/10" style={{ left: `${fMin * 100}%`, width: `${Math.max(0, fMax - fMin) * 100}%` }} onPointerDown={start("body")} />
        <div className="pointer-events-none absolute inset-y-0 w-px bg-yellow-300" style={{ left: `${toF(price) * 100}%` }} title="Preço atual" />
        {([["min", fMin, min], ["max", fMax, max]] as const).map(([k, f, v]) => (
          <div key={k} className="absolute inset-y-0 z-10 -ml-2 flex w-4 cursor-ew-resize items-center justify-center" style={{ left: `${f * 100}%` }} onPointerDown={start(k)} role="slider" aria-label={k === "min" ? "Preço mínimo" : "Preço máximo"} aria-valuenow={Number.isFinite(v) ? v : 0}>
            <div className="h-full w-1 bg-emerald-400" /><div className="absolute top-1/2 h-8 w-3 -translate-y-1/2 rounded bg-emerald-400" />
            <span className={`pointer-events-none absolute top-1 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-xs ${k === "min" ? "right-3" : "left-3"}`}>{k === "max" && !Number.isFinite(v) ? "∞" : fmtPct(v)}</span>
          </div>
        ))}
        {ticks.map(({ f, v }) => <span key={f} className="pointer-events-none absolute bottom-0 -translate-x-1/2 text-[10px] text-muted" style={{ left: `${f * 100}%` }}>{sig(v)}</span>)}
      </div>
      <p className="mt-1 text-xs text-muted">Arraste as alças verdes (ou a área entre elas) para mudar a faixa. Linha amarela = preço atual. Escala de preço logarítmica.</p>
    </div>
  );
}
