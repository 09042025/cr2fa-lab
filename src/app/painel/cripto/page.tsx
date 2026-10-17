import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCryptoMarkets, getDefiPools } from "@/lib/market";
import { chartHref, cleanTicker } from "@/lib/charts";
import { llamaUrl, poolLink } from "@/lib/poollinks";
import { estimateMonthly, filterPools, turnover, type PoolFilters } from "@/lib/pools";
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

  const tipo = sp.tipo === "rendimento" ? "rendimento" : "liquidez";
  const base = pools.data ? pools.data.filter((p) => (tipo === "liquidez" ? p.dex : !p.dex)) : [];
  // Redes que o DefiLlama ainda não cobre em DEX, mas que o usuário quer ver (Uniswap v4 na Robinhood Chain).
  const EXTRA_DEX_CHAINS = ["Robinhood Chain"];
  const chains = [...new Set([...base.map((p) => p.chain), ...(tipo === "liquidez" ? EXTRA_DEX_CHAINS : [])])].sort();
  const dexes = [...new Set(base.map((p) => p.project))].sort();
  const eff: PoolFilters = isPro ? { ...sp, tipo } : { tipo };
  const filtered = pools.data ? filterPools(pools.data, eff) : [];
  const poolRows = isPro ? filtered.slice(0, 200) : filtered.slice(0, FREE_LIMITS.pools);
  const valor = Math.min(Math.max(Number(sp.valor) || 1000, 1), 100_000_000);
  const exportQs = new URLSearchParams(Object.entries({ ...sp, tipo }).filter(([, v]) => v) as [string, string][]).toString();
  const isDex = tipo === "liquidez";

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
                    <td>
                      {cleanTicker(c.symbol) ? (
                        <Link href={chartHref("cripto", c.symbol, { nome: c.name, id: c.id })} title="Ver gráfico" className="text-gold-soft underline-offset-2 hover:underline">{c.name}</Link>
                      ) : (
                        <a href={`https://www.coingecko.com/en/coins/${encodeURIComponent(c.id)}`} target="_blank" rel="noopener noreferrer" title="Ver no CoinGecko" className="text-gold-soft underline-offset-2 hover:underline">{c.name} ↗</a>
                      )}{" "}
                      <span className="text-muted">{c.symbol}</span>
                    </td>
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Pools de liquidez e rendimento</h2>
          {isPro && pools.data && <a href={`/api/export/pools?${exportQs}`} className="btn btn-ghost">Exportar CSV</a>}
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <Link href="/painel/cripto?tipo=liquidez#pools" className={`btn ${isDex ? "btn-gold" : "btn-ghost"}`}>Liquidez em DEX</Link>
          <Link href="/painel/cripto?tipo=rendimento#pools" className={`btn ${!isDex ? "btn-gold" : "btn-ghost"}`}>Empréstimo e staking</Link>
        </div>
        <p className="mb-2 text-xs text-muted">
          {isDex
            ? "Pares de ativos em corretoras descentralizadas (Uniswap, PancakeSwap, Aerodrome, Camelot, Curve, Raydium e outras). Quem fornece liquidez recebe parte das taxas de negociação."
            : "Empréstimo, staking e outros protocolos em que você deposita um ativo e recebe rendimento."}
        </p>
        <DataStatus result={pools} source="DefiLlama" />

        {isPro ? (
          <form className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" method="get">
            <input type="hidden" name="tipo" value={tipo} />
            <div><label className="label" htmlFor="q">Buscar</label><input id="q" name="q" defaultValue={sp.q} className="input" placeholder="ex.: ETH-USDC, 0.05%" /></div>
            <div>
              <label className="label" htmlFor="rede">Rede</label>
              <select id="rede" name="rede" defaultValue={sp.rede || ""} className="input">
                <option value="">Todas</option>
                {chains.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="dex">{isDex ? "DEX" : "Protocolo"}</label>
              <select id="dex" name="dex" defaultValue={sp.dex || ""} className="input">
                <option value="">Todos</option>
                {dexes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ordem">Ordenar por</label>
              <select id="ordem" name="ordem" defaultValue={sp.ordem || "tvl"} className="input">
                <option value="tvl">TVL</option>
                <option value="apy">APR total</option>
                {isDex && <option value="vol">Volume 24h</option>}
                {isDex && <option value="taxas">APR de taxas</option>}
                {isDex && <option value="eficiencia">Giro (volume ÷ TVL)</option>}
              </select>
            </div>
            <div><label className="label" htmlFor="min">TVL mínimo (US$)</label><input id="min" name="min" type="number" min={0} defaultValue={sp.min} className="input" placeholder="1000000" /></div>
            {isDex && <div><label className="label" htmlFor="vol">Volume 24h mínimo (US$)</label><input id="vol" name="vol" type="number" min={0} defaultValue={sp.vol} className="input" placeholder="500000" /></div>}
            <div><label className="label" htmlFor="valor">Simular com (US$)</label><input id="valor" name="valor" type="number" min={1} defaultValue={sp.valor || "1000"} className="input" /></div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="stable" value="1" defaultChecked={sp.stable === "1"} /> Só stablecoins</label>
              <button className="btn btn-gold">Filtrar</button>
            </div>
          </form>
        ) : (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted"><ProBadge /> Filtros por rede, DEX, TVL, volume e simulador de retorno no plano Pró.</div>
        )}

        {pools.data && (
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                {isDex ? (
                  <tr><th>Par</th><th>DEX</th><th>Rede</th><th className="num">TVL</th><th className="num">Volume 24h</th><th className="num">Giro</th><th className="num">APR taxas</th><th className="num">APR recompensas</th><th className="num">APR total</th><th className="num">Média 30d</th><th className="num">Perda imperm. 7d</th>{isPro && <th className="num">Estim. 30d</th>}</tr>
                ) : (
                  <tr><th>Ativo</th><th>Protocolo</th><th>Rede</th><th className="num">TVL</th><th className="num">APY total</th><th className="num">Base</th><th className="num">Recompensa</th><th className="num">Média 30d</th>{isPro && <th className="num">Estim. 30d</th>}</tr>
                )}
              </thead>
              <tbody>
                {poolRows.map((p) => {
                  const est = estimateMonthly(valor, p.apy);
                  const link = poolLink(p);
                  const title = link.kind === "direct" ? `Abrir o par em ${link.name}` : link.kind === "home" ? `Abrir ${link.name} (procure o par lá)` : "Ver o pool no DefiLlama";
                  const open = (
                    <>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" title={title} className="text-gold-soft underline-offset-2 hover:underline">{p.symbol} <span aria-hidden>↗</span></a>
                      {link.kind !== "llama" && <a href={llamaUrl(p)} target="_blank" rel="noopener noreferrer" title="Detalhes e histórico no DefiLlama" className="ml-1 text-xs text-muted hover:text-gold-soft">ⓘ</a>}
                    </>
                  );
                  return isDex ? (
                    <tr key={p.id}>
                      <td>{open}{p.poolMeta && <span className="ml-1 rounded border border-line px-1 text-xs text-muted">{p.poolMeta}</span>}{p.stablecoin && <span className="ml-1 text-xs text-up">stable</span>}</td>
                      <td className="text-muted">{p.project}</td>
                      <td>{p.chain}</td>
                      <td className="num">{usdCompact(p.tvlUsd)}</td>
                      <td className="num">{usdCompact(p.volumeUsd1d)}</td>
                      <td className="num">{turnover(p) === null ? "—" : `${turnover(p)!.toFixed(2)}x`}</td>
                      <td className="num">{pct(p.apyBase)}</td>
                      <td className="num">{pct(p.apyReward)}</td>
                      <td className="num font-semibold text-gold-soft">{pct(p.apy)}</td>
                      <td className="num">{pct(p.apyMean30d)}</td>
                      <td className="num">{p.il7d === null ? "—" : pct(p.il7d)}</td>
                      {isPro && <td className="num">{est === null ? "—" : usd(est)}</td>}
                    </tr>
                  ) : (
                    <tr key={p.id}>
                      <td>{open}{p.stablecoin && <span className="ml-1 text-xs text-up">stable</span>}</td>
                      <td className="text-muted">{p.project}</td>
                      <td>{p.chain}</td>
                      <td className="num">{usdCompact(p.tvlUsd)}</td>
                      <td className="num font-semibold text-gold-soft">{pct(p.apy)}</td>
                      <td className="num">{pct(p.apyBase)}</td>
                      <td className="num">{pct(p.apyReward)}</td>
                      <td className="num">{pct(p.apyMean30d)}</td>
                      {isPro && <td className="num">{est === null ? "—" : usd(est)}</td>}
                    </tr>
                  );
                })}
                {poolRows.length === 0 && (
                  <tr><td colSpan={12} className="text-muted">
                    {isDex && (sp.rede === "Robinhood Chain")
                      ? <>O DefiLlama ainda não lista pools de DEX da Robinhood Chain (hoje só aparecem empréstimos, na aba “Empréstimo e staking”). Veja os pools de Uniswap v4 dessa rede direto na <a className="text-gold-soft underline" href="https://app.uniswap.org/explore/pools/robinhood" target="_blank" rel="noopener noreferrer">Uniswap ↗</a>.</>
                      : "Nenhum pool com esses filtros."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!isPro && <div className="mt-4"><Locked feature={`Pools completos (${filtered.length || "centenas de"} disponíveis nesta aba) com filtros e simulador`} /></div>}
        <p className="mt-3 text-xs text-muted">
          {isDex
            ? "APR de taxas vem do volume negociado no pool; recompensas em token oscilam e podem acabar. Giro é o volume de 24h dividido pelo TVL: quanto maior, mais taxa o pool gera por dólar depositado. A perda impermanente acontece quando os preços do par se afastam e pode superar as taxas ganhas. A estimativa de 30 dias usa o APR de hoje e não inclui essa perda. Clique no nome do par para abrir a DEX oficial em outra aba. Confira sempre o endereço do site e os tokens antes de conectar a carteira."
            : "APY alto costuma vir de recompensas em token, que oscilam. Stablecoin em protocolo DeFi tem risco de contrato, de paridade e de plataforma, por isso o Protocolo limita esse pedaço a 30% de um bloco de 20%."}
        </p>
      </section>
      <p className="mt-4 text-xs"><Link className="text-gold-soft underline" href="/painel/protocolo">Ver como esse bloco entra na sua carteira</Link></p>
      <Disclaimer />
    </>
  );
}
