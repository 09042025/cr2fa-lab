"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OnchainChart, PRICE_COLOR, type ChartLine } from "@/components/OnchainChart";
import { FREE_MAX_INDICATORS, GROUPS, INDICATORS, INDICATOR_BY_ID, PRESETS, formatValue } from "@/lib/onchain-defs";
import { ProBadge } from "@/components/ui";
import Link from "next/link";
import { loadStrokes, saveStrokes, type PenStroke } from "@/lib/pen";

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
const colorOf = (id: string) => INDICATOR_BY_ID[id]?.lines[0]?.color ?? PALETTE[Math.max(0, INDICATORS.findIndex((d) => d.id === id)) % PALETTE.length];
const RANGES = [
  { id: "1a", label: "1 ano", days: 365 },
  { id: "2a", label: "2 anos", days: 730 },
  { id: "4a", label: "4 anos", days: 1461 },
  { id: "8a", label: "8 anos", days: 2922 },
  { id: "tudo", label: "Tudo", days: Infinity },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

export function OnchainExplorer({ initial, isPro }: { initial: string[]; isPro: boolean }) {
  const limit = isPro ? INDICATORS.length : FREE_MAX_INDICATORS;
  const [selected, setSelected] = useState<string[]>(initial);
  const [data, setData] = useState<Payload | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [range, setRange] = useState<RangeId>("tudo");
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const [logPrice, setLogPrice] = useState(true);
  const [showHalvings, setShowHalvings] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const secRef = useRef<HTMLElement>(null);
  const [full, setFull] = useState(false);
  function toggleFull() {
    const next = !full;
    setFull(next);
    // tenta a tela cheia real do navegador; se não houver (ex.: iPhone), fica a tela cheia dentro do app
    try {
      if (next) void secRef.current?.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    } catch {}
  }
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setFull(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("fullscreenchange", onFs); window.removeEventListener("keydown", onKey); };
  }, []);
  useEffect(() => {
    if (!full) return;
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = o; };
  }, [full]);
  const [penOn, setPenOn] = useState(false);
  const [erase, setErase] = useState(false);
  const [penColor, setPenColor] = useState("#f43f5e");
  const [penWidth, setPenWidth] = useState(3);
  const [strokes, setStrokes] = useState<PenStroke[]>([]);
  const strokesLoaded = useRef(false);
  useEffect(() => { setStrokes(loadStrokes()); strokesLoaded.current = true; }, []);
  useEffect(() => { if (strokesLoaded.current) saveStrokes(strokes); }, [strokes]);
  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filterOpen) return;
    const down = (e: MouseEvent | TouchEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setFilterOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("touchstart", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("touchstart", down); document.removeEventListener("keydown", key); };
  }, [filterOpen]);

  const key = selected.join(",");
  const [cursor, setCursor] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [notice, setNotice] = useState("");
  const [live, setLive] = useState<{ usd: number; source: string } | null>(null);
  useEffect(() => {
    let dead = false;
    const tick = () => {
      if (document.hidden) return;
      fetch("/api/onchain/spot", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: { usd: number; source: string } | null) => { if (!dead && d?.usd) setLive(d); }).catch(() => {});
    };
    tick();
    const t = setInterval(tick, 5000);
    document.addEventListener("visibilitychange", tick);
    return () => { dead = true; clearInterval(t); document.removeEventListener("visibilitychange", tick); };
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

  const toggle = (id: string) => {
    setNotice("");
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= limit) {
        setNotice(`O plano Grátis permite ${FREE_MAX_INDICATORS} indicadores ao mesmo tempo. Desative um para ligar outro, ou assine o Premium para usar todos juntos.`);
        return cur;
      }
      return [...cur, id];
    });
  };

  const applyPreset = (ids: string[]) => {
    const usable = ids.filter((id) => !unavailable.has(id));
    setNotice(usable.length > limit ? `Atalho aplicado com os ${limit} primeiros indicadores. O Premium liga todos juntos.` : "");
    setSelected(usable.slice(0, limit));
  };

  const showAll = () => {
    setNotice("");
    setSelected(INDICATORS.map((d) => d.id).filter((id) => !unavailable.has(id)));
  };

  const lines = useMemo<ChartLine[]>(() => {
    if (!data) return [];
    const out: ChartLine[] = [];
    selected.forEach((id) => {
      const def = INDICATOR_BY_ID[id];
      const arrs = data.series[id];
      if (!def || !arrs) return;
      arrs.forEach((values, li) => {
        out.push({
          key: `${id}:${li}`,
          axisId: def.axis === "price" ? "price" : id,
          label: def.lines[li]?.label ?? def.name,
          color: def.lines[li]?.color ?? colorOf(id),
          dashed: !!def.lines[li]?.dashed,
          values,
          scale: def.scale,
          fmt: def.fmt,
          refs: li === 0 ? def.refs : undefined,
        });
      });
    });
    return out;
  }, [data, selected]);

  const last = data ? data.n - 1 : 0;
  const r = RANGES.find((x) => x.id === range)!;
  const [i0, i1] = zoom ?? [Number.isFinite(r.days) ? Math.max(0, last - r.days) : 0, last];
  const valueOf = (id: string): string => {
    const arr = data?.series[id]?.[0];
    const def = INDICATOR_BY_ID[id];
    if (!arr || !def) return "";
    // Sem o cursor no gráfico, mostra o último valor existente (o mesmo do topo do gráfico).
    let v: number | null | undefined;
    if (hovering) v = arr[Math.min(cursor, arr.length - 1)];
    else { for (let k = arr.length - 1; k >= 0; k--) if (arr[k] !== null && arr[k] !== undefined) { v = arr[k]; break; } }
    return v === null || v === undefined ? "—" : formatValue(def.fmt, v);
  };

  return (
    <div className="space-y-5">
      <div ref={filterRef} className="relative">
      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
        <span className="col-span-3 mb-0.5 text-xs uppercase tracking-wide text-muted sm:col-auto sm:mb-0 sm:mr-1">Atalhos</span>
        <button type="button" onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen} aria-controls="filtro-indicadores" className={`btn col-span-3 w-full !px-3 !py-1.5 !text-xs sm:col-auto sm:w-auto ${filterOpen ? "btn-gold" : "btn-ghost"}`}>
          Filtro de indicadores <span className="ml-1 rounded-full bg-white/10 px-1.5 text-[11px]">{selected.length}</span> <span aria-hidden>{filterOpen ? "▴" : "▾"}</span>
        </button>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => applyPreset(p.ids)} className="btn btn-ghost w-full !px-1 !py-1.5 !text-xs max-sm:leading-tight sm:w-auto sm:!px-3" title={p.ids.map((i) => INDICATOR_BY_ID[i]?.name).join(" + ")}>
            {p.label}
          </button>
        ))}
        {selected.length > 0 && <button type="button" onClick={() => { setSelected([]); setNotice(""); }} className="btn btn-ghost w-full !px-1 !py-1.5 !text-xs sm:w-auto sm:!px-3">Limpar</button>}
      </div>
      {filterOpen && (
        <div id="filtro-indicadores" role="dialog" aria-label="Filtro de indicadores on-chain" className="card absolute left-0 right-0 top-full z-30 mt-2 max-h-[75vh] overflow-y-auto p-4 shadow-2xl sm:right-auto sm:w-[min(92vw,44rem)]">
          <h2 className="font-semibold">Indicadores on-chain</h2>
          <p className="mt-0.5 text-xs text-muted">
            Ligue ou desligue cada indicador no gráfico. {isPro ? `${selected.length} ativos.` : `${selected.length} de ${FREE_MAX_INDICATORS} ativos no plano Grátis.`}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs">
            {isPro ? (
              <button type="button" onClick={showAll} className="text-gold-soft underline">Mostrar todos</button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted"><ProBadge /> Todos juntos no Premium</span>
            )}
            <span className="text-line">|</span>
            <button type="button" onClick={() => { setSelected([]); setNotice(""); }} className="text-gold-soft underline">Ocultar todos</button>
          </div>

          <div className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">
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
          <button type="button" onClick={() => setFilterOpen(false)} className="btn btn-gold mt-4 w-full !py-2 text-sm">Pronto</button>
        </div>
      )}
      </div>
      {notice && <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold-soft">{notice} {!isPro && <Link href="/planos" className="underline">Ver planos</Link>}</p>}

      <div>
        <section ref={secRef} className={full ? "fixed inset-0 z-50 min-w-0 overflow-auto bg-[#0b1020] p-3" : "card min-w-0 p-4"}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="grid w-full grid-cols-5 gap-1.5 sm:flex sm:w-auto sm:flex-wrap" role="group" aria-label="Período">
              {RANGES.map((x) => (
                <button key={x.id} type="button" onClick={() => { setRange(x.id); setZoom(null); }} aria-pressed={!zoom && range === x.id} className={`btn w-full !px-1 !py-1.5 !text-xs sm:w-auto sm:!px-3 ${!zoom && range === x.id ? "btn-gold" : "btn-ghost"}`}>
                  {x.label}
                </button>
              ))}
              {zoom && <button type="button" onClick={() => setZoom(null)} className="btn btn-ghost col-span-5 !px-3 !py-1.5 !text-xs">Desfazer zoom</button>}
            </div>
            <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto" role="group" aria-label="Caneta">
              <button type="button" onClick={toggleFull} aria-pressed={full} className="btn btn-ghost !px-3 !py-1.5 !text-xs" title={full ? "Sair da tela cheia (Esc)" : "Abrir o gráfico em tela cheia"}>{full ? "✕ Sair da tela cheia" : "⛶ Tela cheia"}</button>
              <button type="button" onClick={() => { setPenOn((o) => !o); setErase(false); }} aria-pressed={penOn} className={`btn !px-3 !py-1.5 !text-xs ${penOn && !erase ? "btn-gold" : "btn-ghost"}`} title="Desenhar no gráfico para marcar pontos de atenção">✏️ Caneta</button>
              {penOn && (
                <>
                  <label className="inline-flex items-center gap-1 text-xs text-muted" title="Cor da caneta">
                    Cor <input type="color" value={penColor} onChange={(e) => { setPenColor(e.target.value); setErase(false); }} className="h-7 w-8 cursor-pointer rounded border border-line bg-transparent p-0.5" aria-label="Cor da caneta" />
                  </label>
                  <label className="inline-flex items-center gap-1 text-xs text-muted" title="Grossura da linha">
                    Grossura <input type="range" min={1} max={14} step={1} value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} className="w-20 accent-[#f3d27a]" aria-label="Grossura da linha" />
                    <span className="inline-block w-7 text-center"><span className="inline-block rounded-full align-middle" style={{ width: Math.max(2, penWidth), height: Math.max(2, penWidth), background: penColor }} /></span>
                  </label>
                  <button type="button" onClick={() => setErase((x) => !x)} aria-pressed={erase} className={`btn !px-3 !py-1.5 !text-xs ${erase ? "btn-gold" : "btn-ghost"}`} title="Passe sobre um traço para apagá-lo">🧽 Borracha</button>
                </>
              )}
              {strokes.length > 0 && <button type="button" onClick={() => setStrokes([])} className="btn btn-ghost !px-3 !py-1.5 !text-xs" title="Apaga todos os desenhos">Apagar tudo</button>}
            </div>
            <div className="flex w-full flex-wrap gap-x-6 gap-y-2 text-xs text-muted sm:w-auto">
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={logPrice} onChange={(e) => setLogPrice(e.target.checked)} /> Preço em escala log
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={showHalvings} onChange={(e) => setShowHalvings(e.target.checked)} /> Halvings
              </label>
            </div>
          </div>

          {data ? (
            <div className={status === "loading" ? "opacity-60 transition-opacity" : "transition-opacity"}>
              <OnchainChart
                spot={live} start={data.start} price={data.price} lines={lines} halvings={data.halvings}
                showHalvings={showHalvings} logPrice={logPrice} i0={i0} i1={i1}
                onZoom={(a, b) => setZoom([a, b])} onReset={() => setZoom(null)} onCursor={(i, h) => { setCursor(i); setHovering(h); }}
                pen={{ on: penOn, erase, color: penColor, width: penWidth }} strokes={strokes} onStrokes={setStrokes}
              />
            </div>
          ) : status === "error" ? (
            <div className="rounded-lg border border-down/40 p-4 text-sm text-down">
              Não foi possível carregar os dados on-chain agora. <span className="text-muted">({error})</span>{" "}
              <button type="button" className="ml-1 underline" onClick={() => setRetry((n) => n + 1)}>Tentar de novo</button>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted">Carregando dados on-chain… na primeira vez do dia pode levar até 30 segundos.</p>
          )}
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
          {selected.length > 2 && <p className="mt-1 text-xs text-muted">Com vários indicadores, só os dois primeiros mostram escala no eixo direito. Os demais usam escala própria, e o valor deles aparece na legenda acima do gráfico e no filtro de indicadores.</p>}
        </section>

      </div>

      {selected.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Como ler</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: PRICE_COLOR }} />
              <span><strong>Preço do Bitcoin</strong> <span className="text-muted">em dólar, eixo à esquerda. A escala log mostra variações percentuais iguais com a mesma altura.</span></span>
            </li>
            {selected.map((id) => {
              const d = INDICATOR_BY_ID[id];
              return (
                <li key={id} className="flex gap-2.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf(id) }} />
                  <span><strong>{d.name}</strong>{d.axis === "price" ? <span className="text-muted"> (no eixo do preço): </span> : <span className="text-muted"> (escala própria): </span>}<span className="text-muted">{d.desc}</span></span>
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
