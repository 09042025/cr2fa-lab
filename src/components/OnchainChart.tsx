"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { dateTicks, extent, linePath, linearTicks, logTicks, padExtent, sampleIndices } from "@/lib/chartmath";
import { dayToDate, formatValue, type Fmt } from "@/lib/onchain-defs";

type Series = (number | null)[];

export interface ChartLine {
  key: string;
  /** "price" usa o eixo do preço; para os demais, o id do indicador (um eixo à direita por indicador). */
  axisId: string;
  label: string;
  color: string;
  dashed: boolean;
  values: Series;
  scale: "linear" | "log";
  fmt: Fmt;
  refs?: number[];
}

interface Props {
  start: number;
  price: Series;
  lines: ChartLine[];
  halvings: number[];
  showHalvings: boolean;
  logPrice: boolean;
  i0: number;
  i1: number;
  onZoom: (i0: number, i1: number) => void;
  onReset: () => void;
  /** Avisa qual dia está sob o cursor (ou o último do período), para o painel mostrar os valores. */
  onCursor?: (index: number, hovering: boolean) => void;
}

/** Quantos eixos à direita são desenhados; os demais indicadores usam a escala própria, sem rótulos. */
const MAX_VISIBLE_AXES = 2;

export const PRICE_COLOR = "#f3d27a";
const MUTED = "#93a0c4";
const GRID = "rgba(36,51,95,0.7)";

const makeScale = (lo: number, hi: number, log: boolean, top: number, height: number) => {
  if (log) {
    const a = Math.log10(lo);
    const b = Math.log10(hi);
    return (v: number): number | null => (v > 0 ? top + height * (1 - (Math.log10(v) - a) / (b - a)) : null);
  }
  return (v: number): number | null => top + height * (1 - (v - lo) / (hi - lo));
};

type YWin = { lo: number; hi: number };
/** Valor correspondente à altura (0 = base, 1 = topo) dentro de [lo, hi]. */
const valueAt = (lo: number, hi: number, log: boolean, f: number) =>
  log ? 10 ** (Math.log10(lo) + f * (Math.log10(hi) - Math.log10(lo))) : lo + f * (hi - lo);

const fmtDate = (day: number) => dayToDate(day).toLocaleDateString("pt-BR", { timeZone: "UTC" });

export function OnchainChart({ start, price, lines, halvings, showHalvings, logPrice, i0, i1, onZoom, onReset, onCursor }: Props) {
  const uid = useId().replace(/:/g, "");
  const wrap = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(900);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ kind: "box" | "axis"; axis?: string; x0: number; x1: number; y0: number; y1: number } | null>(null);
  /** Zoom vertical por eixo ("price" ou o id do indicador), em valores reais. */
  const [yz, setYz] = useState<Record<string, YWin>>({});

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    setW(Math.max(300, Math.floor(el.clientWidth)));
    const ro = new ResizeObserver((e) => setW(Math.max(300, Math.floor(e[0].contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const compact = w < 560;
  const h = compact ? 400 : 510;
  const padL = compact ? 56 : 66;
  const padT = 12;
  const padB = 26;
  const axisW = compact ? 56 : 66;
  const fs = compact ? 10 : 11;

  const geo = useMemo(() => {
    const ownIds = [...new Set(lines.filter((l) => l.axisId !== "price").map((l) => l.axisId))];
    const visibleAxes = Math.min(ownIds.length, MAX_VISIBLE_AXES);
    const padR = visibleAxes > 0 ? 4 + visibleAxes * axisW : 16;
    const plotW = Math.max(120, w - padL - padR);
    const plotH = h - padT - padB;
    const span = Math.max(1, i1 - i0);
    const x = (i: number) => padL + ((i - i0) / span) * plotW;

    // Eixo do preço: o preço e as linhas que usam o mesmo eixo.
    const priceLines = lines.filter((l) => l.axisId === "price");
    const pe = extent([price, ...priceLines.map((l) => l.values)], i0, i1, logPrice);
    const [pLo0, pHi0] = padExtent(pe ?? [1, 10], logPrice, 0.04);
    const pLo = yz.price?.lo ?? pLo0;
    const pHi = yz.price?.hi ?? pHi0;
    const yPrice = makeScale(pLo, pHi, logPrice, padT, plotH);
    const lt = logPrice ? logTicks(pLo, pHi) : [];
    const priceTicks = logPrice && lt.length >= 3 ? lt : linearTicks(pLo, pHi, 7);

    const axes = ownIds.map((id, k) => {
      const group = lines.filter((l) => l.axisId === id);
      const log = group[0].scale === "log";
      const ex = extent(group.map((l) => l.values), i0, i1, log);
      const [lo0, hi0] = padExtent(ex ?? [1, 10], log, 0.06);
      const lo = yz[id]?.lo ?? lo0;
      const hi = yz[id]?.hi ?? hi0;
      return {
        log,
        id,
        color: group[0].color,
        fmt: group[0].fmt,
        x0: padL + plotW + k * axisW,
        hidden: k >= MAX_VISIBLE_AXES,
        y: makeScale(lo, hi, log, padT, plotH),
        ticks: log && logTicks(lo, hi).length >= 3 ? logTicks(lo, hi) : linearTicks(lo, hi, 5),
        lo,
        hi,
      };
    });

    const buckets = Math.ceil(plotW / 2);
    const gap = Math.max(3, Math.ceil((i1 - i0 + 1) / buckets) * 2 + 1);
    const idxCache = (values: Series) => sampleIndices(values, i0, i1, buckets);
    const pricePath = linePath(idxCache(price), x, yPrice, price, gap);
    const paths = lines.map((l) => {
      const y = l.axisId === "price" ? yPrice : axes.find((a) => a.id === l.axisId)!.y;
      return linePath(idxCache(l.values), x, y, l.values, gap);
    });
    const dt = dateTicks(start + i0, start + i1, compact ? 5 : 9);
    return { plotW, plotH, padR, x, yPrice, priceTicks, axes, pricePath, paths, dt, pLo, pHi };
  }, [lines, price, w, h, padL, axisW, i0, i1, logPrice, start, compact, yz]);

  const idxFromPx = (px: number) => Math.min(i1, Math.max(i0, Math.round(i0 + ((px - padL) / geo.plotW) * (i1 - i0))));
  const box = () => svgRef.current?.getBoundingClientRect();
  const localX = (e: { clientX: number }) => e.clientX - (box()?.left ?? 0);
  const localY = (e: { clientY: number }) => e.clientY - (box()?.top ?? 0);
  const fracFromY = (py: number) => Math.min(1, Math.max(0, 1 - (py - padT) / geo.plotH));
  /** Faixa de valores de um eixo entre duas alturas em pixels. */
  const axisInfo = (id: string) => {
    if (id === "price") return { lo: geo.pLo, hi: geo.pHi, log: logPrice };
    const a = geo.axes.find((x) => x.id === id)!;
    return { lo: a.lo, hi: a.hi, log: a.log };
  };
  const winFromPx = (id: string, ya: number, yb: number): YWin => {
    const { lo, hi, log } = axisInfo(id);
    const fa = fracFromY(Math.max(ya, yb));
    const fb = fracFromY(Math.min(ya, yb));
    return { lo: valueAt(lo, hi, log, fa), hi: valueAt(lo, hi, log, fb) };
  };
  const axisIds = ["price", ...geo.axes.map((a) => a.id)];
  const axisAtX = (px: number): string | null => {
    if (px < padL) return "price";
    for (const a of geo.axes.filter((x) => !x.hidden)) if (px >= a.x0 && px < a.x0 + axisW) return a.id;
    return null;
  };

  const onMove = (e: React.PointerEvent) => {
    const px = localX(e);
    if (!drag) { if (px >= padL && px <= padL + geo.plotW) setHover(idxFromPx(px)); return; }
    setHover(drag.kind === "box" ? idxFromPx(px) : null);
    setDrag({ ...drag, x1: px, y1: localY(e) });
  };
  const onDown = (e: React.PointerEvent<SVGRectElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ kind: "box", x0: localX(e), x1: localX(e), y0: localY(e), y1: localY(e) });
  };
  const onAxisDown = (id: string) => (e: React.PointerEvent<SVGRectElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ kind: "axis", axis: id, x0: localX(e), x1: localX(e), y0: localY(e), y1: localY(e) });
  };
  const onUp = () => {
    if (drag?.kind === "axis" && Math.abs(drag.y1 - drag.y0) >= 10 && drag.axis) {
      setYz((z) => ({ ...z, [drag.axis!]: winFromPx(drag.axis!, drag.y0, drag.y1) }));
    } else if (drag?.kind === "box") {
      const dx = Math.abs(drag.x1 - drag.x0);
      const dy = Math.abs(drag.y1 - drag.y0);
      if (dx >= 14) {
        const a = idxFromPx(Math.min(drag.x0, drag.x1));
        const b = idxFromPx(Math.max(drag.x0, drag.x1));
        if (b - a >= 14) onZoom(a, b);
      }
      // caixa que não cobre a altura toda também aproxima na vertical, em todos os eixos
      if (dy >= 14 && dy < geo.plotH * 0.9) {
        const next: Record<string, YWin> = {};
        for (const id of axisIds) next[id] = winFromPx(id, drag.y0, drag.y1);
        setYz(next);
      }
    }
    setDrag(null);
  };
  const resetAll = () => { setYz({}); onReset(); };

  // Roda do mouse: Ctrl/⌘ + roda move o gráfico para os lados; a roda sobre um eixo estica/encolhe a escala dele.
  const live = useRef({ geo, i0, i1, n: price.length, yz, padL, axisW, plotW: geo.plotW, onZoom });
  live.current = { geo, i0, i1, n: price.length, yz, padL, axisW, plotW: geo.plotW, onZoom };
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const L = live.current;
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const span = L.i1 - L.i0;
        const d = Math.round(((e.deltaY + e.deltaX) / L.plotW) * span * 1.5) || Math.sign(e.deltaY + e.deltaX);
        const n0 = Math.max(0, Math.min(L.n - 1 - span, L.i0 + d));
        if (n0 !== L.i0) L.onZoom(n0, n0 + span);
        return;
      }
      let id: string | null = null;
      if (px < L.padL) id = "price";
      else for (const a of L.geo.axes) if (!a.hidden && px >= a.x0 && px < a.x0 + L.axisW) id = a.id;
      if (!id) return;
      e.preventDefault();
      const info = id === "price" ? { lo: L.geo.pLo, hi: L.geo.pHi, log: logPriceRef.current } : (() => { const a = L.geo.axes.find((x) => x.id === id)!; return { lo: a.lo, hi: a.hi, log: a.log }; })();
      const f = Math.min(1, Math.max(0, 1 - (e.clientY - r.top - padT) / L.geo.plotH));
      const k = e.deltaY < 0 ? 0.8 : 1.25; // roda para cima aproxima
      const lo = valueAt(info.lo, info.hi, info.log, f * (1 - k));
      const hi = valueAt(info.lo, info.hi, info.log, f + (1 - f) * k);
      setYz((z) => ({ ...z, [id as string]: { lo, hi } }));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);
  const logPriceRef = useRef(logPrice);
  logPriceRef.current = logPrice;

  // Sem o cursor sobre o gráfico, o topo mostra o valor mais recente de cada série (útil no celular, onde não há cursor).
  const lastIndexOf = (v: Series) => { for (let k = v.length - 1; k >= 0; k--) if (v[k] !== null && v[k] !== undefined) return k; return -1; };
  const latest = Math.max(0, price.length - 1);
  const cur = hover ?? latest;
  const day = start + cur;
  const yAt = (l: ChartLine, v: number) => (l.axisId === "price" ? geo.yPrice(v) : geo.axes.find((a) => a.id === l.axisId)?.y(v) ?? null);
  const priceNow = price[cur];
  useEffect(() => { onCursor?.(cur, hover !== null); }, [cur, hover, onCursor]);

  return (
    <div>
      <div className="mb-2 space-y-1.5 text-xs" aria-live="polite">
        <p className="font-semibold text-white">
          {hover === null ? <>Valores atuais <span className="font-normal text-muted">(último dado: {fmtDate(start + latest)}). Passe o cursor sobre o gráfico para ver outra data.</span></> : fmtDate(day)}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: PRICE_COLOR }} />
            <span className="text-muted">Preço BTC</span>
            <span className="font-semibold" style={{ color: PRICE_COLOR }}>{priceNow === null || priceNow === undefined ? "—" : formatValue("usd", priceNow)}</span>
          </span>
          {lines.map((l) => {
            const v = hover === null ? (lastIndexOf(l.values) >= 0 ? l.values[lastIndexOf(l.values)] : null) : l.values[hover];
            const stale = hover === null && lastIndexOf(l.values) >= 0 && lastIndexOf(l.values) < latest;
            return (
              <span key={l.key} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: l.color }} />
                <span className="text-muted">{l.label}</span>
                <span className="font-semibold" style={{ color: l.color }}>{v === null || v === undefined ? "—" : formatValue(l.fmt, v)}</span>
                {stale && <span className="text-muted">({fmtDate(start + lastIndexOf(l.values))})</span>}
              </span>
            );
          })}
        </div>
      </div>

      <div ref={wrap} className="w-full select-none">
        <svg ref={svgRef} width={w} height={h} role="img" aria-label="Gráfico do preço do Bitcoin com indicadores on-chain" className="block" style={{ fontSize: fs }}>
          <defs>
            <clipPath id={`clip-${uid}`}><rect x={padL} y={padT} width={geo.plotW} height={geo.plotH} /></clipPath>
          </defs>

          {/* grade e eixo do preço */}
          {geo.priceTicks.map((t) => {
            const y = geo.yPrice(t);
            if (y === null) return null;
            return (
              <g key={`p${t}`}>
                <line x1={padL} x2={padL + geo.plotW} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
                <text x={padL - 6} y={y + 3.5} textAnchor="end" fill={PRICE_COLOR}>{formatValue("usd", t, true)}</text>
              </g>
            );
          })}
          {geo.dt.map((t) => {
            const x = geo.x(t.day - start);
            return (
              <g key={`d${t.day}`}>
                <line x1={x} x2={x} y1={padT} y2={padT + geo.plotH} stroke={GRID} strokeWidth={1} opacity={0.45} />
                <text x={x} y={h - 8} textAnchor="middle" fill={MUTED}>{t.label}</text>
              </g>
            );
          })}
          <line x1={padL} x2={padL} y1={padT} y2={padT + geo.plotH} stroke={PRICE_COLOR} opacity={0.7} />
          <line x1={padL} x2={padL + geo.plotW} y1={padT + geo.plotH} y2={padT + geo.plotH} stroke={GRID} />

          {/* eixos dos indicadores (um por indicador, à direita) */}
          {geo.axes.filter((a) => !a.hidden).map((a) => (
            <g key={`a${a.id}`}>
              <line x1={a.x0} x2={a.x0} y1={padT} y2={padT + geo.plotH} stroke={a.color} opacity={0.8} />
              {a.ticks.map((t) => {
                const y = a.y(t);
                if (y === null) return null;
                return (
                  <g key={t}>
                    <line x1={a.x0} x2={a.x0 + 4} y1={y} y2={y} stroke={a.color} opacity={0.8} />
                    <text x={a.x0 + 7} y={y + 3.5} fill={a.color}>{formatValue(a.fmt, t, true)}</text>
                  </g>
                );
              })}
            </g>
          ))}

          <g clipPath={`url(#clip-${uid})`}>
            {showHalvings && halvings.map((d) => {
              const i = d - start;
              if (i < i0 || i > i1) return null;
              const x = geo.x(i);
              return (
                <g key={`h${d}`}>
                  <line x1={x} x2={x} y1={padT} y2={padT + geo.plotH} stroke={PRICE_COLOR} strokeDasharray="3 4" opacity={0.4} />
                  <text x={x + 4} y={padT + 11} fill={PRICE_COLOR} opacity={0.75}>Halving</text>
                </g>
              );
            })}
            {/* linhas de referência dos indicadores */}
            {lines.map((l) => {
              if (!l.refs || l.axisId === "price") return null;
              const ax = geo.axes.find((a) => a.id === l.axisId);
              if (!ax || ax.hidden) return null;
              return l.refs.map((r) => {
                const y = ax.y(r);
                if (y === null || y < padT || y > padT + geo.plotH) return null;
                return (
                  <g key={`${l.key}r${r}`}>
                    <line x1={padL} x2={padL + geo.plotW} y1={y} y2={y} stroke={l.color} strokeDasharray="5 5" opacity={0.4} />
                    <text x={padL + 4} y={y - 3} fill={l.color} opacity={0.8}>{formatValue(l.fmt, r, true)}</text>
                  </g>
                );
              });
            })}
            {lines.map((l, k) => (
              <path key={l.key} d={geo.paths[k]} fill="none" stroke={l.color} strokeWidth={1.6} strokeDasharray={l.dashed ? "6 4" : undefined} strokeLinejoin="round" />
            ))}
            <path d={geo.pricePath} fill="none" stroke={PRICE_COLOR} strokeWidth={1.8} strokeLinejoin="round" />
          </g>

          {/* cursor */}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={geo.x(hover)} x2={geo.x(hover)} y1={padT} y2={padT + geo.plotH} stroke="#e8ecf8" opacity={0.45} />
              {priceNow !== null && priceNow !== undefined && geo.yPrice(priceNow) !== null && <circle cx={geo.x(hover)} cy={geo.yPrice(priceNow) as number} r={3.5} fill={PRICE_COLOR} />}
              {lines.map((l) => {
                const v = l.values[hover];
                if (v === null || v === undefined) return null;
                const y = yAt(l, v);
                return y === null ? null : <circle key={l.key} cx={geo.x(hover)} cy={y} r={3.5} fill={l.color} />;
              })}
            </g>
          )}
          {drag?.kind === "box" && (Math.abs(drag.x1 - drag.x0) > 2 || Math.abs(drag.y1 - drag.y0) > 2) && (
            <rect x={Math.min(drag.x0, drag.x1)} y={Math.min(drag.y0, drag.y1)} width={Math.abs(drag.x1 - drag.x0)} height={Math.abs(drag.y1 - drag.y0)} fill="#f3d27a" fillOpacity={0.14} stroke="#f3d27a" strokeOpacity={0.7} strokeDasharray="4 3" pointerEvents="none" />
          )}
          {drag?.kind === "axis" && Math.abs(drag.y1 - drag.y0) > 2 && (() => {
            const a = drag.axis === "price" ? { x: 0, w: padL } : { x: geo.axes.find((q) => q.id === drag.axis)?.x0 ?? 0, w: axisW };
            return <rect x={a.x} y={Math.min(drag.y0, drag.y1)} width={a.w} height={Math.abs(drag.y1 - drag.y0)} fill="#ec6bb0" fillOpacity={0.2} pointerEvents="none" />;
          })()}

          {/* eixos: arraste na vertical para aproximar só aquele eixo; roda do mouse estica; duplo clique desfaz */}
          {[{ id: "price", x: 0, w: padL }, ...geo.axes.filter((a) => !a.hidden).map((a) => ({ id: a.id, x: a.x0, w: axisW }))].map((a) => (
            <rect key={`z${a.id}`} x={a.x} y={padT} width={a.w} height={geo.plotH} fill="transparent"
              style={{ touchAction: "pan-y", cursor: "ns-resize" }}
              onPointerDown={onAxisDown(a.id)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}
              onDoubleClick={() => setYz((z) => { const n = { ...z }; delete n[a.id]; return n; })} />
          ))}

          {/* área de interação */}
          <rect
            x={padL} y={padT} width={geo.plotW} height={geo.plotH} fill="transparent"
            style={{ touchAction: "pan-y", cursor: "crosshair" }}
            onPointerMove={onMove} onPointerDown={onDown} onPointerUp={onUp}
            onPointerLeave={() => { if (!drag) setHover(null); }}
            onPointerCancel={() => setDrag(null)}
            onDoubleClick={resetAll}
          />
        </svg>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Arraste uma caixa sobre o trecho que quer ver para aproximar (largura e altura). Arraste na vertical sobre um eixo (ex.: o rosa) para esticar só aquela escala; a roda do mouse sobre o eixo também. Ctrl/⌘ + roda move o gráfico para os lados. Clique duas vezes no gráfico para voltar ao início.
        {Object.keys(yz).length > 0 && <> <button type="button" className="text-gold-soft underline" onClick={() => setYz({})}>Desfazer zoom vertical</button></>}
      </p>
    </div>
  );
}
