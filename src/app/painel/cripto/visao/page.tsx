import { requireUser } from "@/lib/auth";
import { getCryptoPage, getFearGreed, getGlobalMarket } from "@/lib/market";
import { CoinTable } from "@/components/CoinTable";
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

export default async function MarketViewPage() {
  const user = await requireUser();
  const isPro = user.plan === "pro";
  const [global, fng, top] = await Promise.all([getGlobalMarket(), getFearGreed(), getCryptoPage(1, undefined, 250)]);
  const g = global.data;
  const coins = (top.data ?? []).filter((c) => c.change24h !== null && c.volumeUsd > 1_000_000);
  const gainers = [...coins].sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0)).slice(0, 10);
  const losers = [...coins].sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0)).slice(0, 10);
  const others = g && g.btcDominance !== null && g.ethDominance !== null ? Math.max(0, 100 - g.btcDominance - g.ethDominance) : null;

  return (
    <>
      <PageTitle title="Visão de mercado" subtitle="Termômetro geral do mercado cripto: valor total, volume, dominância do Bitcoin e humor dos investidores." />
      <DataStatus result={global} source="CoinGecko" />
      {g && (
        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Valor de mercado total" value={<>{usdCompact(g.totalCapUsd)} <span className="text-sm"><Change value={g.capChange24h} /></span></>} />
          <Item label="Volume em 24h" value={usdCompact(g.totalVolumeUsd)} />
          <Item label="Dominância do Bitcoin" value={g.btcDominance === null ? "—" : `${g.btcDominance.toFixed(1).replace(".", ",")}%`} />
          <Item label="Dominância do Ethereum" value={g.ethDominance === null ? "—" : `${g.ethDominance.toFixed(1).replace(".", ",")}%`} />
          {others !== null && <Item label="Dominância das demais" value={`${others.toFixed(1).replace(".", ",")}%`} />}
          {g.activeCoins !== null && <Item label="Criptomoedas ativas" value={g.activeCoins.toLocaleString("pt-BR")} />}
        </section>
      )}

      <section className="card mb-6 p-4">
        <h2 className="mb-1 font-semibold">Medo e Ganância</h2>
        <DataStatus result={fng} source="alternative.me" />
        {fng.data && (
          <>
            <p className="mt-2 text-4xl font-bold" style={{ color: fngColor(fng.data.value) }}>{fng.data.value} <span className="text-lg">{FNG_PT[fng.data.label] || fng.data.label}</span></p>
            <p className="mt-1 text-xs text-muted">0 = medo extremo, 100 = ganância extrema. Últimos 30 dias (mais antigo à esquerda):</p>
            <div className="mt-3 flex h-24 items-end gap-[3px]" role="img" aria-label="Índice de Medo e Ganância nos últimos 30 dias">
              {[...fng.data.history].reverse().map((h) => (
                <div key={h.ts} title={`${new Date(h.ts * 1000).toLocaleDateString("pt-BR", { timeZone: "UTC" })}: ${h.value}`} className="flex-1 rounded-t" style={{ height: `${Math.max(h.value, 3)}%`, background: fngColor(h.value) }} />
              ))}
            </div>
          </>
        )}
      </section>

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
