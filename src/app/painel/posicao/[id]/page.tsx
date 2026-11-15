import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BLOCKS } from "@/lib/protocol";
import { getQuote } from "@/lib/dividends";
import { getAssetDetail } from "@/lib/market";
import { backfillTickers, cryptoPrice, isCryptoHolding, isUsStock, usLogo, usPrice } from "@/lib/cryptoquote";
import { assessHolding, isCritical, isFiiTicker } from "@/lib/assess";
import { attentionPoints } from "@/lib/indicators";
import { AssetAnalysis, IndicatorCard } from "@/components/AssetAnalysis";
import { TestMail } from "@/components/TestMail";
import { AckButton } from "@/components/AckButton";
import { DeleteHolding } from "@/components/DeleteHolding";
import { HoldingActions } from "@/components/HoldingActions";
import { PrivacyEye } from "@/components/PrivacyEye";
import { TickerLogo } from "@/components/TickerLogo";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { brl, pct } from "@/lib/format";
import { getBenchmarks } from "@/lib/benchmarks";
import { RfBenchmarks } from "@/components/RfBenchmarks";

export const dynamic = "force-dynamic";

interface H { id: number; block: string; label: string; value_cents: number; ticker: string | null; qty: number | null; avg_price: number | null; ack_at: number | null }

export default async function PositionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.plan !== "pro") return <><PageTitle title="Posição" subtitle="Detalhes do ativo." /><Locked feature="Portfólio" /></>;
  await backfillTickers(user.id);
  const id = Number((await params).id);
  const h = Number.isInteger(id) ? (db().prepare("SELECT id, block, label, value_cents, ticker, qty, avg_price, ack_at FROM holdings WHERE id = ? AND user_id = ?").get(id, user.id) as H | undefined) : undefined;
  if (!h) notFound();

  const crypto = isCryptoHolding(h);
  const a = await assessHolding(h);
  let price: number | null = null;
  let detail = null as Awaited<ReturnType<typeof getAssetDetail>>["data"];
  if (h.ticker) {
    if (isUsStock(h)) price = await usPrice(h.ticker);
    else if (crypto) price = (await cryptoPrice(h.ticker))?.price ?? null;
    else { price = (await getQuote(h.ticker)).data?.price ?? null; detail = (await getAssetDetail(h.ticker)).data; price = price ?? detail?.price ?? null; }
  }
  const value = price && h.qty ? price * h.qty : h.value_cents / 100;
  const res = price && h.avg_price ? ((price - h.avg_price) / h.avg_price) * 100 : null;
  const critical = a ? isCritical(a) : false;
  const { bad, warn } = a ? attentionPoints(a.indicators) : { bad: [], warn: [] };
  const logo = a?.logo ?? detail?.logo ?? (h.ticker && isUsStock(h) ? usLogo(h.ticker) : h.ticker && !crypto ? `https://icons.brapi.dev/icons/${h.ticker}.svg` : null);
  const canTrade = !!h.qty;
  const bench = h.block === "renda_fixa" ? await getBenchmarks() : null;

  return (
    <>
      <div className="mb-3 flex items-center justify-between"><p className="text-sm"><Link className="text-gold-soft underline" href="/painel/portfolio">← Voltar para o Portfólio</Link></p><PrivacyEye /></div>
      <div className="mb-4 flex items-center gap-3">
        <TickerLogo src={logo} symbol={h.ticker ?? h.label} size={48} />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">{h.ticker ?? h.label}</h1>
          <p className="truncate text-sm text-muted">{a?.name ?? h.label} · {BLOCKS.find((b) => b.key === h.block)?.name}</p>
        </div>
      </div>

      {a && a.total > 0 && (
        <div className={`mb-4 rounded-xl border p-4 ${critical ? "border-red-500/50 bg-red-500/10" : "border-line bg-panel-2"}`}>
          <p className="text-xs uppercase tracking-wider text-muted">Pontos de atenção</p>
          <p className="mt-1 text-2xl font-bold">{a.bad + a.warn} <span className="text-base font-normal text-muted">de {a.total} indicadores</span></p>
          <p className="mt-1 text-xs text-muted"><span className="text-red-400">{a.bad} ruim</span> · <span className="text-yellow-300">{a.warn} atenção</span> · <span className="text-green-400">{a.good} bom</span></p>
          {critical && (
            <div className="mt-3 text-sm">
              <p className="text-red-300">Mais da metade dos indicadores deste ativo está ruim.{h.ack_at ? " Você já confirmou que está ciente; não enviaremos mais alertas enquanto ele continuar assim." : " Enviaremos um e-mail todos os dias às 8h até você confirmar abaixo."}</p>
              {!h.ack_at && <AckButton id={h.id} />}
              <TestMail />
            </div>
          )}
        </div>
      )}

      <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[["Quantidade", h.qty ? h.qty.toLocaleString("pt-BR") : "—"], ["Preço médio", h.avg_price ? brl(h.avg_price) : "—"], ["Preço atual", price ? brl(price) : "—"], ["Valor", brl(value)]].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-line bg-panel-2 p-3"><p className="text-xs text-muted">{l}</p><p className={`mt-1 text-lg font-semibold ${l === "Preço atual" ? "" : "money"}`}>{v}</p></div>
        ))}
      </section>
      {res !== null && <p className="mb-4 text-sm text-muted">Resultado sobre o preço médio: <strong className={res >= 0 ? "text-up" : "text-down"}>{pct(res, 1)}</strong></p>}

      <section className="card mb-6 p-4">
        <h2 className="mb-2 font-semibold">Operações</h2>
        <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
          {canTrade ? <HoldingActions id={h.id} /> : <p className="text-xs text-muted">Esta posição não tem quantidade; remova e cadastre de novo informando código e quantidade.</p>}
          <div className="pt-0.5 text-xs"><DeleteHolding id={h.id} redirectTo="/painel/portfolio" /></div>
        </div>
        <p className="mt-2 text-xs text-muted">Compra recalcula o preço médio (método da B3); venda reduz a quantidade e não muda o preço médio.</p>
      </section>

      {h.block === "renda_fixa" && (bench?.data ? <RfBenchmarks points={bench.data.points} /> : <p className="card mb-6 p-4 text-sm text-muted">O comparativo com CDI, IPCA e Ibovespa não pôde ser carregado agora (Banco Central ou Yahoo fora do ar). Tente de novo em instantes.</p>)}

      {h.ticker && !crypto && !isUsStock(h) && (
        <AssetAnalysis ticker={h.ticker} isFii={h.block === "fiis" || isFiiTicker(h.ticker)} marketCap={detail?.marketCap ?? null} brapiPrice={detail?.price ?? null} name={detail?.name ?? null} />
      )}

      {h.ticker && (crypto || isUsStock(h)) && a && (
        <>
          <h2 className="mb-1 mt-2 font-display text-xl font-bold text-gold-soft">Indicadores</h2>
          <p className="mb-3 text-xs text-muted">Fonte: {a.source}. Os selos seguem critérios gerais e fixos e são informativos, não recomendação de investimento.</p>
          {a.notice && <p className="card mb-3 p-4 text-sm text-muted">{a.notice}</p>}
          {a.indicators.length > 0 && <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{a.indicators.map((i) => <IndicatorCard key={i.id} i={i} />)}</section>}
          {(bad.length + warn.length > 0) && (
            <div className="card mt-4 p-4">
              <h3 className="mb-2 font-semibold">Pontos de atenção</h3>
              <ul className="space-y-1.5 text-sm">
                {bad.map((t) => <li key={t} className="flex gap-2"><span className="text-red-400">●</span><span>{t}</span></li>)}
                {warn.map((t) => <li key={t} className="flex gap-2"><span className="text-yellow-300">●</span><span>{t}</span></li>)}
              </ul>
            </div>
          )}
          <p className="mt-4 text-sm">
            {h.ticker === "BTC" && <><Link className="text-gold-soft underline" href="/painel/cripto/onchain">Ver indicadores on-chain do Bitcoin (MVRV, SOPR, detentores…)</Link> · </>}
            {a.coinId && <Link className="text-gold-soft underline" href={`/painel/cripto/ativo/${a.coinId}`}>Ver gráfico e dados do ativo</Link>}
          </p>
        </>
      )}
      <Disclaimer />
    </>
  );
}
