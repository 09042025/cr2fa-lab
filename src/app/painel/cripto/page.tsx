import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCryptoPage, getFearGreed, getGlobalMarket, getMarketChart } from "@/lib/market";
import { CoinTable } from "@/components/CoinTable";
import { Gauge } from "@/components/Gauge";
import { LineChart } from "@/components/LineChart";
import { Change, DataStatus, Disclaimer, Locked, PageTitle } from "@/components/ui";
import { usdCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

const FNG_PT: Record<string, string> = { "Extreme Fear": "Medo extremo", Fear: "Medo", Neutral: "Neutro", Greed: "Ganância", "Extreme Greed": "Ganância extrema" };
const fngColor = (v: number) => (v < 25 ? "#ef4444" : v < 45 ? "#f59e0b" : v < 55 ? "#9ca3af" : v < 75 ? "#84cc16" : "#22c55e");
const STABLES = new Set(["USDT", "USDC", "DAI", "USDE", "FDUSD", "USDS", "PYUSD", "TUSD", "USD1", "USDD", "BUIDL", "USDTB", "USDG", "RLUSD"]);
const PERIODS = [{ d: 7, l: "7d" }, { d: 30, l: "30d" }, { d: 90, l: "90d" }, { d: 365, l: "1a" }];

export default async function MarketViewPage({ searchParams }: { searchParams: Promise<{ tipo?: string; d?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  // Endereços antigos (pools de DeFi) agora vivem na aba DeFi.
  if (sp.tipo) redirect(`/painel/cripto/defi?tipo=${encodeURIComponent(sp.tipo)}`);
  const isPro = user.plan === "pro";
  const days = isPro ? PERIODS.find((p) => String(p.d) === sp.d)?.d ?? 30 : 30;
  const [global, fng, top, chart] = await Promise.all([getGlobalMarket(), getFearGreed(), getCryptoPage(1, undefined, 250), getMarketChart("bitcoin", days)]);
  const g = global.data;
  const list = top.data ?? [];
  const coins = list.filter((c) => c.change24h !== null && c.volumeUsd > 1_000_000);
  const gainers = [...coins].sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0)).slice(0, 10);
  const losers = [...coins].sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0)).slice(0, 10);
  const others = g && g.btcDominance !== null && g.ethDominance !== null ? Math.max(0, 100 - g.btcDominance - g.ethDominance) : null;

  // Índice de altcoins (30 dias): % das 100 maiores (sem stablecoins) que rendeu mais que o Bitcoin.
  const btc = list.find((c) => c.id === "bitcoin");
  const alts = list.filter((c) => c.id !== "bitcoin" && !STABLES.has(c.symbol)).slice(0, 100);
  const withData = alts.filter((c) => typeof c.change30d === "number");
  const altIndex = btc && typeof btc.change30d === "number" && withData.length >= 20
    ? Math.round((withData.filter((c) => (c.change30d as number) > (btc.change30d as number)).length / withData.length) * 100)
    : null;
  const series = chart.data;
  const capSeries = series && series.caps.length > 1 ? series.caps : series?.prices ?? [];

  return (
    <>
      <PageTitle title="Visão de mercado" subtitle="Termômetro geral do mercado cripto: valor total, volume, dominância do Bitcoin e humor dos investidores." />
      <DataStatus result={global} source="CoinGecko" />
      {g && (
        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Valor de mercado total" value={<>{usdCompact(g.totalCapUsd)} <span className="text-sm"><Change value={g.capChange24h} /></span></>} />
          <Item label="Volume em 24h" value={usdCompact(g.totalVolumeUsd)} />
          <Item label="Dominância do Bitcoin" value={g.btcDominance === null ? "—" : `${g.btcDominance.toFixed(1).replace(".", ",")}%`} />
          <Item label="Criptomoedas ativas" value={g.activeCoins === null ? "—" : g.activeCoins.toLocaleString("pt-BR")} />
        </section>
      )}

      <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <section className="card p-4">
            <h2 className="font-semibold">Medo e Ganância</h2>
            {fng.data ? <Gauge value={fng.data.value} label={FNG_PT[fng.data.label] || fng.data.label} /> : <p className="mt-2 text-sm text-muted">Indisponível no momento.</p>}
            <p className="text-center text-[11px] text-muted">Fonte: alternative.me</p>
          </section>
          <section className="card p-4">
            <h2 className="font-semibold">Índice de altcoins <span className="text-xs font-normal text-muted">(30 dias)</span></h2>
            {altIndex !== null ? (
              <>
                <p className="mt-2 text-3xl font-bold">{altIndex}<span className="text-base font-normal text-muted"> /100</span></p>
                <div className="relative mt-3 h-2 rounded-full" style={{ background: "linear-gradient(90deg,#f59e0b,#fde7c0 45%,#c7c7f5 55%,#4f46e5)" }}>
                  <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink" style={{ left: `${altIndex}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-muted"><span>Temporada do Bitcoin</span><span>Temporada de altcoins</span></div>
                <p className="mt-2 text-xs text-muted">Porcentagem das 100 maiores altcoins (sem stablecoins) que rendeu mais que o Bitcoin em 30 dias. Acima de 75 indica temporada de altcoins.</p>
              </>
            ) : <p className="mt-2 text-sm text-muted">Indisponível no momento.</p>}
          </section>
          <section className="card p-4">
            <h2 className="font-semibold">Dominância</h2>
            {g && g.btcDominance !== null && g.ethDominance !== null && others !== null ? (
              <>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full">
                  <div style={{ width: `${g.btcDominance}%`, background: "#f7931a" }} />
                  <div style={{ width: `${g.ethDominance}%`, background: "#627eea" }} />
                  <div style={{ width: `${others}%`, background: "#6b7280" }} />
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  <li><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: "#f7931a" }} />Bitcoin <b>{g.btcDominance.toFixed(1).replace(".", ",")}%</b></li>
                  <li><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: "#627eea" }} />Ethereum <b>{g.ethDominance.toFixed(1).replace(".", ",")}%</b></li>
                  <li><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: "#6b7280" }} />Outras <b>{others.toFixed(1).replace(".", ",")}%</b></li>
                </ul>
              </>
            ) : <p className="mt-2 text-sm text-muted">Indisponível no momento.</p>}
          </section>
        </div>

        <section className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Valor de mercado do Bitcoin</h2>
            <div className="flex gap-1 text-sm">
              {PERIODS.map((p) => (isPro || p.d === 30) ? (
                <Link key={p.d} href={`/painel/cripto?d=${p.d}`} className={`btn ${p.d === days ? "btn-gold" : "btn-ghost"}`}>{p.l}</Link>
              ) : (
                <span key={p.d} className="btn btn-ghost cursor-not-allowed opacity-50" title="Períodos maiores no plano Pró">{p.l}</span>
              ))}
            </div>
          </div>
          <DataStatus result={chart} source="CoinGecko" />
          {series && capSeries.length > 1 && (
            <>
              <LineChart points={capSeries.map((r) => r[1])} color="auto" height={260} format={usdCompact} startTs={capSeries[0][0]} endTs={capSeries[capSeries.length - 1][0]} />
              {series.volumes.length > 1 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs text-muted">Volume negociado</p>
                  <LineChart points={series.volumes.map((r) => r[1])} color="#93a0c4" height={90} format={usdCompact} />
                </div>
              )}
            </>
          )}
          <p className="mt-2 text-xs text-muted">O Bitcoin representa cerca de 60% do mercado e costuma ditar o rumo das demais criptomoedas.</p>
        </section>
      </div>

      {fng.data && (
        <section className="card mb-6 p-4">
          <h2 className="mb-1 font-semibold">Medo e Ganância nos últimos 30 dias</h2>
          <div className="mt-3 flex h-24 items-end gap-[3px]" role="img" aria-label="Índice de Medo e Ganância nos últimos 30 dias">
            {[...fng.data.history].reverse().map((h) => (
              <div key={h.ts} title={`${new Date(h.ts * 1000).toLocaleDateString("pt-BR", { timeZone: "UTC" })}: ${h.value}`} className="flex-1 rounded-t" style={{ height: `${Math.max(h.value, 3)}%`, background: fngColor(h.value) }} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">0 = medo extremo, 100 = ganância extrema. Mais antigo à esquerda.</p>
        </section>
      )}

      <h2 className="mb-3 font-display text-xl font-bold text-gold-soft">Maiores altas e baixas em 24h</h2>
      {isPro ? (
        top.data ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="card p-4"><h3 className="mb-2 font-semibold text-up">Maiores altas</h3><CoinTable coins={gainers} /></section>
            <section className="card p-4"><h3 className="mb-2 font-semibold text-down">Maiores baixas</h3><CoinTable coins={losers} /></section>
          </div>
        ) : <p className="card p-4 text-sm text-muted">Dados indisponíveis no momento.</p>
      ) : (
        <Locked feature="Maiores altas e baixas do dia" />
      )}
      <p className="mt-3 text-xs text-muted">Altas e baixas consideram as 250 maiores criptomoedas com volume acima de US$ 1 milhão em 24h.</p>
      <Disclaimer />
    </>
  );
}
