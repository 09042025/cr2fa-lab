import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCryptoPage, getFearGreed, getGlobalMarket } from "@/lib/market";
import { Gauge } from "@/components/Gauge";
import { LineChart } from "@/components/LineChart";
import { Change, DataStatus, Disclaimer, Locked, PageTitle, ProBadge } from "@/components/ui";
import { usd, usdCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

const FNG_PT: Record<string, string> = { "Extreme Fear": "Medo extremo", Fear: "Medo", Neutral: "Neutro", Greed: "Ganância", "Extreme Greed": "Ganância extrema" };
const STABLES = new Set(["USDT", "USDC", "DAI", "USDE", "FDUSD", "USDS", "PYUSD", "TUSD", "USD1", "USDD", "BUIDL", "USDTB", "USDG", "RLUSD"]);
const day = (ts: number) => new Date(ts * 1000).toLocaleDateString("pt-BR", { timeZone: "UTC" });
const PERIODS = [{ d: 30, l: "30 dias" }, { d: 90, l: "90 dias" }, { d: 365, l: "1 ano" }];

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Back() {
  return <p className="mb-3 text-sm"><Link className="text-gold-soft underline" href="/painel/cripto">Voltar para Visão de mercado</Link></p>;
}

async function FearGreedPage({ isPro, d }: { isPro: boolean; d?: string }) {
  const days = isPro ? PERIODS.find((p) => String(p.d) === d)?.d ?? 30 : 30;
  const fng = await getFearGreed(days);
  const h = fng.data?.history ?? [];
  const at = (i: number) => h[i];
  const label = (x?: { label?: string }) => (x?.label ? FNG_PT[x.label] || x.label : "—");
  return (
    <>
      <PageTitle title="Medo e Ganância" subtitle="Mede o humor do mercado cripto de 0 (medo extremo) a 100 (ganância extrema), combinando volatilidade, volume, redes sociais, dominância e buscas." />
      <Back />
      <DataStatus result={fng} source="alternative.me" />
      {fng.data && (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <section className="card p-4">
              <h2 className="font-semibold">Agora</h2>
              <Gauge value={fng.data.value} label={FNG_PT[fng.data.label] || fng.data.label} />
              <ul className="mt-3 space-y-1.5 text-sm">
                {[["Ontem", 1], ["Semana passada", 7], ["Mês passado", 30]].map(([l, i]) => at(i as number) && (
                  <li key={l as string} className="flex justify-between border-b border-line/40 py-1.5 last:border-0"><span className="text-muted">{l}</span><span><b>{at(i as number).value}</b> <span className="text-muted">{label(at(i as number))}</span></span></li>
                ))}
              </ul>
            </section>
            <section className="card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Evolução</h2>
                <div className="flex gap-1 text-sm">
                  {PERIODS.map((p) => (isPro || p.d === 30) ? (
                    <Link key={p.d} href={`/painel/cripto/indice/medo-ganancia?d=${p.d}`} className={`btn ${p.d === days ? "btn-gold" : "btn-ghost"}`}>{p.l}</Link>
                  ) : <span key={p.d} className="btn btn-ghost cursor-not-allowed opacity-50" title="Períodos maiores no plano Pró">{p.l}</span>)}
                </div>
              </div>
              <LineChart points={[...h].reverse().map((x) => x.value)} color="#d9a520" height={260} format={(v) => String(Math.round(v))} startTs={h.length ? h[h.length - 1].ts * 1000 : undefined} endTs={h.length ? h[0].ts * 1000 : undefined} />
              {!isPro && <p className="mt-2 flex items-center gap-2 text-xs text-muted"><ProBadge /> 90 dias e 1 ano no plano Pró.</p>}
            </section>
          </div>
          <section className="card mt-5 p-4">
            <h2 className="mb-2 font-semibold">Histórico diário</h2>
            <div className="max-h-[420px] overflow-auto">
              <table className="data">
                <thead><tr><th>Data</th><th className="num">Índice</th><th>Classificação</th></tr></thead>
                <tbody>{h.slice(0, isPro ? 400 : 30).map((x) => <tr key={x.ts}><td>{day(x.ts)}</td><td className="num font-semibold">{x.value}</td><td>{label(x)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
          <p className="mt-3 text-xs text-muted">Ganância extrema costuma anteceder correções e medo extremo pode marcar oportunidades, mas o índice descreve o humor do mercado e não prevê preço.</p>
        </>
      )}
      <Disclaimer />
    </>
  );
}

async function AltcoinPage({ isPro }: { isPro: boolean }) {
  const top = await getCryptoPage(1, undefined, 250);
  const list = top.data ?? [];
  const btc = list.find((c) => c.id === "bitcoin");
  const alts = list.filter((c) => c.id !== "bitcoin" && !STABLES.has(c.symbol)).slice(0, 100).filter((c) => typeof c.change30d === "number");
  const b = btc?.change30d;
  const rows = typeof b === "number" ? alts.map((c) => ({ c, diff: (c.change30d as number) - b })) : [];
  const winners = rows.filter((r) => r.diff > 0).length;
  const index = rows.length >= 20 ? Math.round((winners / rows.length) * 100) : null;
  const sorted = [...rows].sort((a, z) => z.diff - a.diff);
  const shownRows = isPro ? sorted : sorted.slice(0, 10);
  return (
    <>
      <PageTitle title="Índice de altcoins" subtitle="Porcentagem das 100 maiores altcoins (sem stablecoins) que rendeu mais que o Bitcoin em 30 dias. Acima de 75: temporada de altcoins. Abaixo de 25: temporada do Bitcoin." />
      <Back />
      <DataStatus result={top} source="CoinGecko" />
      {index !== null && (
        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <Item label="Índice de altcoins" value={<>{index}<span className="text-sm font-normal text-muted"> /100</span></>} />
          <Item label="Rendeu mais que o Bitcoin" value={`${winners} de ${rows.length}`} />
          <Item label="Bitcoin em 30 dias" value={<Change value={b ?? null} />} />
        </section>
      )}
      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Altcoins contra o Bitcoin (30 dias)</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>#</th><th>Ativo</th><th className="num">Preço</th><th className="num">30 dias</th><th className="num">Diferença para o Bitcoin</th></tr></thead>
            <tbody>
              {shownRows.map(({ c, diff }, i) => (
                <tr key={c.id}>
                  <td className="text-muted">{i + 1}</td>
                  <td>
                    <Link href={`/painel/cripto/ativo/${encodeURIComponent(c.id)}`} className="inline-flex items-center gap-2 text-gold-soft hover:underline">
                      {c.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image} alt="" width={22} height={22} loading="lazy" referrerPolicy="no-referrer" className="h-[22px] w-[22px] rounded-full bg-panel-2" />}
                      {c.name}
                    </Link> <span className="text-muted">{c.symbol}</span>
                  </td>
                  <td className="num">{usd(c.priceUsd)}</td>
                  <td className="num"><Change value={c.change30d ?? null} /></td>
                  <td className="num"><Change value={diff} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="text-muted">Dados indisponíveis no momento.</td></tr>}
            </tbody>
          </table>
        </div>
        {!isPro && rows.length > 10 && <div className="mt-4"><Locked feature={`Lista completa (${rows.length} altcoins)`} /></div>}
      </section>
      <Disclaimer />
    </>
  );
}

async function DominancePage() {
  const [global, top] = await Promise.all([getGlobalMarket(), getCryptoPage(1, undefined, 100)]);
  const g = global.data;
  const total = g?.totalCapUsd ?? null;
  const rows = (top.data ?? []).slice(0, 20);
  const shown = total ? rows.reduce((a, c) => a + c.marketCapUsd, 0) / total : null;
  return (
    <>
      <PageTitle title="Dominância" subtitle="Quanto cada criptomoeda representa do valor de mercado total do setor." />
      <Back />
      <DataStatus result={global} source="CoinGecko" />
      {g && (
        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Valor de mercado total" value={<>{usdCompact(g.totalCapUsd)} <span className="text-sm"><Change value={g.capChange24h} /></span></>} />
          <Item label="Dominância do Bitcoin" value={g.btcDominance === null ? "—" : `${g.btcDominance.toFixed(1).replace(".", ",")}%`} />
          <Item label="Dominância do Ethereum" value={g.ethDominance === null ? "—" : `${g.ethDominance.toFixed(1).replace(".", ",")}%`} />
          <Item label="As 20 maiores juntas" value={shown === null ? "—" : `${(shown * 100).toFixed(1).replace(".", ",")}%`} />
        </section>
      )}
      <section className="card p-4">
        <h2 className="mb-2 font-semibold">As 20 maiores</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>#</th><th>Ativo</th><th className="num">Valor de mercado</th><th className="num">Dominância</th><th>Participação</th></tr></thead>
            <tbody>
              {rows.map((c, i) => {
                const share = total ? (c.marketCapUsd / total) * 100 : null;
                return (
                  <tr key={c.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td>
                      <Link href={`/painel/cripto/ativo/${encodeURIComponent(c.id)}`} className="inline-flex items-center gap-2 text-gold-soft hover:underline">
                        {c.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image} alt="" width={22} height={22} loading="lazy" referrerPolicy="no-referrer" className="h-[22px] w-[22px] rounded-full bg-panel-2" />}
                        {c.name}
                      </Link> <span className="text-muted">{c.symbol}</span>
                    </td>
                    <td className="num">{usdCompact(c.marketCapUsd)}</td>
                    <td className="num font-semibold">{share === null ? "—" : `${share.toFixed(2).replace(".", ",")}%`}</td>
                    <td className="w-40"><div className="h-2 rounded-full bg-panel-2"><div className="h-2 rounded-full bg-gold" style={{ width: `${Math.min(100, share ?? 0)}%` }} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <Disclaimer />
    </>
  );
}

export default async function IndexDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ d?: string }> }) {
  const user = await requireUser();
  const isPro = user.plan === "pro";
  const { slug } = await params;
  const sp = await searchParams;
  if (slug === "medo-ganancia") return <FearGreedPage isPro={isPro} d={sp.d} />;
  if (slug === "altcoins") return <AltcoinPage isPro={isPro} />;
  if (slug === "dominancia") return <DominancePage />;
  notFound();
}
