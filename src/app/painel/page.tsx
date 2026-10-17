import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCryptoMarkets, getDefiPools, getRates } from "@/lib/market";
import { Change, DataStatus, Disclaimer, PageTitle } from "@/components/ui";
import { pct, usd, usdCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const user = await requireUser();
  const [rates, coins, pools] = await Promise.all([getRates(), getCryptoMarkets(), getDefiPools()]);

  return (
    <>
      <PageTitle title={`Olá, ${user.name.split(" ")[0]}`} subtitle="Resumo dos dados que movem os cinco blocos do seu Protocolo CR2FA." />

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Selic (meta)", value: rates.data?.selic },
          { label: "CDI (anualizado)", value: rates.data?.cdi },
          { label: "IPCA (12 meses)", value: rates.data?.ipca12m },
        ].map((r) => (
          <div key={r.label} className="card p-4">
            <p className="text-xs text-muted">{r.label}</p>
            <p className="mt-1 text-2xl font-bold text-gold-soft">{pct(r.value ?? null)}</p>
          </div>
        ))}
      </section>
      <DataStatus result={rates} source="Banco Central do Brasil (SGS)" />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Maiores criptomoedas</h2>
            <Link href="/painel/cripto" className="text-xs text-gold-soft underline">ver mais</Link>
          </div>
          {coins.data ? (
            <table className="data">
              <thead><tr><th>Ativo</th><th className="num">Preço</th><th className="num">24h</th></tr></thead>
              <tbody>
                {coins.data.slice(0, 5).map((c) => (
                  <tr key={c.id}><td>{c.name} <span className="text-muted">{c.symbol}</span></td><td className="num">{usd(c.priceUsd)}</td><td className="num"><Change value={c.change24h} /></td></tr>
                ))}
              </tbody>
            </table>
          ) : <DataStatus result={coins} source="CoinGecko" />}
        </section>

        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Pools DeFi com maior TVL</h2>
            <Link href="/painel/cripto#pools" className="text-xs text-gold-soft underline">ver mais</Link>
          </div>
          {pools.data ? (
            <table className="data">
              <thead><tr><th>Pool</th><th>Rede</th><th className="num">TVL</th><th className="num">APY</th></tr></thead>
              <tbody>
                {pools.data.slice(0, 5).map((p) => (
                  <tr key={p.id}><td>{p.symbol} <span className="text-muted">{p.project}</span></td><td>{p.chain}</td><td className="num">{usdCompact(p.tvlUsd)}</td><td className="num">{pct(p.apy)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <DataStatus result={pools} source="DefiLlama" />}
        </section>
      </div>

      <Disclaimer />
    </>
  );
}
