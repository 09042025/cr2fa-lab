import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCryptoMarkets, getDefiPools } from "@/lib/market";
import { filterPools, type PoolFilters } from "@/lib/pools";
import { Change, DataStatus, Disclaimer, Locked, PageTitle, ProBadge } from "@/components/ui";
import { FREE_LIMITS } from "@/lib/plans";
import { pct, usd, usdCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

type SP = PoolFilters;

export default async function CryptoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isPro = user.plan === "pro";
  const [coins, pools] = await Promise.all([getCryptoMarkets(), getDefiPools()]);

  const chains = pools.data ? [...new Set(pools.data.map((p) => p.chain))].sort() : [];
  const filtered = pools.data ? filterPools(pools.data, isPro ? sp : {}) : [];
  const poolRows = isPro ? filtered.slice(0, 200) : filtered.slice(0, FREE_LIMITS.pools);
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageTitle title="Cripto e DeFi" subtitle="Mercado de criptomoedas e pools de rendimento em dezenas de redes. No Protocolo, 60% do bloco é Bitcoin, 10% Ethereum e 30% stablecoins rendendo." />

      <section className="card mb-8 p-4">
        <h2 className="mb-2 font-semibold">Mercado</h2>
        <DataStatus result={coins} source="CoinGecko" />
        {coins.data && (
          <div className="overflow-x-auto">
            <table className="data">
              <thead><tr><th>#</th><th>Ativo</th><th className="num">Preço</th><th className="num">24h</th><th className="num">7d</th><th className="num">Valor de mercado</th><th className="num">Volume 24h</th></tr></thead>
              <tbody>
                {coins.data.slice(0, isPro ? 50 : FREE_LIMITS.crypto).map((c, i) => (
                  <tr key={c.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td>{c.name} <span className="text-muted">{c.symbol}</span></td>
                    <td className="num">{usd(c.priceUsd)}</td>
                    <td className="num"><Change value={c.change24h} /></td>
                    <td className="num"><Change value={c.change7d} /></td>
                    <td className="num">{usdCompact(c.marketCapUsd)}</td>
                    <td className="num">{usdCompact(c.volumeUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isPro && <p className="mt-3 text-xs text-muted">Plano grátis mostra as {FREE_LIMITS.crypto} maiores. O Pró mostra as 50 maiores.</p>}
      </section>

      <section id="pools" className="card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Pools de rendimento (DeFi)</h2>
          {isPro && pools.data && <a href={`/api/export/pools?${exportQs}`} className="btn btn-ghost">Exportar CSV</a>}
        </div>
        <DataStatus result={pools} source="DefiLlama" />

        {isPro ? (
          <form className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
            <div><label className="label" htmlFor="q">Buscar</label><input id="q" name="q" defaultValue={sp.q} className="input" placeholder="ex.: USDC, aave" /></div>
            <div>
              <label className="label" htmlFor="rede">Rede</label>
              <select id="rede" name="rede" defaultValue={sp.rede || ""} className="input">
                <option value="">Todas</option>
                {chains.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor="min">TVL mínimo (US$)</label><input id="min" name="min" type="number" min={0} defaultValue={sp.min} className="input" placeholder="1000000" /></div>
            <div>
              <label className="label" htmlFor="ordem">Ordenar por</label>
              <select id="ordem" name="ordem" defaultValue={sp.ordem || "tvl"} className="input"><option value="tvl">TVL</option><option value="apy">APY</option></select>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="stable" value="1" defaultChecked={sp.stable === "1"} /> Só stablecoins</label>
              <button className="btn btn-gold">Filtrar</button>
            </div>
          </form>
        ) : (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted"><ProBadge /> Filtros por rede, ativo, TVL e APY, mais exportação, no plano Pró.</div>
        )}

        {pools.data && (
          <div className="overflow-x-auto">
            <table className="data">
              <thead><tr><th>Ativo</th><th>Protocolo</th><th>Rede</th><th className="num">TVL</th><th className="num">APY</th><th className="num">Base</th><th className="num">Recompensa</th></tr></thead>
              <tbody>
                {poolRows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.symbol}{p.stablecoin && <span className="ml-1 text-xs text-up">stable</span>}</td>
                    <td className="text-muted">{p.project}</td>
                    <td>{p.chain}</td>
                    <td className="num">{usdCompact(p.tvlUsd)}</td>
                    <td className="num font-semibold text-gold-soft">{pct(p.apy)}</td>
                    <td className="num">{pct(p.apyBase)}</td>
                    <td className="num">{pct(p.apyReward)}</td>
                  </tr>
                ))}
                {poolRows.length === 0 && <tr><td colSpan={7} className="text-muted">Nenhum pool com esses filtros.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {!isPro && <div className="mt-4"><Locked feature={`Pools completos (${pools.data?.length ?? "centenas de"} disponíveis) com filtros`} /></div>}
        <p className="mt-3 text-xs text-muted">APY alto costuma vir de recompensas em token, que oscilam. Stablecoin em protocolo DeFi tem risco de contrato, de paridade e de plataforma, por isso o Protocolo limita esse pedaço a 30% de um bloco de 20%.</p>
      </section>
      <p className="mt-4 text-xs"><Link className="text-gold-soft underline" href="/painel/protocolo">Ver como esse bloco entra na sua carteira</Link></p>
      <Disclaimer />
    </>
  );
}
