import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPoolDetail } from "@/lib/pooldetail";
import { PoolCharts } from "@/components/PoolCharts";
import { PoolSimulator } from "@/components/PoolSimulator";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { pct, usdCompact } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detalhes do pool" };

const Stat = ({ l, v, tone }: { l: string; v: string; tone?: string }) => <div className="card p-3"><p className="text-xs text-muted">{l}</p><p className={`text-lg font-semibold ${tone ?? ""}`}>{v}</p></div>;

export default async function PoolPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await requireUser();
  const { id } = await searchParams;
  if (user.plan !== "pro" && user.role !== "admin") {
    return <><PageTitle title="Detalhes do pool" subtitle="Simulador de faixa e taxas." /><Locked feature="Detalhes e simulador de pools (exclusivo do plano Premium)" text="O simulador de faixa e taxas dos pools faz parte do plano Premium." /></>;
  }
  const d = id ? await getPoolDetail(id) : null;
  if (!d) {
    return <><PageTitle title="Detalhes do pool" /><p className="text-sm text-muted">Pool não encontrado (a lista é atualizada a cada poucos minutos). <Link className="text-gold-soft underline" href="/painel/cripto/defi">Voltar ao HUB DEFI</Link></p></>;
  }
  const syms = d.symbol.split(/[-/ +]/).filter(Boolean);
  const symA = syms[0] ?? "A", symB = syms[1] ?? "B";
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/painel/cripto/defi" className="text-gold-soft hover:underline">← HUB DEFI</Link></p>
      <PageTitle title={`${d.symbol}${d.poolMeta ? ` ${d.poolMeta}` : ""}`} subtitle={`${d.project} · ${d.chain}${d.stablecoin ? " · stable" : ""}${d.rwa ? " · RWA" : ""}`} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat l="TVL" v={usdCompact(d.tvlUsd)} />
        <Stat l="Volume (24h)" v={d.volumeUsd1d === null ? "—" : usdCompact(d.volumeUsd1d)} />
        <Stat l="Taxas geradas (24h)" v={d.fees24h === null ? "—" : usdCompact(d.fees24h)} tone="text-up" />
        <Stat l="APR total" v={pct(d.apy)} tone="text-gold-soft" />
        <Stat l="APR de taxas" v={pct(d.apyBase)} />
        <Stat l="Recompensas" v={pct(d.apyReward)} />
        <Stat l="Média 30 dias" v={pct(d.apyMean30d)} />
        <Stat l="Taxa do pool" v={d.feeRate === null ? "—" : `${(d.feeRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}%${d.feeFromDex ? "" : " (est.)"}`} />
      </div>
      <PoolCharts chart={d.chart} history={d.history} />
      <PoolSimulator dist={d.dist} symA={symA} symB={symB} price={d.price} usdA={d.usdA} usdB={d.usdB} baseApr={d.baseApr} stable={d.stablecoin} priceNote={d.priceNote} dexName={d.link.kind === "llama" ? "DefiLlama" : d.link.name} dexUrl={d.link.url} />
      <p className="mt-3 text-xs text-muted"><a className="text-gold-soft hover:underline" href={d.llama} target="_blank" rel="noopener noreferrer">Dados do pool na fonte ↗</a></p>
      <Disclaimer />
    </>
  );
}
