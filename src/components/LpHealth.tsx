import type { LpResult } from "@/lib/lppositions";
import { pct, usd, usdCompact } from "@/lib/format";

const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 5 });
const LABEL = { ok: ["Saudável", "text-up border-up/50"], attention: ["Atenção: perto da borda", "text-gold-soft border-gold/50"], out: ["Fora da faixa: sem taxas", "text-down border-down/50"] } as const;

/** Lista de posições de uma carteira (somente leitura). Sem botões de transação. */
export function LpHealth({ data }: { data: LpResult }) {
  const all = data.chains.flatMap((c) => c.positions);
  const total = all.reduce((a, p) => a + (p.valueUsd ?? 0), 0);
  const fees = all.reduce((a, p) => a + (p.feesUsd ?? 0), 0);
  const out = all.filter((p) => p.health === "out").length;
  const attention = all.filter((p) => p.health === "attention").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Posições abertas", String(all.length)], ["Valor total", usd(total)], ["Taxas a coletar", usd(fees)], ["Atenção / fora da faixa", `${attention} / ${out}`]].map(([l, v]) => (
          <div key={l} className="card p-3"><p className="text-xs text-muted">{l}</p><p className="text-lg font-semibold">{v}</p></div>
        ))}
      </div>
      {data.chains.some((c) => c.error) && <p className="text-xs text-gold-soft">Algumas redes não responderam agora: {data.chains.filter((c) => c.error).map((c) => c.chain).join(", ")}. Tente de novo em instantes.</p>}
      {all.length === 0 && <p className="text-sm text-muted">Nenhuma posição de liquidez aberta na Uniswap v3 (Ethereum, Base, Arbitrum, Polygon e Optimism) para este endereço.</p>}
      {all.map((p) => {
        const [label, cls] = LABEL[p.health];
        return (
          <article key={`${p.chain}-${p.tokenId}`} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{p.pair} <span className="ml-1 rounded border border-line px-1 text-xs text-muted">{p.fee / 10000}%</span></h3>
                <p className="text-xs text-muted">Uniswap v3 · {p.chain} · #{p.tokenId}</p>
              </div>
              <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
            </div>
            <div className="my-3">
              <div className="relative h-2 rounded bg-line">
                <div className="absolute inset-y-0 rounded bg-gold/40" style={{ left: "0%", width: "100%" }} />
                <div className="absolute -top-1 h-4 w-1 rounded bg-white" style={{ left: `${Math.min(100, Math.max(0, p.pos * 100))}%` }} title="Preço atual dentro da faixa" />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted"><span>Mín. {sig(p.priceLower)}</span><span>Atual {sig(p.price)} {p.symbol1}/{p.symbol0}</span><span>Máx. {sig(p.priceUpper)}</span></div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted">Valor da posição</dt><dd className="font-semibold">{p.valueUsd === null ? "—" : usd(p.valueUsd)}</dd><dd className="text-xs text-muted">{sig(p.amount0)} {p.symbol0} + {sig(p.amount1)} {p.symbol1}</dd></div>
              <div><dt className="text-xs text-muted">Taxas a coletar</dt><dd className="font-semibold text-up">{p.feesUsd === null ? "—" : usd(p.feesUsd)}</dd><dd className="text-xs text-muted">{sig(p.fees0)} {p.symbol0} + {sig(p.fees1)} {p.symbol1}</dd></div>
              <div><dt className="text-xs text-muted">Ganho estimado/dia</dt><dd className="font-semibold">{p.estDayUsd === null ? "—" : usd(p.estDayUsd)}</dd><dd className="text-xs text-muted">APR estimado {p.estApr === null ? "—" : pct(p.estApr)}</dd></div>
              <div><dt className="text-xs text-muted">Pool</dt><dd className="font-semibold">{p.poolTvlUsd === null ? "—" : usdCompact(p.poolTvlUsd)}</dd><dd className="text-xs text-muted">APR do pool {p.poolApr === null ? "—" : pct(p.poolApr)}</dd></div>
            </dl>
            <p className="mt-3 text-xs"><a className="text-gold-soft hover:underline" href={p.link} target="_blank" rel="noopener noreferrer nofollow">Ver esta posição na Uniswap (só visualização) ↗</a></p>
          </article>
        );
      })}
    </div>
  );
}
