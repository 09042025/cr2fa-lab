import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { futuresEnabled, getLiquidations } from "@/lib/futures";
import { StackedBars } from "@/components/Bars";
import { DataStatus, Disclaimer, PageTitle, ProBadge } from "@/components/ui";
import { usdCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

const day = (t: number) => new Date(t * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const hour = (t: number) => new Date(t * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

const EXTERNAL = [
  { label: "Mapa de calor de liquidações", url: "https://www.coinglass.com/pt/pro/futures/LiquidationHeatMap?coin=BTC", desc: "Onde estão concentradas as ordens de liquidação por faixa de preço, ao longo do tempo." },
  { label: "Mapa de liquidação", url: "https://www.coinglass.com/pt/pro/futures/LiquidationMap", desc: "Quanto seria liquidado se o preço chegasse a cada nível." },
  { label: "Liquidações", url: "https://www.coinglass.com/pt/pro/futures/Liquidations", desc: "Painel completo de liquidações por corretora." },
];

export default async function FuturesPage({ searchParams }: { searchParams: Promise<{ a?: string; i?: string }> }) {
  const user = await requireUser();
  const isPro = user.plan === "pro";
  const sp = await searchParams;
  const asset = sp.a === "eth" && isPro ? "ETH" : "BTC";
  const interval = sp.i === "1hour" && isPro ? "1hour" : "daily";
  const enabled = futuresEnabled();
  const [liq, hourly] = enabled ? await Promise.all([getLiquidations(asset, interval), getLiquidations(asset, "1hour")]) : [null, null];
  const pts = (liq?.data ?? []).slice(interval === "daily" ? (isPro ? -90 : -30) : -48);
  const last24 = (hourly?.data ?? []).slice(-24);
  const sum = (arr: { longUsd: number; shortUsd: number }[]) => ({ l: arr.reduce((a, p) => a + p.longUsd, 0), s: arr.reduce((a, p) => a + p.shortUsd, 0) });
  const s24 = sum(last24);
  const s7 = sum((interval === "daily" ? pts : []).slice(-7));
  const tab = (on: boolean) => `btn ${on ? "btn-gold" : "btn-ghost"}`;

  return (
    <>
      <PageTitle title="Futuros" subtitle="Liquidações de contratos perpétuos: quanto dinheiro de posições compradas (longs) e vendidas (shorts) foi forçado a fechar." />
      {!enabled ? (
        <section className="card mb-5 border-gold/40 p-5">
          <h2 className="font-semibold text-gold-soft">Falta ligar a fonte de dados</h2>
          <p className="mt-2 text-sm text-muted">
            Os gráficos de liquidação usam a API gratuita da Coinalyze. No site <a className="underline" href="https://coinalyze.net" target="_blank" rel="noopener noreferrer">coinalyze.net</a> crie uma conta, gere a chave em &quot;API&quot; e cadastre na Railway a variável <code className="rounded bg-panel-2 px-1">COINALYZE_API_KEY</code>. Nunca cole a chave em conversas ou prints.
          </p>
        </section>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Link href={`/painel/cripto/futuros?a=btc&i=${interval}`} className={tab(asset === "BTC")}>Bitcoin</Link>
            {isPro ? <Link href={`/painel/cripto/futuros?a=eth&i=${interval}`} className={tab(asset === "ETH")}>Ethereum</Link> : <span className="btn btn-ghost cursor-not-allowed opacity-50" title="Ethereum no plano Pró">Ethereum <ProBadge /></span>}
            <span className="mx-1 text-line">|</span>
            <Link href={`/painel/cripto/futuros?a=${asset.toLowerCase()}&i=daily`} className={tab(interval === "daily")}>Diário</Link>
            {isPro ? <Link href={`/painel/cripto/futuros?a=${asset.toLowerCase()}&i=1hour`} className={tab(interval === "1hour")}>Por hora (48 h)</Link> : <span className="btn btn-ghost cursor-not-allowed opacity-50" title="Visão por hora no plano Pró">Por hora <ProBadge /></span>}
          </div>
          {liq && <DataStatus result={liq} source="Coinalyze (principais corretoras somadas)" />}
          {pts.length > 1 && (
            <>
              <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[["Longs liquidados em 24h", s24.l, "text-down"], ["Shorts liquidados em 24h", s24.s, "text-up"], ["Total em 24h", s24.l + s24.s, ""], ["Total em 7 dias", s7.l + s7.s, ""]].map(([l, v, c]) => (
                  <div key={l as string} className="rounded-lg border border-line bg-panel-2 p-3">
                    <p className="text-xs text-muted">{l as string}</p>
                    <p className={`mt-1 text-lg font-semibold ${c}`}>{interval === "daily" || (l as string).includes("24h") ? usdCompact(v as number) : "—"}</p>
                  </div>
                ))}
              </section>
              <section className="card p-4">
                <h2 className="mb-2 font-semibold">Liquidações de {asset} {interval === "daily" ? `(${isPro ? 90 : 30} dias)` : "(48 horas)"}</h2>
                <StackedBars
                  items={pts.map((p) => ({ label: interval === "daily" ? day(p.t) : hour(p.t), a: p.longUsd, b: p.shortUsd }))}
                  format={usdCompact} aLabel="Longs" bLabel="Shorts"
                />
                {!isPro && <p className="mt-2 flex items-center gap-2 text-xs text-muted"><ProBadge /> 90 dias, visão por hora e Ethereum no plano Pró.</p>}
              </section>
            </>
          )}
        </>
      )}

      <h2 className="mb-3 mt-8 font-display text-xl font-bold text-gold-soft">Mapas de liquidação e mapa de calor</h2>
      <p className="mb-3 text-sm text-muted">Esses três gráficos dependem de dados pagos que não conseguimos exibir aqui. Abra direto na Coinglass:</p>
      <div className="grid gap-3 md:grid-cols-3">
        {EXTERNAL.map((e) => (
          <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="card block p-4 transition hover:border-gold">
            <p className="font-semibold text-gold-soft">{e.label} ↗</p>
            <p className="mt-1 text-sm text-muted">{e.desc}</p>
          </a>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">Liquidação acontece quando a margem de uma posição alavancada acaba e a corretora fecha a posição à força. Grandes liquidações em sequência costumam acompanhar movimentos bruscos de preço.</p>
      <Disclaimer />
    </>
  );
}
