"use client";

import { useEffect, useMemo, useState } from "react";
import { OnchainChart, PRICE_COLOR, type ChartLine } from "@/components/OnchainChart";
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

  const key = selected.join(",");
  const [cursor, setCursor] = useState(0);
  const [notice, setNotice] = useState("");
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
        setNotice(`O plano Grátis permite ${FREE_MAX_INDICATORS} indicadores ao mesmo tempo. Desative um para ligar outro, ou assine o Pró para usar todos juntos.`);
        return cur;
      }
      return [...cur, id];
    });
  };

  const applyPreset = (ids: string[]) => {
    const usable = ids.filter((id) => !unavailable.has(id));
    setNotice(usable.length > limit ? `Atalho aplicado com os ${limit} primeiros indicadores. O Pró liga todos juntos.` : "");
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
          color: colorOf(id),
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
    const v = arr[Math.min(cursor, arr.length - 1)];
    return v === null || v === undefined ? "—" : formatValue(def.fmt, v);
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
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período">
              {RANGES.map((x) => (
                <button key={x.id} type="button" onClick={() => { setRange(x.id); setZoom(null); }} aria-pressed={!zoom && range === x.id} className={`btn !px-3 !py-1.5 !text-xs ${!zoom && range === x.id ? "btn-gold" : "btn-ghost"}`}>
                  {x.label}
                </button>
              ))}
              {zoom && <button type="button" onClick={() => setZoom(null)} className="btn btn-ghost !px-3 !py-1.5 !text-xs">Desfazer zoom</button>}
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

          {data ? (
            <div className={status === "loading" ? "opacity-60 transition-opacity" : "transition-opacity"}>
              <OnchainChart
                start={data.start} price={data.price} lines={lines} halvings={data.halvings}
                showHalvings={showHalvings} logPrice={logPrice} i0={i0} i1={i1}
                onZoom={(a, b) => setZoom([a, b])} onReset={() => setZoom(null)} onCursor={setCursor}
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
          {selected.length > 2 && <p className="mt-1 text-xs text-muted">Com vários indicadores, só os dois primeiros mostram escala no eixo direito. Os demais usam escala própria e o valor aparece no painel ao lado.</p>}
        </section>

        <aside className="card p-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto" aria-label="Indicadores">
          <h2 className="font-semibold">Indicadores on-chain</h2>
          <p className="mt-0.5 text-xs text-muted">
            Ligue ou desligue cada indicador no gráfico. {isPro ? `${selected.length} ativos.` : `${selected.length} de ${FREE_MAX_INDICATORS} ativos no plano Grátis.`}
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
