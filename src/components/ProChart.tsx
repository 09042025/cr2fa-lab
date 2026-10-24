"use client";

import { useEffect, useRef } from "react";
import type { Chart, KLineData } from "klinecharts";
import type { Candle, Timeframe } from "@/lib/candles-core";
import { PERIOD_DAYS } from "@/lib/candles-core";
import type { Fmt } from "@/lib/onchain-defs";

/** Um indicador on-chain pronto para o gráfico (séries diárias alinhadas ao dia `start`). */
export interface OnchainOverlay {
  id: string;
  name: string;
  color: string;
  /** "price" fica no painel das velas; "own" ganha painel próprio abaixo. */
  axis: "price" | "own";
  scale: "linear" | "log";
  fmt: Fmt;
  lines: { label: string; dashed: boolean; values: (number | null)[] }[];
}

/** Indicador técnico nativo da biblioteca. */
export interface TechSpec { name: string; params?: number[]; main: boolean }

interface Props {
  candles: Candle[];
  timeframe: Timeframe;
  start: number;
  onchain: OnchainOverlay[];
  tech: TechSpec[];
  logScale: boolean;
  halvings: number[];
  showHalvings: boolean;
  /** Ferramenta de desenho a ativar (nome do overlay) com um contador para repetir a mesma ferramenta. */
  tool: { name: string; n: number } | null;
  clearDrawings: number;
  onToolDone?: () => void;
}

const DAY_MS = 86_400_000;
const CANDLE_PANE = "candle_pane";
const MUTED = "#93a0c4";
const GRID = "rgba(36,51,95,0.55)";

const nf = (v: number, d: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function fmtValue(fmt: Fmt, v: number): string {
  const a = Math.abs(v);
  switch (fmt) {
    case "ratio": return a >= 100 ? nf(v, 0) : a >= 10 ? nf(v, 1) : nf(v, 2);
    case "pct": return `${nf(v, 1)}%`;
    case "eh": return `${nf(v, a >= 100 ? 0 : 1)} EH/s`;
    case "trillion": return `${nf(v, a >= 100 ? 0 : 1)} T`;
    case "compact": return a >= 1e9 ? `${nf(v / 1e9, 1)} bi` : a >= 1e6 ? `${nf(v / 1e6, 1)} mi` : a >= 1e3 ? `${nf(v / 1e3, 1)} mil` : nf(v, 0);
    case "usd": return a >= 1e12 ? `$${nf(v / 1e12, 1)} tri` : a >= 1e9 ? `$${nf(v / 1e9, 1)} bi` : a >= 1e6 ? `$${nf(v / 1e6, 1)} mi` : a >= 100 ? `$${nf(v, 0)}` : `$${nf(v, 2)}`;
  }
}

interface OcExtend { start: number; periodDays: number; lines: (number | null)[][]; fmt: Fmt }
type OcPoint = { v0?: number; v1?: number };

/** Valor da série no último dia coberto pela vela (diária, semanal ou mensal). */
function valueAt(values: (number | null)[], start: number, ts: number, periodDays: number): number | undefined {
  const endDay = Math.floor(ts / DAY_MS) + (periodDays > 1 ? periodDays - 1 : 0);
  for (let d = Math.min(endDay, start + values.length - 1); d >= Math.max(start, endDay - periodDays + 1); d--) {
    const v = values[d - start];
    if (v !== null && v !== undefined && Number.isFinite(v)) return v;
  }
  return undefined;
}

function calcOc(dataList: KLineData[], ind: { extendData: unknown }): OcPoint[] {
  const e = ind.extendData as OcExtend;
  return dataList.map((k) => {
    const p: OcPoint = {};
    const a = valueAt(e.lines[0] ?? [], e.start, k.timestamp, e.periodDays);
    if (a !== undefined) p.v0 = a;
    if (e.lines[1]) {
      const b = valueAt(e.lines[1], e.start, k.timestamp, e.periodDays);
      if (b !== undefined) p.v1 = b;
    }
    return p;
  });
}

let registered = false;

export function ProChart({ candles, timeframe, start, onchain, tech, logScale, halvings, showHalvings, tool, clearDrawings, onToolDone }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const libRef = useRef<typeof import("klinecharts") | null>(null);
  const dataRef = useRef<KLineData[]>([]);
  const periodRef = useRef<Timeframe>(timeframe);
  const onToolDoneRef = useRef(onToolDone);
  const [ready, setReady] = useReadyFlag();

  useEffect(() => { onToolDoneRef.current = onToolDone; }, [onToolDone]);

  // Velas no formato da biblioteca.
  dataRef.current = candles.map((c) => ({ timestamp: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5] }));
  periodRef.current = timeframe;

  // Criação do gráfico (uma vez).
  useEffect(() => {
    let disposed = false;
    (async () => {
      const lib = await import("klinecharts");
      if (disposed || !box.current) return;
      libRef.current = lib;
      if (!registered) {
        registered = true;
        lib.registerLocale("pt-BR", {
          time: "Data: ", open: "Abertura: ", high: "Máxima: ", low: "Mínima: ", close: "Fechamento: ", volume: "Volume: ", change: "Variação: ", turnover: "Valor: ",
          second: "s", minute: "min", hour: "h", day: "D", week: "S", month: "M", year: "A",
        });
        lib.registerIndicator<OcPoint, number, OcExtend>({
          name: "NIZA_OC1", shortName: "On-chain", series: "normal", precision: 2, shouldOhlc: false,
          figures: [{ key: "v0", title: "", type: "line" }],
          calc: (list, ind) => calcOc(list, ind as unknown as { extendData: unknown }),
        });
        lib.registerIndicator<OcPoint, number, OcExtend>({
          name: "NIZA_OC2", shortName: "On-chain", series: "normal", precision: 2, shouldOhlc: false,
          figures: [{ key: "v0", title: "", type: "line" }, { key: "v1", title: "", type: "line" }],
          calc: (list, ind) => calcOc(list, ind as unknown as { extendData: unknown }),
        });
      }
      const chart = lib.init(box.current, { locale: "pt-BR", timezone: "UTC" });
      if (!chart) return;
      chartRef.current = chart;
      chart.setStyles({
        grid: { horizontal: { color: GRID }, vertical: { color: GRID } },
        candle: {
          bar: { upColor: "#26a69a", downColor: "#ef5350", upBorderColor: "#26a69a", downBorderColor: "#ef5350", upWickColor: "#26a69a", downWickColor: "#ef5350" },
          priceMark: { last: { upColor: "#26a69a", downColor: "#ef5350" } },
          tooltip: { legend: { color: MUTED } },
        },
        indicator: { tooltip: { legend: { color: MUTED } } },
        xAxis: { axisLine: { color: GRID }, tickLine: { color: GRID }, tickText: { color: MUTED } },
        yAxis: { axisLine: { color: GRID }, tickLine: { color: GRID }, tickText: { color: MUTED } },
        separator: { color: "#24335f" },
        crosshair: { horizontal: { line: { color: "#93a0c4" } }, vertical: { line: { color: "#93a0c4" } } },
      });
      chart.setDataLoader({
        getBars: ({ type, callback }) => {
          if (type === "init") callback(dataRef.current, false);
          else callback([], false);
        },
      });
      chart.setSymbol({ ticker: "BTCUSD", pricePrecision: 2, volumePrecision: 0 });
      chart.setPeriod(periodOf(periodRef.current));
      setReady(true);
    })();
    return () => {
      disposed = true;
      if (chartRef.current && libRef.current) libRef.current.dispose(chartRef.current);
      chartRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Velas / período.
  useEffect(() => {
    const chart = chartRef.current;
    if (!ready || !chart || candles.length === 0) return;
    chart.setPeriod(periodOf(timeframe));
    chart.resetData();
  }, [ready, candles, timeframe]);

  // Escala logarítmica do preço.
  useEffect(() => {
    const chart = chartRef.current;
    if (!ready || !chart) return;
    chart.overrideYAxis({ paneId: CANDLE_PANE, name: logScale ? "logarithm" : "normal" });
  }, [ready, logScale]);

  // Indicadores técnicos e on-chain: recriados quando a seleção ou os dados mudam.
  const techKey = tech.map((t) => `${t.name}:${(t.params ?? []).join("-")}`).join(",");
  const ocKey = onchain.map((o) => o.id).join(",");
  useEffect(() => {
    const chart = chartRef.current;
    if (!ready || !chart) return;
    chart.removeIndicator();
    // Volume e demais técnicos.
    for (const t of tech) {
      if (t.main) chart.createIndicator({ name: t.name, paneId: CANDLE_PANE, ...(t.params ? { calcParams: t.params } : {}) }, true);
      else chart.createIndicator({ name: t.name, paneId: `tech_${t.name}`, ...(t.params ? { calcParams: t.params } : {}) }, false);
    }
    // On-chain.
    const periodDays = PERIOD_DAYS[timeframe];
    for (const o of onchain) {
      const extendData: OcExtend = { start, periodDays, lines: o.lines.map((l) => l.values), fmt: o.fmt };
      const styles = { lines: o.lines.map((l) => ({ style: l.dashed ? "dashed" : "solid", size: 1.6, color: o.color, smooth: false, dashedValue: [5, 4] })) };
      const base = {
        name: o.lines.length > 1 ? "NIZA_OC2" : "NIZA_OC1",
        shortName: o.name, extendData, styles, id: `oc_${o.id}`,
        regenerateFigures: null,
        createTooltipDataSource: ({ indicator, crosshair }: { indicator: { result: unknown[] }; crosshair: { dataIndex?: number } }) => {
          const row = (crosshair.dataIndex !== undefined ? indicator.result[crosshair.dataIndex] : undefined) as OcPoint | undefined;
          const keys: (keyof OcPoint)[] = ["v0", "v1"];
          return {
            name: o.name, calcParamsText: "",
            features: [],
            legends: o.lines.map((l, i) => {
              const v = row?.[keys[i]];
              return { title: { text: `${l.label}: `, color: o.color }, value: { text: v === undefined ? "—" : fmtValue(o.fmt, v), color: o.color } };
            }),
          };
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spec = base as any;
      if (o.axis === "price") {
        chart.createIndicator({ ...spec, paneId: CANDLE_PANE }, true);
      } else {
        const paneId = `oc_pane_${o.id}`;
        chart.createIndicator({ ...spec, paneId }, false);
        chart.overrideYAxis({ paneId, name: o.scale === "log" ? "logarithm" : "normal" });
        chart.setPaneOptions({ id: paneId, height: 130 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, techKey, ocKey, onchain, start, timeframe]);

  // Halvings.
  useEffect(() => {
    const chart = chartRef.current;
    if (!ready || !chart) return;
    chart.removeOverlay({ groupId: "halving" });
    if (!showHalvings) return;
    for (const d of halvings) {
      chart.createOverlay({
        name: "verticalStraightLine", groupId: "halving", lock: true, visible: true,
        points: [{ timestamp: d * DAY_MS }],
        styles: { line: { style: "dashed", color: "#f3d27a", size: 1, dashedValue: [4, 4] } },
      });
    }
  }, [ready, showHalvings, halvings, candles]);

  // Ferramentas de desenho.
  useEffect(() => {
    const chart = chartRef.current;
    if (!ready || !chart || !tool) return;
    chart.createOverlay({ name: tool.name, groupId: "user", mode: "weak_magnet", onDrawEnd: () => { onToolDoneRef.current?.(); return false; } } as never);
  }, [ready, tool]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!ready || !chart || clearDrawings === 0) return;
    chart.removeOverlay({ groupId: "user" });
  }, [ready, clearDrawings]);

  // Altura: cresce com a quantidade de painéis.
  const panes = tech.filter((t) => !t.main).length + onchain.filter((o) => o.axis === "own").length;
  const height = 560 + panes * 140;
  useEffect(() => { chartRef.current?.resize(); }, [height]);

  return <div ref={box} style={{ height, width: "100%" }} className="rounded-lg" />;
}

function periodOf(tf: Timeframe) {
  return tf === "1D" ? { type: "day" as const, span: 1 } : tf === "1W" ? { type: "week" as const, span: 1 } : { type: "month" as const, span: 1 };
}

import { useState } from "react";
function useReadyFlag(): [boolean, (v: boolean) => void] {
  return useState(false);
}
