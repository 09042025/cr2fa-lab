import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCoinDetail, getMarketChart } from "@/lib/market";
import { LineChart } from "@/components/LineChart";
import { Change, DataStatus, Disclaimer, Locked, PageTitle, ProBadge } from "@/components/ui";
import { cleanTicker } from "@/lib/charts";
import { usd, usdCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

const PERIODS = [{ d: 7, l: "7d" }, { d: 30, l: "30d" }, { d: 90, l: "90d" }, { d: 365, l: "1a" }];
const qty = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 2 }));
const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "");

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default async function CoinPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ d?: string }> }) {
  const user = await requireUser();
  const isPro = user.plan === "pro";
  const { id } = await params;
  const sp = await searchParams;
  const days = isPro ? PERIODS.find((p) => String(p.d) === sp.d)?.d ?? 30 : 30;
  const [detail, chart] = await Promise.all([getCoinDetail(id), getMarketChart(id, days)]);
  const c = detail.data;
  const series = chart.data?.prices ?? [];
  const tvTicker = c ? cleanTicker(c.symbol) : null;
  const base = `/painel/cripto/ativo/${encodeURIComponent(id)}`;

  return (
    <>
      <PageTitle title={c ? `${c.name} (${c.symbol})` : "Ativo"} subtitle="Preço, gráfico e informações do ativo." />
      <p className="mb-3 text-sm"><Link className="text-gold-soft underline" href="/painel/cripto/mercado">Voltar para Mercado</Link> · <Link className="text-gold-soft underline" href="/painel/cripto/rwa">RWA</Link></p>
      <DataStatus result={detail} source="CoinGecko" />

      {c && (
        <>
          <div className="mb-5 flex items-center gap-4">
            {c.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image} alt={`Logo ${c.name}`} width={56} height={56} referrerPolicy="no-referrer" className="h-14 w-14 rounded-full bg-panel-2" />}
            <div>
              <p className="text-3xl font-bold">{usd(c.price)} <span className="text-lg"><Change value={c.change24h} /></span></p>
              <p className="text-sm text-muted">{c.rank ? `Posição #${c.rank} por valor de mercado` : "Fora do ranking principal"}</p>
            </div>
          </div>
          <section className="mb-5 grid gap-3 sm:grid-cols-3">
            <Item label="Valor de mercado" value={usdCompact(c.marketCap)} />
            <Item label="Volume em 24h" value={usdCompact(c.volume)} />
            <Item label="Variação em 24h" value={<Change value={c.change24h} />} />
          </section>
        </>
      )}

      <section className="card mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Gráfico de preço</h2>
          <div className="flex gap-1 text-sm">
            {PERIODS.map((p) => (isPro || p.d === 30) ? (
              <Link key={p.d} href={`${base}?d=${p.d}`} className={`btn ${p.d === days ? "btn-gold" : "btn-ghost"}`}>{p.l}</Link>
            ) : (
              <span key={p.d} className="btn btn-ghost cursor-not-allowed opacity-50" title="Períodos maiores no plano Pró">{p.l}</span>
            ))}
          </div>
        </div>
        <DataStatus result={chart} source="CoinGecko" />
        {series.length > 1 && <LineChart points={series.map((r) => r[1])} color="auto" height={280} format={(v) => usd(v)} startTs={series[0][0]} endTs={series[series.length - 1][0]} />}
        {chart.data && !isPro && <p className="mt-2 flex items-center gap-2 text-xs text-muted"><ProBadge /> Períodos de 7 dias, 90 dias e 1 ano no plano Pró.</p>}
      </section>

      <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-gold-soft">Informações {!isPro && <ProBadge />}</h2>
      {isPro ? (
        c ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Item label="Valor totalmente diluído (FDV)" value={usdCompact(c.fdv)} />
              <Item label="Oferta circulante" value={qty(c.circulating)} />
              <Item label="Oferta total" value={qty(c.total)} />
              <Item label="Oferta máxima" value={c.max === null ? "Sem limite" : qty(c.max)} />
              <Item label="Máxima histórica" value={<>{usd(c.ath)} <span className="block text-xs font-normal text-muted">{dt(c.athDate)}</span></>} />
              <Item label="Mínima histórica" value={<>{usd(c.atl)} <span className="block text-xs font-normal text-muted">{dt(c.atlDate)}</span></>} />
              <Item label="Variação em 7 dias" value={<Change value={c.change7d} />} />
              <Item label="Variação em 30 dias" value={<Change value={c.change30d} />} />
              <Item label="Variação em 1 ano" value={<Change value={c.change1y} />} />
            </section>
            {c.description && (
              <section className="card mt-5 p-4">
                <h3 className="mb-2 font-semibold">Sobre {c.name}</h3>
                <p className="text-sm leading-relaxed text-white/85">{c.description}{c.description.length >= 900 ? "…" : ""}</p>
                {c.categories.length > 0 && <p className="mt-3 flex flex-wrap gap-2 text-xs">{c.categories.map((t) => <span key={t} className="rounded-full border border-line bg-panel-2 px-2.5 py-1 text-muted">{t}</span>)}</p>}
              </section>
            )}
            {c.contracts.length > 0 && (
              <section className="card mt-5 p-4">
                <h3 className="mb-2 font-semibold">Contratos</h3>
                <ul className="space-y-1 break-all text-sm">
                  {c.contracts.map((k) => <li key={k.platform + k.address}><span className="text-muted">{k.platform}:</span> <span className="font-mono text-xs">{k.address}</span></li>)}
                </ul>
                <p className="mt-2 text-xs text-muted">Confira sempre o endereço no site oficial do projeto antes de qualquer transação.</p>
              </section>
            )}
          </>
        ) : <p className="card p-4 text-sm text-muted">Informações indisponíveis no momento.</p>
      ) : (
        <Locked feature="Oferta, máxima histórica, descrição e contratos" />
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {c?.homepage && <a className="btn btn-ghost" href={c.homepage} target="_blank" rel="noopener noreferrer">Site oficial ↗</a>}
        {c?.twitter && <a className="btn btn-ghost" href={`https://x.com/${c.twitter}`} target="_blank" rel="noopener noreferrer">X (Twitter) ↗</a>}
        {c?.explorers.map((u) => <a key={u} className="btn btn-ghost" href={u} target="_blank" rel="noopener noreferrer">Explorador ↗</a>)}
        <a className="btn btn-ghost" href={`https://www.coingecko.com/en/coins/${encodeURIComponent(id)}`} target="_blank" rel="noopener noreferrer">CoinGecko ↗</a>
        {tvTicker && <a className="btn btn-ghost" href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(`BINANCE:${tvTicker}USDT`)}`} target="_blank" rel="noopener noreferrer">TradingView ↗</a>}
      </div>
      <Disclaimer />
    </>
  );
}
