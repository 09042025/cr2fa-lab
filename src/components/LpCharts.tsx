"use client";
import { useState } from "react";
import { HistoryChart } from "./HistoryChart";
import { LineChart } from "./LineChart";

interface Hist { t: number; apy: number | null; tvl: number | null }
const usdC = (v: number) => (v >= 1e9 ? `US$ ${(v / 1e9).toFixed(2)} bi` : v >= 1e6 ? `US$ ${(v / 1e6).toFixed(1)} mi` : `US$ ${(v / 1e3).toFixed(0)} mil`);

export function LpCharts({ series, chart, history }: { series: { t: number; value: number; hold: number }[]; chart: { embed: string; page: string } | null; history: Hist[] }) {
  const [tab, setTab] = useState<"val" | "price" | "apr" | "tvl">("val");
  const apr = history.filter((h) => h.apy !== null), tvl = history.filter((h) => h.tvl !== null);
  const tabs: [typeof tab, string][] = [["val", "Valor vs. HOLD"], ["price", "Preço"], ["apr", "APR do pool"], ["tvl", "TVL do pool"]];
  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map(([id, l]) => <button key={id} type="button" onClick={() => setTab(id)} className={`btn ${tab === id ? "btn-gold" : "btn-ghost"}`} disabled={id === "price" && !chart}>{l}</button>)}
      </div>
      {tab === "val" && <HistoryChart points={series} />}
      {tab === "price" && chart && <iframe src={chart.embed} title="Gráfico de preço (DexScreener)" className="w-full rounded-lg border border-line" style={{ height: 420 }} loading="lazy" referrerPolicy="no-referrer" />}
      {tab === "apr" && (apr.length > 1 ? <LineChart points={apr.map((h) => h.apy!)} format={(v) => `${v.toFixed(1).replace(".", ",")}%`} startTs={apr[0].t} endTs={apr[apr.length - 1].t} /> : <p className="text-sm text-muted">Histórico indisponível.</p>)}
      {tab === "tvl" && (tvl.length > 1 ? <LineChart points={tvl.map((h) => h.tvl!)} format={usdC} startTs={tvl[0].t} endTs={tvl[tvl.length - 1].t} /> : <p className="text-sm text-muted">Histórico indisponível.</p>)}
    </section>
  );
}
