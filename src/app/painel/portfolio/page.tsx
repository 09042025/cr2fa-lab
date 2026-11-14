import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BLOCKS, rebalance, type BlockKey } from "@/lib/protocol";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { PortfolioEntry } from "@/components/PortfolioEntry";
import { PositionsTable } from "@/components/PositionsTable";
import { EvolutionChart, IncomeByMonth, ProtocolDashboard } from "@/components/PortfolioCharts";
import { getQuote, type Quote } from "@/lib/dividends";
import { evolution, lastMonths, monthlyIncome } from "@/lib/portfolio-calc";
import { brl, pct } from "@/lib/format";


export const dynamic = "force-dynamic";

interface Holding { id: number; block: BlockKey; label: string; value_cents: number; source: string; ticker: string | null; qty: number | null; avg_price: number | null }

export default async function PortfolioPage() {
  const user = await requireUser();
  if (user.plan !== "pro") {
    return (
      <>
        <PageTitle title="Portfólio" subtitle="Registre suas posições e veja quanto comprar ou vender em cada bloco para voltar aos 20%." />
        <Locked feature="Portfólio com rebalanceamento pelo Protocolo CR2FA" />
      </>
    );
  }

  const holdings = db().prepare("SELECT id, block, label, value_cents, source, ticker, qty, avg_price FROM holdings WHERE user_id = ? ORDER BY block, id").all(user.id) as Holding[];
  const today = new Date().toISOString().slice(0, 10);
  const tracked = holdings.filter((h) => h.ticker && h.qty && h.qty > 0);
  const quotes = new Map<string, Quote | null>();
  await Promise.all([...new Set(tracked.map((h) => h.ticker as string))].map(async (t) => { quotes.set(t, (await getQuote(t)).data); }));
  /** Valor atual em centavos: quantidade × cotação quando há cotação; senão o último valor salvo. */
  const valueOf = (h: Holding) => {
    const px = h.ticker ? quotes.get(h.ticker)?.price : null;
    return px && h.qty ? Math.round(px * h.qty * 100) : h.value_cents;
  };
  const current = Object.fromEntries(BLOCKS.map((b) => [b.key, 0])) as Record<BlockKey, number>;
  for (const h of holdings) current[h.block] += valueOf(h);
  const rows = rebalance(current);
  const total = rows.reduce((a, r) => a + r.currentCents, 0);

  const income = monthlyIncome(tracked.map((h) => ({ ticker: h.ticker as string, qty: h.qty as number, dividends: quotes.get(h.ticker as string)?.dividends ?? [] })), today);
    const fixed = holdings.filter((h) => !(h.ticker && h.qty && h.qty > 0)).reduce((a, h) => a + h.value_cents, 0) / 100;
  const evo = tracked.length ? evolution(tracked.map((h) => ({ qty: h.qty as number, monthly: quotes.get(h.ticker as string)?.monthly ?? [] })), fixed, lastMonths(today, 60)).filter((e) => e.ok).map((e) => ({ m: e.m, value: e.value })) : [];
  const invested = tracked.reduce((a, h) => a + (h.avg_price ? h.avg_price * (h.qty as number) : 0), 0);
  const marketValue = tracked.reduce((a, h) => a + valueOf(h) / 100, 0);

  return (
    <>
      <PageTitle title="Portfólio" subtitle="Importe sua posição da B3 ou preencha manualmente, por bloco. A tabela mostra quanto comprar (+) ou vender (−) em cada bloco para voltar aos 20% do Protocolo." />
      <PortfolioEntry startOnB3={holdings.length === 0} />

      <ProtocolDashboard totalCents={total} slices={rows.map((r) => ({ key: r.block.key, name: r.block.name, color: r.block.color, value: r.currentCents / 100, target: r.block.pct }))} />

      <section className="card mb-6 p-4">
        <h2 className="mb-1 font-semibold">Rebalanceamento</h2>
        <p className="mb-3 text-sm text-muted">Patrimônio nos blocos: <strong className="text-white">{brl(total / 100)}</strong> (a reserva de emergência não entra aqui).</p>
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>Bloco</th><th className="num">Atual</th><th className="num">% atual</th><th className="num">Alvo (20%)</th><th className="num">Ajuste</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.block.key}>
                  <td><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: r.block.color }} />{r.block.name}</td>
                  <td className="num">{brl(r.currentCents / 100)}</td>
                  <td className="num">{pct(r.currentPct, 1)}</td>
                  <td className="num">{brl(r.targetCents / 100)}</td>
                  <td className={`num font-semibold ${r.diffCents > 0 ? "text-up" : r.diffCents < 0 ? "text-down" : ""}`}>
                    {r.diffCents > 0 ? "Comprar " : r.diffCents < 0 ? "Vender " : ""}{brl(Math.abs(r.diffCents) / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">Antes de vender, considere impostos e custos da operação.</p>
      </section>

      {tracked.length > 0 && (
        <>
          <IncomeByMonth months={income.map((m) => ({ month: m.month, total: m.total, items: m.items }))} />

          <section className="card mb-6 p-4">
            <h2 className="mb-1 font-semibold">Evolução da carteira</h2>
            <p className="mb-3 text-sm text-muted">
              Valor de mercado de hoje: <strong className="text-white">{brl(marketValue)}</strong>
              {invested > 0 && <> · Custo (preço médio): <strong className="text-white">{brl(invested)}</strong> · Resultado: <strong className={marketValue >= invested ? "text-up" : "text-down"}>{pct(((marketValue - invested) / invested) * 100, 1)}</strong></>}
            </p>
            <EvolutionChart points={evo} marketValue={marketValue} invested={invested} />
            <p className="mt-2 text-xs text-muted">Mostra como a carteira de hoje (mesmas quantidades) se comportou, com fechamento mensal das cotações. Passe o mouse (ou o dedo) sobre o gráfico para ver cada mês; o período máximo é o histórico que temos (até 5 anos). Posições sem código entram com o valor informado.</p>
          </section>
        </>
      )}

      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Posições</h2>
        <p className="mb-3 text-xs text-muted">Preço médio no método da B3: a compra recalcula a média ponderada; a venda reduz a quantidade e não muda o preço médio. Clique em uma linha para ver as opções: compra, venda, ajustar ou remover.</p>
        {holdings.length === 0 ? <p className="text-sm text-muted">Nenhuma posição registrada.</p> : (
          <PositionsTable rows={holdings.map((h) => {
            const px = h.ticker ? quotes.get(h.ticker)?.price ?? null : null;
            const res = px && h.avg_price ? ((px - h.avg_price) / h.avg_price) * 100 : null;
            return {
              id: h.id, block: BLOCKS.find((b) => b.key === h.block)?.name ?? "", label: h.label, b3: h.source === "b3", canTrade: !!(h.ticker && h.qty),
              qty: h.qty ? h.qty.toLocaleString("pt-BR") : "—", avg: h.avg_price ? brl(h.avg_price) : null, needsAvg: !!h.ticker,
              price: px ? brl(px) : "—", result: res === null ? "—" : pct(res, 1), resultTone: res === null ? "none" as const : res >= 0 ? "up" as const : "down" as const,
              value: brl(valueOf(h) / 100),
            };
          })} />
        )}
      </section>
      <Disclaimer />
    </>
  );
}
