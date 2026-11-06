import { HistoryChart } from "./HistoryChart";
import { LineChart } from "./LineChart";

interface Hist { t: number; apy: number | null; tvl: number | null }
const usdC = (v: number) => (v >= 1e9 ? `US$ ${(v / 1e9).toFixed(2)} bi` : v >= 1e6 ? `US$ ${(v / 1e6).toFixed(1)} mi` : `US$ ${(v / 1e3).toFixed(0)} mil`);

/** Todos os gráficos abertos de uma vez, sem abas: valor vs HOLD, preço, APR e TVL. */
export function LpCharts({ series, chart, history }: { series: { t: number; value: number; hold: number }[]; chart: { embed: string; page: string } | null; history: Hist[] }) {
  const apr = history.filter((h) => h.apy !== null), tvl = history.filter((h) => h.tvl !== null);
  return (
    <div className="space-y-4">
      <section className="card p-4"><h3 className="mb-2 font-semibold text-gold-soft">Valor da posição vs. segurar (HOLD)</h3><HistoryChart points={series} /></section>
      {chart && <section className="card p-4"><h3 className="mb-2 font-semibold text-gold-soft">Preço do par</h3><iframe src={chart.embed} title="Gráfico de preço (DexScreener)" className="w-full rounded-lg border border-line" style={{ height: 380 }} loading="lazy" referrerPolicy="no-referrer" /></section>}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4"><h3 className="mb-2 font-semibold text-gold-soft">APR do pool</h3>{apr.length > 1 ? <LineChart points={apr.map((h) => h.apy!)} height={160} format={(v) => `${v.toFixed(1).replace(".", ",")}%`} startTs={apr[0].t} endTs={apr[apr.length - 1].t} /> : <p className="text-sm text-muted">Histórico indisponível.</p>}</section>
        <section className="card p-4"><h3 className="mb-2 font-semibold text-gold-soft">TVL do pool</h3>{tvl.length > 1 ? <LineChart points={tvl.map((h) => h.tvl!)} height={160} format={usdC} startTs={tvl[0].t} endTs={tvl[tvl.length - 1].t} /> : <p className="text-sm text-muted">Histórico indisponível.</p>}</section>
      </div>
    </div>
  );
}
