import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getUsQuote, US_REITS, US_STOCKS } from "@/lib/usmarket";
import { monthCalendar, nextEstimate, sumBetween } from "@/lib/dividends";
import { usLogo } from "@/lib/cryptoquote";
import { TickerLogo } from "@/components/TickerLogo";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { pct, usd, usdCompact } from "@/lib/format";
import { getFund } from "@/lib/sec";
import { buildUsAssessment, marketCapOf } from "@/lib/usassess";
import { isCritical } from "@/lib/assess";
import { attentionPoints } from "@/lib/indicators";
import { IndicatorCard } from "@/components/AssetAnalysis";

export const dynamic = "force-dynamic";
const brDate = (s: string) => s.split("-").reverse().join("/");

/** Página de uma ação ou REIT americano: preço, proventos e calendário (em dólar). Indicadores da CVM existem só para empresas brasileiras. */
export default async function UsAssetPage({ params, searchParams }: { params: Promise<{ ticker: string }>; searchParams: Promise<{ de?: string }> }) {
  const user = await requireUser();
  const isPro = user.plan === "pro";
  const ticker = (await params).ticker.toUpperCase();
  if (!/^[A-Z]{1,5}$/.test(ticker)) notFound();
  const sp = await searchParams;
  const meta = [...US_STOCKS, ...US_REITS].find((a) => a.symbol === ticker);
  const reit = US_REITS.some((a) => a.symbol === ticker) || sp.de === "fiis";
  const back = reit ? "/painel/fiis?pais=us" : "/painel/acoes?pais=us";
  const [q, fd] = await Promise.all([getUsQuote(ticker), getFund(ticker)]);
  const d = q.data;
  const fund = fd.data;
  const today = new Date().toISOString().slice(0, 10);
  const div12 = d ? sumBetween(d.dividends, new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10), today) : 0;
  const cal = d ? monthCalendar(d.dividends, today) : null;
  const next = d ? nextEstimate(d.dividends, today) : null;
  const a = d ? buildUsAssessment(ticker, reit, fund, d, meta?.name ?? null, today) : null;
  const mc = d ? marketCapOf(d.price, fund) : null;
  const { bad, warn } = a ? attentionPoints(a.indicators) : { bad: [], warn: [] };

  return (
    <>
      <p className="mb-3 text-sm"><Link className="text-gold-soft underline" href={back}>← Voltar para a lista</Link></p>
      <div className="mb-4 flex items-center gap-3">
        <TickerLogo src={usLogo(ticker)} symbol={ticker} size={48} />
        <div><h1 className="font-display text-2xl font-bold">{ticker}</h1><p className="text-sm text-muted">{meta ? `${meta.name} · ${meta.sector}` : "Mercado americano"}</p></div>
      </div>
      {!d ? <p className="card p-4 text-sm text-muted">Cotação indisponível agora{q.error ? ` (${q.error})` : ""}. Confira o código ou tente de novo em instantes.</p> : (
        <>
          <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[["Preço", usd(d.price)], ["Valor de mercado", mc ? usdCompact(mc) : "—"], ["Proventos em 12 meses", usd(div12)], ["Dividend yield (12m)", d.price && div12 ? pct((div12 / d.price) * 100, 2) : "—"], ["Pagamentos em 12 meses", String(d.dividends.filter((x) => x.date > new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)).length)]].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-line bg-panel-2 p-3"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-lg font-semibold">{v}</p></div>
            ))}
          </section>
          {a && a.indicators.length > 0 && !isPro && <div className="mb-4"><Locked feature="Indicadores e pontos de atenção" /></div>}
          {a && a.indicators.length > 0 && isPro && (
            <>
              <div className={`mb-4 rounded-xl border p-4 ${isCritical(a) ? "border-red-500/50 bg-red-500/10" : "border-line bg-panel-2"}`}>
                <p className="text-xs uppercase tracking-wider text-muted">Pontos de atenção</p>
                <p className="mt-1 text-2xl font-bold">{a.bad + a.warn} <span className="text-base font-normal text-muted">de {a.total} indicadores</span></p>
                <p className="mt-1 text-xs text-muted"><span className="text-red-400">{a.bad} ruim</span> · <span className="text-yellow-300">{a.warn} atenção</span> · <span className="text-green-400">{a.good} bom</span></p>
              </div>
              <h2 className="mb-1 font-display text-xl font-bold text-gold-soft">Indicadores</h2>
              <p className="mb-3 text-xs text-muted">{a.period ? `Dados até: ${brDate(a.period)}. ` : ""}Fonte: {a.source}. Selos por critérios gerais e fixos, informativos, não recomendação de investimento.{a.notice ? ` ${a.notice}` : ""}</p>
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{a.indicators.map((i) => <IndicatorCard key={i.id} i={i} />)}</section>
              {bad.length + warn.length > 0 && (
                <div className="card mt-4 p-4"><h3 className="mb-2 font-semibold">Pontos de atenção</h3>
                  <ul className="space-y-1.5 text-sm">{bad.map((t) => <li key={t} className="flex gap-2"><span className="text-red-400">●</span><span>{t}</span></li>)}{warn.map((t) => <li key={t} className="flex gap-2"><span className="text-yellow-300">●</span><span>{t}</span></li>)}</ul>
                </div>
              )}
            </>
          )}
          {!isPro ? <Locked feature="Calendário de proventos" /> : (
            <>
              <h2 className="mb-3 mt-6 font-display text-xl font-bold text-gold-soft">Calendário de proventos</h2>
              {next && <div className="card mb-3 p-4 text-sm"><p><span className="text-muted">Próxima data com (estimativa, {next.basis}):</span> <strong>{brDate(next.date)}</strong> · valor parecido com o último ({usd(next.value)}).</p></div>}
              {cal && <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{cal.map((m) => (
                <div key={m.month} className={`rounded-lg border p-2 text-center text-xs ${m.items.length ? "border-gold/50 bg-gold/10" : "border-line bg-panel-2 text-muted"}`}>
                  <p className="font-semibold">{m.label}</p>
                  {m.items.length ? m.items.map((x) => <p key={x.date}>{x.date.slice(8)}/{x.date.slice(5, 7)} · {usd(x.value)}</p>) : <p>—</p>}
                </div>))}</div>}
              {d.dividends.length === 0 && <p className="card p-4 text-sm text-muted">Sem proventos registrados nos últimos 5 anos.</p>}
            </>
          )}
          <p className="mt-4 text-xs text-muted">Valores em dólar (US$), cotação da Yahoo Finance. Indicadores de balanço pelos dados abertos da SEC (últimos 12 meses, atualizados a cada relatório trimestral).</p>
        </>
      )}
      <Disclaimer />
    </>
  );
}
