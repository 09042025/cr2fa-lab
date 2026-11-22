import { BLOCKS, DOLLAR_TARGET_PCT, blockDollarShare } from "@/lib/protocol";

/** Explica a regra de dolarização do Protocolo: quanto de cada bloco conta como dólar e por quê. */
const RULES: Record<string, { name: string; rule: string }> = {
  cripto: { name: "Criptomoedas", rule: "O bloco inteiro conta como dólar (Bitcoin, Ethereum e stablecoins)." },
  acoes: { name: "Ações", rule: "Metade do bloco no exterior: ações dos EUA, BDRs ou ETFs internacionais." },
  renda_fixa: { name: "Renda fixa", rule: "Metade do bloco em dólar: Treasuries, T-bills ou fundos de renda fixa em dólar." },
  oportunidades: { name: "Reserva para oportunidades", rule: "Metade da reserva em dólar ou stablecoins: USDC, T-bills de curto prazo ou stablecoins rendendo (earn) em fintechs." },
};

export function DollarRule() {
  const rows = BLOCKS.filter((b) => blockDollarShare(b) > 0).map((b) => ({ ...RULES[b.key], color: b.color, ofBlock: blockDollarShare(b), ofPortfolio: (b.pct * blockDollarShare(b)) / 100 }));
  return (
    <section className="card mb-6 border-gold/50 p-4" id="dolarizacao">
      <h2 className="font-semibold text-gold-soft">Dolarização: meta de {DOLLAR_TARGET_PCT}% da carteira em dólar</h2>
      <p className="mt-1 text-sm text-muted">
        O objetivo é se proteger de ficar muito exposto a uma única moeda. Por isso o Protocolo mede quanto da carteira está dolarizada e compara com a meta. O Portfólio mostra esse
        número logo abaixo da reserva para oportunidades.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="data fit">
          <thead><tr><th>Bloco</th><th className="num">Em dólar (do bloco)</th><th className="num">Da carteira</th><th>O que conta</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />{r.name}</td>
                <td className="num">{r.ofBlock}%</td>
                <td className="num">{r.ofPortfolio}%</td>
                <td className="text-muted">{r.rule}</td>
              </tr>
            ))}
            <tr className="font-semibold"><td>Total</td><td className="num" /><td className="num text-gold-soft">{DOLLAR_TARGET_PCT}%</td><td className="text-muted">Fundos imobiliários ficam em reais.</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Como o app reconhece: ações pelo código (EUA, BDR final 32 a 39 ou ETF internacional); renda fixa e reserva pelo nome da posição, então escreva “dólar”, “USD” ou “Treasury” (na reserva, também vale o código da stablecoin, como USDC, ou “earn” no nome).
      </p>
    </section>
  );
}
