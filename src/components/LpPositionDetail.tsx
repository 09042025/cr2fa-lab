import type { LpDetail } from "@/lib/lpdetail";
import { LpCharts } from "./LpCharts";
import { LiquidityView } from "./LiquidityView";
import { pct, usd, usdCompact } from "@/lib/format";

const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 6 });
const tok = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 8 });
const date = (t: number) => new Date(t * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const tone = (v: number) => (v >= 0 ? "text-up" : "text-down");
const sgn = (v: number) => `${v >= 0 ? "+" : "−"}${usd(Math.abs(v))}`;
const HEALTH = { ok: ["Dentro da faixa", "text-up border-up/50"], attention: ["Atenção: perto da borda", "text-gold-soft border-gold/50"], out: ["Fora da faixa", "text-down border-down/50"] } as const;

function Table({ title, rows }: { title: string; rows: [string, React.ReactNode, React.ReactNode?][] }) {
  return (
    <section className="card p-4">
      <h3 className="mb-2 font-semibold text-gold-soft">{title}</h3>
      <dl className="divide-y divide-line text-sm">
        {rows.map(([k, v, sub]) => (
          <div key={k} className="flex items-start justify-between gap-3 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}{sub ? <div className="text-xs font-normal text-muted">{sub}</div> : null}</dd></div>
        ))}
      </dl>
    </section>
  );
}


/** Análise completa de uma posição, aberta na própria tela (sem cliques). */
export function LpPositionDetail({ d }: { d: LpDetail }) {
  const { position: p, perf, dist } = d;
  const [hl, hc] = HEALTH[p.health];
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[
          ["Valor da posição", p.valueUsd === null ? "—" : usd(p.valueUsd), ""],
          ["PnL total", perf ? sgn(perf.pnlUsd) : "—", perf ? tone(perf.pnlUsd) : ""],
          ["ROI", perf ? pct(perf.roi * 100) : "—", perf ? tone(perf.roi) : ""],
          ["APR médio", perf ? pct(perf.apr * 100) : "—", perf ? tone(perf.apr) : ""],
          ["Taxas a coletar", p.feesUsd === null ? "—" : usd(p.feesUsd), "text-up"],
          ["Situação", hl, hc.split(" ")[0]],
        ].map(([l, v, c]) => <div key={l} className="card p-3"><p className="text-xs text-muted">{l}</p><p className={`text-lg font-semibold ${c}`}>{v}</p></div>)}
      </div>
      {!d.eventsOk && <p className="mb-3 text-xs text-gold-soft">Não consegui ler o histórico de depósitos desta posição agora (nó público indisponível). PnL, ROI e gráfico de valor aparecem quando o histórico responder. Tente de novo em instantes.{d.eventsError ? ` (detalhe técnico: ${d.eventsError})` : ""}</p>}
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <LpCharts series={d.series} chart={d.chart} history={d.history.map((h) => ({ t: h.t, apy: h.apy, tvl: h.tvl }))} />
          <section className="card p-4">
            <h3 className="mb-2 font-semibold text-gold-soft">Distribuição de liquidez</h3>
            {dist ? <LiquidityView bins={dist.bins} center={dist.center} lo={dist.lo} hi={dist.hi} price={dist.center} min={p.priceLower} max={p.priceUpper} fmt={sig} /> : <p className="text-sm text-muted">Distribuição indisponível para este pool agora.{d.distError ? ` (detalhe técnico: ${d.distError})` : ""}</p>}
          </section>
        </div>
        <div className="space-y-4">
          {perf && (
            <Table title="Desempenho (referência HOLD)" rows={[
              ["PnL do pool", <span key="a" className={tone(perf.pnlUsd)}>{sgn(perf.pnlUsd)}</span>, "taxas + variação do valor, sem gás"],
              ["ROI", <span key="b" className={tone(perf.roi)}>{pct(perf.roi * 100)}</span>],
              ["APR médio", <span key="c" className={tone(perf.apr)}>{pct(perf.apr * 100)}</span>],
              ["APR só de taxas", pct(perf.feeApr * 100)],
              ["Perda de divergência", <span key="d" className={tone(perf.divergenceUsd)}>{sgn(perf.divergenceUsd)}</span>, "valor atual − o que seria só segurar"],
            ]} />
          )}
          {perf && (
            <Table title="Taxas" rows={[
              ["Total de taxas", usd(perf.totalFeesUsd)],
              ["A coletar", <span key="e" className="text-up">{usd(perf.uncollectedUsd)}</span>, `${tok(p.fees0)} ${p.symbol0} + ${tok(p.fees1)} ${p.symbol1}`],
              ["Já coletadas", usd(perf.collectedUsd), `${tok(perf.collected0)} ${p.symbol0} + ${tok(perf.collected1)} ${p.symbol1}`],
              ["Média por dia", usd(perf.avgDailyFeesUsd)],
            ]} />
          )}
          <Table title="Ativos e faixa" rows={[
            ["Preço atual", `${sig(p.price)} ${p.symbol1}/${p.symbol0}`],
            ["Faixa", `${sig(p.priceLower)} ↔ ${sig(p.priceUpper)}`, <span key="f" className={hc.split(" ")[0]}>{hl}</span>],
            ["Ativos atuais", p.valueUsd === null ? "—" : usd(p.valueUsd), `${tok(p.amount0)} ${p.symbol0} + ${tok(p.amount1)} ${p.symbol1}`],
            ...(perf ? [
              ["Ativos investidos", usd(perf.investedUsd), `${tok(perf.invested0)} ${p.symbol0} + ${tok(perf.invested1)} ${p.symbol1}`] as [string, React.ReactNode, React.ReactNode],
              ["Diferença", <span key="g" className={tone(perf.diff0 * (p.usd0 ?? 0) + perf.diff1 * (p.usd1 ?? 0))}>{tok(perf.diff0)} {p.symbol0} / {tok(perf.diff1)} {p.symbol1}</span>] as [string, React.ReactNode],
            ] : []),
          ]} />
          <Table title="Pool e posição" rows={[
            ...(perf ? [["Idade da posição", `${perf.ageDays.toFixed(1).replace(".", ",")} dias`, `aberta em ${date(perf.openedAt)}`] as [string, React.ReactNode, React.ReactNode]] : []),
            ["NFT", <a key="h" className="text-gold-soft hover:underline" href={p.link} target="_blank" rel="noopener noreferrer nofollow">#{p.tokenId} ↗</a>],
            ["Liquidez do pool", p.poolTvlUsd === null ? "—" : usdCompact(p.poolTvlUsd)],
            ["APR do pool", p.poolApr === null ? "—" : pct(p.poolApr)],
            ["Ganho estimado/dia", p.estDayUsd === null ? "—" : usd(p.estDayUsd), p.estApr === null ? undefined : `APR estimado ${pct(p.estApr)}`],
          ]} />
        </div>
      </div>
    </>
  );
}
