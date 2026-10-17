"use client";

import { useEffect, useMemo, useState } from "react";
import { OnchainChart, PRICE_COLOR, type ChartLine } from "@/components/OnchainChart";
import { GROUPS, INDICATORS, INDICATOR_BY_ID, MAX_INDICATORS, PRESETS } from "@/lib/onchain-defs";

type Series = (number | null)[];

interface Payload {
  updatedAt: number | null;
  stale: boolean;
  start: number;
  n: number;
  price: Series;
  series: Record<string, Series[]>;
  unavailable: string[];
  halvings: number[];
}

const SLOTS = ["#38bdf8", "#f472b6", "#a3e635"];
const RANGES = [
  { id: "1a", label: "1 ano", days: 365 },
  { id: "2a", label: "2 anos", days: 730 },
  { id: "4a", label: "4 anos", days: 1461 },
  { id: "8a", label: "8 anos", days: 2922 },
  { id: "tudo", label: "Tudo", days: Infinity },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

export function OnchainExplorer({ initial }: { initial: string[] }) {
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

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus("loading");
    fetch(`/api/onchain/btc?i=${encodeURIComponent(key)}`, { signal: ctrl.signal })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || `Erro ${r.status}`);
        setData(body as Payload);
        setStatus("ok");
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Erro ao carregar");
        setStatus("error");
      });
    return () => ctrl.abort();
  }, [key, retry]);

  useEffect(() => {
    try {
      window.history.replaceState(null, "", key ? `?i=${key}` : window.location.pathname);
    } catch {
      /* sem histórico disponível: ignora */
    }
  }, [key]);

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_INDICATORS ? cur : [...cur, id]));

  const lines = useMemo<ChartLine[]>(() => {
    if (!data) return [];
    const out: ChartLine[] = [];
    selected.forEach((id, slot) => {
      const def = INDICATOR_BY_ID[id];
      const arrs = data.series[id];
      if (!def || !arrs) return;
      arrs.forEach((values, li) => {
        out.push({
          key: `${id}:${li}`,
          axisId: def.axis === "price" ? "price" : id,
          label: def.lines[li]?.label ?? def.name,
          color: SLOTS[slot % SLOTS.length],
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

  const unavailable = new Set(data?.unavailable ?? []);
  const full = selected.length >= MAX_INDICATORS;

  return (
    <div className="space-y-5">
      <section className="card p-4">
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
              onZoom={(a, b) => setZoom([a, b])} onReset={() => setZoom(null)}
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
      </section>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Indicadores <span className="text-sm font-normal text-muted">({selected.length} de {MAX_INDICATORS})</span></h2>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => setSelected(p.ids)} className="btn btn-ghost !px-3 !py-1.5 !text-xs" title={p.ids.map((i) => INDICATOR_BY_ID[i]?.name).join(" + ")}>
                {p.label}
              </button>
            ))}
            {selected.length > 0 && <button type="button" onClick={() => setSelected([])} className="btn btn-ghost !px-3 !py-1.5 !text-xs">Limpar</button>}
          </div>
        </div>
        {full && <p className="mb-3 text-xs text-gold-soft">Máximo de {MAX_INDICATORS} indicadores ao mesmo tempo. Remova um para escolher outro.</p>}

        <div className="space-y-4">
          {GROUPS.map((g) => (
            <div key={g.id}>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{g.label}</h3>
              <div className="flex flex-wrap gap-2">
                {INDICATORS.filter((d) => d.group === g.id).map((d) => {
                  const slot = selected.indexOf(d.id);
                  const on = slot >= 0;
                  const off = unavailable.has(d.id);
                  const blocked = off || (!on && full);
                  return (
                    <button
                      key={d.id} type="button" aria-pressed={on} disabled={blocked && !on}
                      onClick={() => toggle(d.id)}
                      title={off ? "Indisponível agora na fonte de dados" : d.name}
                      className="rounded-lg border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40"
                      style={on ? { borderColor: SLOTS[slot], background: `${SLOTS[slot]}22`, color: "#fff" } : { borderColor: "var(--color-line)", color: "#c5cde6" }}
                    >
                      {on && <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: SLOTS[slot] }} />}
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {unavailable.size > 0 && (
          <p className="mt-3 text-xs text-muted">Indisponíveis agora na fonte: {[...unavailable].map((id) => INDICATOR_BY_ID[id]?.name).filter(Boolean).join(", ")}.</p>
        )}
      </section>

      {selected.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Como ler</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: PRICE_COLOR }} />
              <span><strong>Preço do Bitcoin</strong> <span className="text-muted">em dólar, eixo à esquerda. A escala log mostra variações percentuais iguais com a mesma altura.</span></span>
            </li>
            {selected.map((id, slot) => {
              const d = INDICATOR_BY_ID[id];
              return (
                <li key={id} className="flex gap-2.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: SLOTS[slot] }} />
                  <span><strong>{d.name}</strong>{d.axis === "price" ? <span className="text-muted"> (no eixo do preço): </span> : <span className="text-muted"> (eixo à direita): </span>}<span className="text-muted">{d.desc}</span></span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted">
        Os indicadores são calculados aqui a partir de dados abertos da rede (preço, oferta, valor realizado, hash rate, endereços e transações). Os nomes seguem as fórmulas
        padrão do mercado, mas os valores podem diferir um pouco dos de outros sites, que usam fontes e ajustes próprios. Indicadores que dependem da idade de cada moeda
        (SOPR, Reserve Risk, HODL Waves, lucro e prejuízo de detentores de curto e longo prazo) não estão incluídos. Zonas históricas descrevem o passado e não garantem o futuro.
      </p>
    </div>
  );
}
