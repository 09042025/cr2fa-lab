"use client";
import { useState } from "react";
import { LineChart } from "./LineChart";

interface Hist { t: number; apy: number | null; apyBase: number | null; tvl: number | null }
const usdC = (v: number) => (v >= 1e9 ? `US$ ${(v / 1e9).toFixed(2)} bi` : v >= 1e6 ? `US$ ${(v / 1e6).toFixed(1)} mi` : `US$ ${(v / 1e3).toFixed(0)} mil`);

/** Abas do gráfico do pool: Preço (DexScreener incorporado), APR e TVL (histórico do DefiLlama). */
export function PoolCharts({ chart, history }: { chart: { embed: string; page: string } | null; history: Hist[] }) {
  const [tab, setTab] = useState<"price" | "apr" | "tvl">(chart ? "price" : "apr");
  const apr = history.filter((h) => h.apy !== null);
  const tvl = history.filter((h) => h.tvl !== null);
  const tabs: [typeof tab, string][] = [["price", "Preço"], ["apr", "APR"], ["tvl", "TVL"]];
  return (
    <section className="card mb-4 p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map(([id, l]) => <button key={id} type="button" onClick={() => setTab(id)} className={`btn ${tab === id ? "btn-gold" : "btn-ghost"}`} disabled={id === "price" && !chart}>{l}</button>)}
      </div>
      {tab === "price" && chart && (
        <>
          <iframe src={chart.embed} title="Gráfico de preço (DexScreener)" className="w-full rounded-lg border border-line" style={{ height: 460 }} loading="lazy" referrerPolicy="no-referrer" />
          <p className="mt-2 text-xs text-muted">Gráfico do DexScreener. <a className="text-gold-soft hover:underline" href={chart.page} target="_blank" rel="noopener noreferrer">Abrir no DexScreener ↗</a></p>
        </>
      )}
      {tab === "apr" && (apr.length > 1
        ? <><LineChart points={apr.map((h) => h.apy!)} format={(v) => `${v.toFixed(1).replace(".", ",")}%`} startTs={apr[0].t} endTs={apr[apr.length - 1].t} /><p className="mt-2 text-xs text-muted">APR total diário do pool. Fonte: DefiLlama.</p></>
        : <p className="text-sm text-muted">Histórico de APR indisponível para este pool.</p>)}
      {tab === "tvl" && (tvl.length > 1
        ? <><LineChart points={tvl.map((h) => h.tvl!)} format={usdC} startTs={tvl[0].t} endTs={tvl[tvl.length - 1].t} /><p className="mt-2 text-xs text-muted">TVL diário do pool. Fonte: DefiLlama.</p></>
        : <p className="text-sm text-muted">Histórico de TVL indisponível para este pool.</p>)}
    </section>
  );
}
