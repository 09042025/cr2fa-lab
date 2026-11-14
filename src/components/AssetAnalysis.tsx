import { analyzeFii, analyzeStock, attentionPoints, type Indicator, type Status } from "@/lib/indicators";
import { companyByName, companyOf, getCvmData, getFiiData } from "@/lib/cvm";
import { getQuote, monthCalendar, monthsPaid, nextEstimate, sumBetween } from "@/lib/dividends";
import { brl } from "@/lib/format";

const BADGE: Record<Status, { text: string; cls: string }> = {
  bom: { text: "Bom", cls: "border-green-500/40 bg-green-500/10 text-green-400" },
  atencao: { text: "Atenção", cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" },
  ruim: { text: "Ruim", cls: "border-red-500/40 bg-red-500/10 text-red-400" },
  nd: { text: "Informativo", cls: "border-line bg-panel-2 text-muted" },
};

const brDate = (s: string) => s.split("-").reverse().join("/");

function IndicatorCard({ i }: { i: Indicator }) {
  const b = BADGE[i.status];
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">{i.label}</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${b.cls}`}>{b.text}</span>
      </div>
      <p className="mt-1 text-lg font-semibold">{i.display}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted">{i.hint}</p>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="card break-words p-4 text-sm text-muted">{children}</p>;
}

export async function AssetAnalysis({ ticker, isFii, marketCap, brapiPrice, name }: { ticker: string; isFii: boolean; name?: string | null; marketCap: number | null; brapiPrice: number | null }) {
  const today = new Date().toISOString().slice(0, 10);
  const q = await getQuote(ticker);
  const quote = q.data;
  const price = quote?.price ?? brapiPrice;
  const from12 = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const from24 = new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10);
  const div12 = quote ? sumBetween(quote.dividends, from12, today) : null;
  const div12Prev = quote ? sumBetween(quote.dividends, from24, from12) : null;

  let indicators: Indicator[] = [];
  let period: string | null = null;
  let notice: string | null = null;
  let source = "";

  if (isFii) {
    const fii = getFiiData();
    const rec = fii.data?.byPrefix[ticker.slice(0, 4)] ?? null;
    indicators = analyzeFii({
      price, dividends12m: quote ? div12 : null, vpa: rec?.vpa ?? null, patrimonio: rec?.patrimonio ?? null, cotistas: rec?.cotistas ?? null,
      taxaAdm: rec?.taxaAdm ?? null, div12mPrev: div12Prev, monthsPaid: quote ? monthsPaid(quote.dividends, today) : 0, avgDailyVolume: quote?.avgDailyVolume ?? null,
    });
    period = rec?.date ?? null;
    source = "Informe mensal de FII da CVM (dados abertos), proventos e cotação da Yahoo Finance";
    if (!fii.data) notice = fii.loading ? "Estamos baixando o informe mensal da CVM (patrimônio, valor patrimonial, cotistas). Volte em alguns minutos." : `Informe mensal da CVM indisponível agora${fii.error ? ` (${fii.error})` : ""}. Mostramos só o que vem dos proventos e da cotação.`;
    else if (!rec) notice = "Não encontramos este fundo no informe mensal da CVM; P/VP, patrimônio e cotistas ficam sem valor.";
  } else {
    const cvm = getCvmData();
    const found = cvm.data ? (companyOf(cvm.data, ticker) ?? (name ? companyByName(cvm.data, name) : null)) : null;
    if (found) {
      const a = analyzeStock({ rows: found.company.rows, bank: found.company.bank, price, marketCap, dividends12m: quote ? div12 : null });
      indicators = a.indicators;
      period = a.period;
      if (!a.indicators.length) notice = `Encontramos a empresa na CVM (${found.company.name}), mas não conseguimos ler o lucro consolidado dela. Contas lidas: ${[...new Set(found.company.rows.map((r) => r.k))].join(", ") || "nenhuma"}.`;
    } else if (!cvm.data) {
      notice = cvm.loading ? "Estamos baixando as demonstrações financeiras da CVM (leva alguns minutos na primeira vez). Volte em alguns minutos." : `Demonstrações da CVM indisponíveis agora${cvm.error ? ` (${cvm.error})` : ""}. Tentaremos de novo automaticamente.`;
    } else notice = "Não encontramos este ticker nos dados abertos da CVM (empresa sem demonstrações consolidadas ou ticker novo)." + (cvm.data.diag ? ` [diagnóstico: ${cvm.data.diag}]` : "");
    source = "Demonstrações financeiras ITR/DFP da CVM (dados abertos), proventos e cotação da Yahoo Finance";
  }

  const { bad, warn } = attentionPoints(indicators);
  const cal = quote ? monthCalendar(quote.dividends, today) : null;
  const next = quote ? nextEstimate(quote.dividends, today) : null;
  const recent = quote ? [...quote.dividends].reverse().slice(0, 12) : [];

  return (
    <>
      <h2 className="mb-1 mt-8 font-display text-xl font-bold text-gold-soft">Indicadores</h2>
      <p className="mb-3 text-xs text-muted">
        {period ? `Último resultado considerado: ${brDate(period)}. ` : ""}Fonte: {source}. Os selos seguem critérios gerais e fixos (não consideram o setor em detalhe) e são informativos, não recomendação de investimento.
      </p>
      {notice && <div className="mb-3"><Notice>{notice}</Notice></div>}
      {indicators.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {indicators.map((i) => <IndicatorCard key={i.id} i={i} />)}
        </section>
      )}

      {indicators.length > 0 && (
        <div className="card mt-4 p-4">
          <h3 className="mb-2 font-semibold">Pontos de atenção</h3>
          {bad.length + warn.length === 0 ? (
            <p className="text-sm text-muted">Nenhum indicador fora da faixa nos critérios usados. Isso não garante bons resultados futuros.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {bad.map((t) => <li key={t} className="flex gap-2"><span className="text-red-400">●</span><span>{t}</span></li>)}
              {warn.map((t) => <li key={t} className="flex gap-2"><span className="text-yellow-300">●</span><span>{t}</span></li>)}
            </ul>
          )}
        </div>
      )}

      <h2 className="mb-3 mt-8 font-display text-xl font-bold text-gold-soft">Calendário de proventos</h2>
      {!quote ? (
        <Notice>Calendário indisponível agora{q.error ? ` (${q.error})` : ""}. Tente de novo em alguns minutos.</Notice>
      ) : quote.dividends.length === 0 ? (
        <Notice>Sem proventos registrados para este ativo nos últimos 5 anos.</Notice>
      ) : (
        <>
          {next && (
            <div className="card mb-3 p-4 text-sm">
              <p><span className="text-muted">Próxima data com (estimativa, {next.basis}):</span> <strong>{brDate(next.date)}</strong> · valor parecido com o último ({brl(next.value)} por {isFii ? "cota" : "ação"}).</p>
              <p className="mt-1 text-xs text-muted">Estimativa pelo padrão dos últimos proventos. Datas e valores reais são divulgados pela empresa/gestora em fato relevante ou comunicado.</p>
            </div>
          )}
          {cal && (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {cal.map((m) => (
                <div key={m.month} className={`rounded-lg border p-2 text-center text-xs ${m.items.length ? "border-gold/50 bg-gold/10" : "border-line bg-panel-2 text-muted"}`}>
                  <p className="font-semibold">{m.label}</p>
                  {m.items.length ? m.items.map((x) => <p key={x.date}>{x.date.slice(8)}/{x.date.slice(5, 7)} · {brl(x.value)}</p>) : <p>—</p>}
                </div>
              ))}
            </div>
          )}
          <div className="card overflow-x-auto p-4">
            <table className="data">
              <thead><tr><th>Data com (ex)</th><th className="num">Valor por {isFii ? "cota" : "ação"}</th></tr></thead>
              <tbody>{recent.map((x) => <tr key={x.date}><td>{brDate(x.date)}</td><td className="num">{brl(x.value)}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">Os últimos 12 meses aparecem no calendário por mês. Datas pela data com/ex (a fonte aberta não traz a data de pagamento).</p>
        </>
      )}
    </>
  );
}
