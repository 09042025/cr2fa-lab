import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BLOCKS, rebalance, type BlockKey } from "@/lib/protocol";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { HoldingForm } from "@/components/HoldingForm";
import { DeleteHolding } from "@/components/DeleteHolding";
import { brl, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Holding { id: number; block: BlockKey; label: string; value_cents: number }

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

  const holdings = db().prepare("SELECT id, block, label, value_cents FROM holdings WHERE user_id = ? ORDER BY block, id").all(user.id) as Holding[];
  const current = Object.fromEntries(BLOCKS.map((b) => [b.key, 0])) as Record<BlockKey, number>;
  for (const h of holdings) current[h.block] += h.value_cents;
  const rows = rebalance(current);
  const total = rows.reduce((a, r) => a + r.currentCents, 0);

  return (
    <>
      <PageTitle title="Portfólio" subtitle="Registre suas posições por bloco. A tabela mostra quanto comprar (+) ou vender (−) em cada bloco para voltar aos 20% do Protocolo." />
      <section className="card mb-6 p-4"><h2 className="mb-3 font-semibold">Adicionar posição</h2><HoldingForm /></section>

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

      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Posições</h2>
        {holdings.length === 0 ? <p className="text-sm text-muted">Nenhuma posição registrada.</p> : (
          <table className="data">
            <thead><tr><th>Bloco</th><th>Posição</th><th className="num">Valor</th><th></th></tr></thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id}>
                  <td>{BLOCKS.find((b) => b.key === h.block)?.name}</td>
                  <td>{h.label}</td>
                  <td className="num">{brl(h.value_cents / 100)}</td>
                  <td className="num"><DeleteHolding id={h.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <Disclaimer />
    </>
  );
}
