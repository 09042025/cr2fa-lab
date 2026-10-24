"use client";

import { useEffect, useMemo, useState } from "react";
import { ProChart, type OnchainOverlay, type TechSpec } from "@/components/ProChart";
import { aggregateCandles, type Candle, type Timeframe } from "@/lib/candles-core";
import { FREE_MAX_INDICATORS, GROUPS, INDICATORS, INDICATOR_BY_ID, PRESETS, formatValue } from "@/lib/onchain-defs";
import { ProBadge } from "@/components/ui";
import Link from "next/link";

type Series = (number | null)[];

interface Payload {
  updatedAt: number | null;
  stale: boolean;
  start: number;
  n: number;
  price: Series;
  series: Record<string, Series[]>;
  unavailable: string[];
  holderError: string | null;
  halvings: number[];
}

/** Cada indicador tem sempre a mesma cor, esteja onde estiver na lista. */
const PALETTE = ["#38bdf8", "#f472b6", "#a3e635", "#fb923c", "#a78bfa", "#2dd4bf", "#f87171", "#facc15", "#60a5fa", "#e879f9", "#4ade80", "#fda4af", "#22d3ee", "#c084fc", "#bef264", "#fdba74", "#93c5fd", "#f0abfc", "#5eead4", "#fca5a5", "#d9f99d", "#a5b4fc"];
const colorOf = (id: string) => PALETTE[Math.max(0, INDICATORS.findIndex((d) => d.id === id)) % PALETTE.length];
const TIMEFRAMES: { id: Timeframe; label: string }[] = [{ id: "1D", label: "Diário" }, { id: "1W", label: "Semanal" }, { id: "1M", label: "Mensal" }];

/** Indicadores técnicos nativos. "main" = desenhados sobre as velas; os demais ganham painel abaixo. */
const TECH: { id: string; label: string; main: boolean; params?: number[] }[] = [
  { id: "VOL", label: "Volume", main: false },
  { id: "MA", label: "Médias móveis (20, 50, 100, 200)", main: true, params: [20, 50, 100, 200] },
  { id: "EMA", label: "Médias exponenciais (9, 21, 50, 200)", main: true, params: [9, 21, 50, 200] },
  { id: "BOLL", label: "Bandas de Bollinger", main: true },
  { id: "SAR", label: "Parabolic SAR", main: true },
  { id: "MACD", label: "MACD", main: false },
  { id: "RSI", label: "IFR (RSI)", main: false },
  { id: "KDJ", label: "Estocástico (KDJ)", main: false },
  { id: "OBV", label: "OBV", main: false },
  { id: "CCI", label: "CCI", main: false },
  { id: "WR", label: "Williams %R", main: false },
  { id: "ROC", label: "ROC", main: false },
  { id: "DMI", label: "DMI / ADX", main: false },
  { id: "TRIX", label: "TRIX", main: false },
];

const TOOLS: { name: string; label: string; icon: string }[] = [
  { name: "segment", label: "Linha de tendência", icon: "╱" },
  { name: "straightLine", label: "Reta infinita", icon: "⟋" },
  { name: "rayLine", label: "Semirreta", icon: "↗" },
  { name: "horizontalStraightLine", label: "Linha horizontal", icon: "─" },
  { name: "verticalStraightLine", label: "Linha vertical", icon: "│" },
  { name: "parallelStraightLine", label: "Canal paralelo", icon: "▱" },
  { name: "priceChannelLine", label: "Canal de preço", icon: "⫽" },
  { name: "fibonacciLine", label: "Retração de Fibonacci", icon: "Fib" },
  { name: "rect", label: "Retângulo", icon: "▭" },
  { name: "priceLine", label: "Linha de preço", icon: "$" },
];

export function OnchainExplorer({ initial, isPro }: { initial: string[]; isPro: boolean }) {
  const limit = isPro ? INDICATORS.length : FREE_MAX_INDICATORS;
  const [selected, setSelected] = useState<string[]>(initial);
  const [data, setData] = useState<Payload | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [logPrice, setLogPrice] = useState(true);
  const [showHalvings, setShowHalvings] = useState(true);

  const key = selected.join(",");
  const [notice, setNotice] = useState("");
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [candleNote, setCandleNote] = useState("");
  const [tf, setTf] = useState<Timeframe>("1D");
  const [techOn, setTechOn] = useState<string[]>(["VOL"]);
  const [tool, setTool] = useState<{ name: string; n: number } | null>(null);
  const [clearN, setClearN] = useState(0);

  useEffect(() => {
    fetch("/api/onchain/candles")
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || `Erro ${r.status}`);
        setCandles(body.candles as Candle[]);
        if (!body.exchangeOk) setCandleNote("A bolsa não respondeu: o gráfico usa só o preço de fechamento diário (sem máximas e mínimas).");
      })
      .catch((e) => setCandleNote(e instanceof Error ? e.message : "Não foi possível carregar as velas."));
  }, []);
  const have = data ? Object.keys(data.series).join(",") : "";

  useEffect(() => {
    const missing = data ? selected.filter((id) => !(id in data.series)) : selected;
    if (data && missing.length === 0) return;
    const ctrl = new AbortController();
    setStatus("loading");
    fetch(`/api/onchain/btc?i=${encodeURIComponent(missing.join(","))}`, { signal: ctrl.signal })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || `Erro ${r.status}`);
        const next = body as Payload;
        setData((cur) => (cur && cur.start === next.start && cur.n === next.n ? { ...next, series: { ...cur.series, ...next.series } } : next));
        setStatus("ok");
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Erro ao carregar");
        setStatus("error");
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, retry, have === ""]);

  useEffect(() => {
    try {
      window.history.replaceState(null, "", key ? `?i=${key}` : window.location.pathname);
    } catch {
      /* sem histórico disponível: ignora */
    }
  }, [key]);

  const unavailable = new Set(data?.unavailable ?? []);

  const techCount = techOn.filter((t) => t !== "VOL").length;
  const used = selected.length + techCount;
  const freeFull = (): boolean => {
    if (isPro || used < FREE_MAX_INDICATORS) return false;
    setNotice(`O plano Grátis permite ${FREE_MAX_INDICATORS} indicadores ao mesmo tempo (on-chain e técnicos somados). Desative um para ligar outro, ou assine o Pró para usar todos juntos.`);
    return true;
  };

  const toggle = (id: string) => {
    setNotice("");
    if (!selected.includes(id) && freeFull()) return;
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const toggleTech = (id: string) => {
    setNotice("");
    if (!techOn.includes(id) && id !== "VOL" && freeFull()) return;
    setTechOn((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const pickTool = (name: string) => {
    if (!isPro) {
      setNotice("As ferramentas de desenho (Fibonacci, linhas de tendência, canais) fazem parte do plano Pró.");
      return;
    }
    setNotice("");
    setTool((t) => ({ name, n: (t?.n ?? 0) + 1 }));
  };

  const applyPreset = (ids: string[]) => {
    const usable = ids.filter((id) => !unavailable.has(id));
    const room = isPro ? usable.length : Math.max(0, FREE_MAX_INDICATORS - techCount);
    setNotice(usable.length > room ? `Atalho aplicado com os ${room} primeiros indicadores. O Pró liga todos juntos.` : "");
    setSelected(usable.slice(0, room));
  };

  const showAll = () => {
    setNotice("");
    setSelected(INDICATORS.map((d) => d.id).filter((id) => !unavailable.has(id)));
  };

  const overlays = useMemo<OnchainOverlay[]>(() => {
    if (!data) return [];
    const out: OnchainOverlay[] = [];
    for (const id of selected) {
      const def = INDICATOR_BY_ID[id];
      const arrs = data.series[id];
      if (!def || !arrs) continue;
      out.push({
        id, name: def.name, color: colorOf(id), axis: def.axis, scale: def.scale, fmt: def.fmt,
        lines: arrs.map((values, li) => ({ label: def.lines[li]?.label ?? def.name, dashed: !!def.lines[li]?.dashed, values })),
      });
    }
    return out;
  }, [data, selected]);

  const techSpecs = useMemo<TechSpec[]>(
    () => TECH.filter((t) => techOn.includes(t.id)).map((t) => ({ name: t.id, params: t.params, main: t.main })),
    [techOn],
  );
  const shown = useMemo(() => (candles ? aggregateCandles(candles, tf) : []), [candles, tf]);

  const valueOf = (id: string): string => {
    const arr = data?.series[id]?.[0];
    const def = INDICATOR_BY_ID[id];
    if (!arr || !def) return "";
    for (let i = arr.length - 1; i >= 0; i--) {
      const v = arr[i];
      if (v !== null && v !== undefined) return formatValue(def.fmt, v);
    }
    return "—";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs uppercase tracking-wide text-muted">Atalhos</span>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => applyPreset(p.ids)} className="btn btn-ghost !px-3 !py-1.5 !text-xs" title={p.ids.map((i) => INDICATOR_BY_ID[i]?.name).join(" + ")}>
            {p.label}
          </button>
        ))}
        {selected.length > 0 && <button type="button" onClick={() => { setSelected([]); setNotice(""); }} className="btn btn-ghost !px-3 !py-1.5 !text-xs">Limpar</button>}
      </div>
      {notice && <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold-soft">{notice} {!isPro && <Link href="/planos" className="underline">Ver planos</Link>}</p>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card min-w-0 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período das velas">
              {TIMEFRAMES.map((x) => (
                <button key={x.id} type="button" onClick={() => setTf(x.id)} aria-pressed={tf === x.id} className={`btn !px-3 !py-1.5 !text-xs ${tf === x.id ? "btn-gold" : "btn-ghost"}`}>
                  {x.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted">
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={logPrice} onChange={(e) => setLogPrice(e.target.checked)} /> Preço em escala log
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={showHalvings} onChange={(e) => setShowHalvings(e.target.checked)} /> Halvings
              </label>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-1" role="toolbar" aria-label="Ferramentas de desenho">
            <span className="mr-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted">Desenhar {!isPro && <ProBadge />}</span>
            {TOOLS.map((t) => (
              <button key={t.name} type="button" title={t.label} aria-label={t.label} onClick={() => pickTool(t.name)}
                className={`grid h-8 min-w-8 place-items-center rounded-md border px-1.5 text-sm transition ${tool?.name === t.name ? "border-gold bg-gold/20 text-gold-soft" : "border-line text-muted hover:text-white"} ${!isPro ? "opacity-60" : ""}`}>
                {t.icon}
              </button>
            ))}
            <button type="button" title="Apagar todos os desenhos" onClick={() => (isPro ? setClearN((n) => n + 1) : pickTool("segment"))} className="ml-1 h-8 rounded-md border border-line px-2 text-xs text-muted hover:text-white">Apagar desenhos</button>
          </div>

          {data && candles ? (
            <div className={status === "loading" ? "opacity-60 transition-opacity" : "transition-opacity"}>
              <ProChart
                candles={shown} timeframe={tf} start={data.start} onchain={overlays} tech={techSpecs}
                logScale={logPrice} halvings={data.halvings} showHalvings={showHalvings}
                tool={tool} clearDrawings={clearN} onToolDone={() => setTool(null)}
              />
            </div>
          ) : status === "error" ? (
            <div className="rounded-lg border border-down/40 p-4 text-sm text-down">
              Não foi possível carregar os dados on-chain agora. <span className="text-muted">({error})</span>{" "}
              <button type="button" className="ml-1 underline" onClick={() => setRetry((n) => n + 1)}>Tentar de novo</button>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted">Carregando gráfico e dados on-chain… na primeira vez do dia pode levar até 30 segundos.</p>
          )}
          {candleNote && <p className="mt-2 text-xs text-gold-soft">{candleNote}</p>}
          <p className="mt-2 text-[11px] text-muted">Arraste o gráfico para andar no tempo, use a roda do mouse para zoom e clique em uma ferramenta de desenho para marcar no gráfico (toque em dois pontos para uma linha ou o Fibonacci).</p>
          {data && status === "error" && (
            <p className="mt-2 text-xs text-down">Falha ao atualizar: {error}. <button type="button" className="underline" onClick={() => setRetry((n) => n + 1)}>Tentar de novo</button></p>
          )}
          <p className="mt-2 text-xs text-muted">
            Fonte: Coin Metrics (dados da rede Bitcoin, dia fechado em UTC){data?.updatedAt ? `. Atualizado em ${new Date(data.updatedAt * 1000).toLocaleString("pt-BR")}` : ""}.
            {data?.stale ? <span className="ml-1 text-gold-soft">Exibindo o último dado salvo, a fonte não respondeu.</span> : null}
          </p>
          {selected.some((id) => INDICATOR_BY_ID[id]?.group === "holders") && (
            <p className="mt-1 text-xs text-muted">Preço realizado STH e LTH: BGeometrics (bitcoin-data.com), plano gratuito, que cobre os últimos 4 anos. Por isso essas linhas começam mais tarde que o preço.</p>
          )}
          {data?.holderError && <p className="mt-1 text-xs text-gold-soft">Os indicadores de detentores (STH/LTH) estão indisponíveis agora: {data.holderError}. O site tenta de novo em até 30 minutos.</p>}
        </section>

        <aside className="card p-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto" aria-label="Indicadores">
          <h2 className="font-semibold">Indicadores</h2>
          <p className="mt-0.5 text-xs text-muted">
            Ligue ou desligue cada indicador no gráfico. {isPro ? `${used} ativos.` : `${used} de ${FREE_MAX_INDICATORS} ativos no plano Grátis (volume não conta).`}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs">
            {isPro ? (
              <button type="button" onClick={showAll} className="text-gold-soft underline">Mostrar todos</button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted"><ProBadge /> Todos juntos no Pró</span>
            )}
            <span className="text-line">|</span>
            <button type="button" onClick={() => { setSelected([]); setNotice(""); }} className="text-gold-soft underline">Ocultar todos</button>
          </div>

          <div className="mt-3 space-y-4">
            <div>
              <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Indicadores técnicos</h3>
              <ul>
                {TECH.map((t) => {
                  const on = techOn.includes(t.id);
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 border-b border-line/40 py-2 last:border-0">
                      <span className={`min-w-0 truncate text-sm ${on ? "font-medium text-white" : "text-muted"}`} title={t.label}>{t.label}</span>
                      <button type="button" role="switch" aria-checked={on} aria-label={`${on ? "Desligar" : "Ligar"} ${t.label}`} onClick={() => toggleTech(t.id)}
                        className="relative h-6 w-11 shrink-0 rounded-full transition" style={{ background: on ? "#16a34a" : "#2a3556" }}>
                        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: on ? 22 : 2 }} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            {GROUPS.map((g) => (
              <div key={g.id}>
                <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">{g.label}</h3>
                <ul>
                  {INDICATORS.filter((d) => d.group === g.id).map((d) => {
                    const on = selected.includes(d.id);
                    const off = unavailable.has(d.id);
                    const c = colorOf(d.id);
                    return (
                      <li key={d.id} className="flex items-center justify-between gap-3 border-b border-line/40 py-2 last:border-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c, opacity: on ? 1 : 0.35 }} />
                          <span className="min-w-0">
                            <span className={`block truncate text-sm ${on ? "font-medium text-white" : "text-muted"}`} title={d.name}>{d.name}</span>
                            {on && <span className="block text-xs font-semibold" style={{ color: c }}>{valueOf(d.id)}</span>}
                            {off && <span className="block text-[11px] text-muted">indisponível agora</span>}
                          </span>
                        </span>
                        <button
                          type="button" role="switch" aria-checked={on} aria-label={`${on ? "Desligar" : "Ligar"} ${d.name}`} disabled={off}
                          onClick={() => toggle(d.id)}
                          className="relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40"
                          style={{ background: on ? "#16a34a" : "#2a3556" }}
                        >
                          <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: on ? 22 : 2 }} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {selected.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Como ler</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "#26a69a" }} />
              <span><strong>Velas do Bitcoin</strong> <span className="text-muted">em dólar (bolsa Bitstamp). A escala log mostra variações percentuais iguais com a mesma altura.</span></span>
            </li>
            {selected.map((id) => {
              const d = INDICATOR_BY_ID[id];
              return (
                <li key={id} className="flex gap-2.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf(id) }} />
                  <span><strong>{d.name}</strong>{d.axis === "price" ? <span className="text-muted"> (no eixo do preço): </span> : <span className="text-muted"> (painel próprio): </span>}<span className="text-muted">{d.desc}</span></span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted">
        Os indicadores são calculados aqui a partir de dados abertos da rede (preço, oferta, valor realizado, hash rate, endereços e transações). Os nomes seguem as fórmulas
        padrão do mercado, mas os valores podem diferir um pouco dos de outros sites, que usam fontes e ajustes próprios. Indicadores que dependem da idade de cada moeda
        (SOPR, Reserve Risk, HODL Waves, NUPL de curto e longo prazo) não estão incluídos. O preço realizado STH e LTH vem de outra fonte gratuita (BGeometrics). Zonas históricas descrevem o passado e não garantem o futuro.
      </p>
    </div>
  );
}
