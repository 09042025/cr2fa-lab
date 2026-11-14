import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BLOCKS, rebalance, type BlockKey } from "@/lib/protocol";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { PortfolioEntry } from "@/components/PortfolioEntry";
import { DeleteHolding } from "@/components/DeleteHolding";
import { HoldingActions } from "@/components/HoldingActions";
import { LineChart } from "@/components/LineChart";
import { getQuote, type Quote } from "@/lib/dividends";
import { evolution, lastMonths, monthlyIncome } from "@/lib/portfolio-calc";
import { brl, pct } from "@/lib/format";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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
  const income12 = income.reduce((a, m) => a + m.total, 0);
  const maxIncome = Math.max(...income.map((m) => m.total), 1);
  const fixed = holdings.filter((h) => !(h.ticker && h.qty && h.qty > 0)).reduce((a, h) => a + h.value_cents, 0) / 100;
  const evo = tracked.length ? evolution(tracked.map((h) => ({ qty: h.qty as number, monthly: quotes.get(h.ticker as string)?.monthly ?? [] })), fixed, lastMonths(today, 12)) : [];
  const evoOk = evo.filter((e) => e.ok);
  const invested = tracked.reduce((a, h) => a + (h.avg_price ? h.avg_price * (h.qty as number) : 0), 0);
  const marketValue = tracked.reduce((a, h) => a + valueOf(h) / 100, 0);

  return (
    <>
      <PageTitle title="Portfólio" subtitle="Importe sua posição da B3 ou preencha manualmente, por bloco. A tabela mostra quanto comprar (+) ou vender (−) em cada bloco para voltar aos 20% do Protocolo." />
      <PortfolioEntry startOnB3={holdings.length === 0} />

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
          <section className="card mb-6 p-4">
            <h2 className="mb-1 font-semibold">Dividendos por mês</h2>
            <p className="mb-3 text-sm text-muted">
              Projeção para os próximos 12 meses: repete o que cada ativo pagou nos últimos 12 meses, multiplicado pela quantidade que você tem hoje. Total estimado: <strong className="text-white">{brl(income12)}</strong> (média de {brl(income12 / 12)} por mês).
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {income.map((m) => (
                <div key={m.month} className="rounded-lg border border-line bg-panel-2 p-2 text-center text-xs">
                  <p className="font-semibold">{MONTHS[Number(m.month.slice(5)) - 1]}/{m.month.slice(2, 4)}</p>
                  <div className="mx-auto my-1 flex h-10 items-end"><div className="w-6 rounded-t bg-gold/70" style={{ height: `${Math.max(m.total ? 8 : 2, (m.total / maxIncome) * 40)}px` }} /></div>
                  <p>{m.total ? brl(m.total) : "—"}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Estimativa baseada no histórico, não é promessa de pagamento. Considera só ações e FIIs com código e quantidade informados.</p>
          </section>

          <section className="card mb-6 p-4">
            <h2 className="mb-1 font-semibold">Evolução da carteira</h2>
            <p className="mb-3 text-sm text-muted">
              Valor de mercado de hoje: <strong className="text-white">{brl(marketValue)}</strong>
              {invested > 0 && <> · Custo (preço médio): <strong className="text-white">{brl(invested)}</strong> · Resultado: <strong className={marketValue >= invested ? "text-up" : "text-down"}>{pct(((marketValue - invested) / invested) * 100, 1)}</strong></>}
            </p>
            {evoOk.length >= 2 ? <LineChart points={evoOk.map((e) => e.value)} color="auto" format={(v) => brl(v)} /> : <p className="text-sm text-muted">Histórico de preços indisponível agora.</p>}
            <p className="mt-2 text-xs text-muted">Mostra como a carteira de hoje (mesmas quantidades) se comportou nos últimos 12 meses, com fechamento mensal das cotações. Posições sem código entram com o valor informado.</p>
          </section>
        </>
      )}

      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Posições</h2>
        <p className="mb-3 text-xs text-muted">Preço médio no método da B3: a compra recalcula a média ponderada; a venda reduz a quantidade e não muda o preço médio. Use “compra”, “venda” ou “ajustar” em cada linha.</p>
        {holdings.length === 0 ? <p className="text-sm text-muted">Nenhuma posição registrada.</p> : (
          <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>Bloco</th><th>Posição</th><th className="num">Qtd.</th><th className="num">Preço médio</th><th className="num">Preço atual</th><th className="num">Resultado</th><th className="num">Valor</th><th></th></tr></thead>
            <tbody>
              {holdings.map((h) => {
                const px = h.ticker ? quotes.get(h.ticker)?.price ?? null : null;
                const res = px && h.avg_price ? ((px - h.avg_price) / h.avg_price) * 100 : null;
                return (
                  <tr key={h.id}>
                    <td>{BLOCKS.find((b) => b.key === h.block)?.name}</td>
                    <td>{h.label}{h.source === "b3" && <span className="ml-2 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold-soft">B3</span>}</td>
                    <td className="num">{h.qty ? h.qty.toLocaleString("pt-BR") : "—"}</td>
                    <td className="num">{h.avg_price ? brl(h.avg_price) : h.ticker ? <span className="text-xs text-muted">informe em “ajustar”</span> : "—"}</td>
                    <td className="num">{px ? brl(px) : "—"}</td>
                    <td className={`num ${res === null ? "" : res >= 0 ? "text-up" : "text-down"}`}>{res === null ? "—" : pct(res, 1)}</td>
                    <td className="num">{brl(valueOf(h) / 100)}</td>
                    <td className="num">{h.ticker && h.qty ? <HoldingActions id={h.id} /> : null}<DeleteHolding id={h.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </section>
      <Disclaimer />
    </>
  );
}
