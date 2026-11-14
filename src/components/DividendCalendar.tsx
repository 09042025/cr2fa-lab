import Link from "next/link";
import { getFiis, getStocks, type Quote } from "@/lib/market";
import { getQuote } from "@/lib/dividends";
import { Locked } from "@/components/ui";
import { brl, pct } from "@/lib/format";
import { shortName } from "@/lib/names";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MAX_ALL = 40;
const MAX_SECTOR = 60;

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

export async function DividendCalendar({ fii, isPro, setor, mes }: { fii: boolean; isPro: boolean; setor?: string; mes?: string }) {
  const sp = { setor, mes };
  const path = fii ? "/painel/fiis" : "/painel/acoes";
  if (!isPro) {
    return (
      <Locked
        feature="Calendário de dividendos"
        text={`Veja em quais meses ${fii ? "cada fundo imobiliário" : "cada ação"} costuma pagar proventos, com filtro por ${fii ? "segmento" : "setor"} e por mês. Recurso exclusivo do plano Premium.`}
      />
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const month = Math.min(12, Math.max(1, Number(sp.mes) || Number(today.slice(5, 7))));
  const mm = String(month).padStart(2, "0");
  const list = await (fii ? getFiis() : getStocks());
  const all = list.data ?? [];
  const sectors = [...new Set(all.map((q) => q.sector))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const bySector = sp.setor ? all.filter((q) => q.sector === sp.setor) : all;
  const limit = sp.setor ? MAX_SECTOR : MAX_ALL;
  const picked = [...bySector].sort((a, b) => (b.volume ?? 0) * (b.price ?? 0) - (a.volume ?? 0) * (a.price ?? 0)).slice(0, limit);
  const quotes = await pool(picked, 8, async (q: Quote) => ({ q, d: (await getQuote(q.symbol)).data }));
  const from = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const items = quotes
    .flatMap(({ q, d }) => (d?.dividends ?? []).filter((x) => x.date > from && x.date <= today && x.date.slice(5, 7) === mm).map((x) => ({ q, ...x, price: d?.price ?? q.price })))
    .sort((a, b) => a.date.localeCompare(b.date));
  const failed = quotes.filter((x) => !x.d).length;
  const base = (over: Record<string, string>) => {
    const p = new URLSearchParams({ aba: "calendario", mes: String(month), ...(sp.setor ? { setor: sp.setor } : {}), ...over });
    return `${path}?${p.toString()}`;
  };

  return (
    <>
      <form method="get" className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <input type="hidden" name="aba" value="calendario" />
        <div>
          <label className="label" htmlFor="setor">{fii ? "Filtrar por segmento" : "Filtrar por setor"}</label>
          <select id="setor" name="setor" defaultValue={sp.setor || ""} className="input">
            <option value="">Todos</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="mes">Mês</label>
          <select id="mes" name="mes" defaultValue={String(month)} className="input">{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
        </div>
        <button className="btn btn-gold">Filtrar</button>
      </form>
      <div className="mb-4 grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
        {MONTHS.map((m, i) => (
          <Link key={m} href={base({ mes: String(i + 1) })} className={`rounded-lg border px-2 py-1.5 text-center text-xs ${i + 1 === month ? "border-gold bg-gold/10 text-gold-soft" : "border-line bg-panel-2 text-muted"}`}>{m.slice(0, 3)}</Link>
        ))}
      </div>
      {!list.data ? <p className="card p-4 text-sm text-muted">Lista de ativos indisponível agora. Tente de novo em instantes.</p> : (
        <section className="card p-4">
          <h2 className="mb-1 font-semibold">{MONTHS[month - 1]}: {items.length} provento(s){sp.setor ? ` em ${sp.setor}` : ""}</h2>
          <p className="mb-3 text-xs text-muted">Analisamos os {picked.length} {fii ? "fundos" : "ativos"} de maior negociação{sp.setor ? " do filtro" : ""}{bySector.length > picked.length ? ` (de ${bySector.length}; filtre por ${fii ? "segmento" : "setor"} para ver outros)` : ""}.{failed ? ` ${failed} sem dados agora.` : ""}</p>
          {items.length === 0 ? <p className="text-sm text-muted">Nenhum provento neste mês nos últimos 12 meses para esta seleção.</p> : (
            <table className="data w-full table-fixed text-xs [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:text-[10px]">
              <thead><tr><th className="w-[22%] sm:w-[14%]">Data com</th><th className="w-[38%] sm:w-[34%]">Ativo</th><th className="hidden w-[24%] sm:table-cell">{fii ? "Segmento" : "Setor"}</th><th className="num w-[20%] sm:w-[14%]">{fii ? "Cota" : "Ação"} (R$)</th><th className="num w-[20%] sm:w-[14%]">% preço</th></tr></thead>
              <tbody>
                {items.map((x) => (
                  <tr key={`${x.q.symbol}-${x.date}`}>
                    <td>{x.date.split("-").reverse().join("/")}</td>
                    <td className="truncate" title={x.q.name}><Link className="font-semibold text-gold-soft underline" href={`/painel/ativo/${x.q.symbol}${fii ? "?de=fiis" : ""}`}>{x.q.symbol}</Link> <span className="text-[11px] text-muted">{shortName(x.q.name)}</span></td>
                    <td className="hidden truncate sm:table-cell" title={x.q.sector}>{x.q.sector}</td>
                    <td className="num">{brl(x.value)}</td>
                    <td className="num">{x.price ? pct((x.value / x.price) * 100, 2) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted">Fonte: proventos da Yahoo Finance (data com/ex) e lista da B3 via brapi. É histórico: datas e valores futuros são divulgados pelas empresas e gestoras.</p>
        </section>
      )}
    </>
  );
}
