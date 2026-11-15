import { attentionPoints, type Indicator, type Status } from "@/lib/indicators";
import { assessStockOrFii } from "@/lib/assess";
import { monthCalendar, nextEstimate } from "@/lib/dividends";
import { brl } from "@/lib/format";

const BADGE: Record<Status, { text: string; cls: string }> = {
  bom: { text: "Bom", cls: "border-green-500/40 bg-green-500/10 text-green-400" },
  atencao: { text: "Atenção", cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" },
  ruim: { text: "Ruim", cls: "border-red-500/40 bg-red-500/10 text-red-400" },
  nd: { text: "Informativo", cls: "border-line bg-panel-2 text-muted" },
};

const brDate = (s: string) => s.split("-").reverse().join("/");

export function IndicatorCard({ i }: { i: Indicator }) {
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
  const a = await assessStockOrFii(ticker, isFii, { name, marketCap, price: brapiPrice });
  const { indicators, period, notice, source, quote } = a;
  const q = { error: a.quoteError };
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
