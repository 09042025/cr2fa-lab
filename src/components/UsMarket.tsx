import Link from "next/link";
import { getUsQuote, getUsRows, peekFund, peekQuote, pool, usList, warmUs, type UsKind } from "@/lib/usmarket";
import { buildUsAssessment, marketCapOf } from "@/lib/usassess";
import { isCritical } from "@/lib/assess";
import { AttentionBall } from "@/components/AttentionBall";
import { usLogo } from "@/lib/cryptoquote";
import { TickerLogo } from "@/components/TickerLogo";
import { Change, Locked, ProBadge } from "@/components/ui";
import { FREE_LIMITS } from "@/lib/plans";
import { pct, usd, usdCompact } from "@/lib/format";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Lista e calendário de dividendos do mercado americano (ações e REITs), com o mesmo formato do mercado brasileiro. */
export async function UsMarket({ kind, isPro, aba, setor, q, mes }: { kind: UsKind; isPro: boolean; aba?: string; setor?: string; q?: string; mes?: string }) {
  const reits = kind === "reits";
  const path = reits ? "/painel/fiis" : "/painel/acoes";
  const cal = aba === "calendario";
  const all = usList(kind);
  const sectors = [...new Set(all.map((a) => a.sector))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const label = reits ? "segmento" : "setor";
  const tabs = (
    <div className="mb-4 flex flex-wrap gap-2">
      <Link href={`${path}?pais=us`} className={`btn ${cal ? "btn-ghost" : "btn-gold"}`}>Lista</Link>
      <Link href={`${path}?pais=us&aba=calendario`} className={`btn ${cal ? "btn-gold" : "btn-ghost"}`}>Calendário de dividendos {!isPro && <ProBadge />}</Link>
    </div>
  );

  if (cal) {
    if (!isPro) return <>{tabs}<Locked feature="Calendário de dividendos" text={`Veja em quais meses ${reits ? "cada REIT" : "cada ação americana"} costuma pagar proventos, com filtro por ${label} e por mês. Recurso exclusivo do plano Premium.`} /></>;
    const today = new Date().toISOString().slice(0, 10);
    const month = Math.min(12, Math.max(1, Number(mes) || Number(today.slice(5, 7))));
    const mm = String(month).padStart(2, "0");
    const picked = setor ? all.filter((a) => a.sector === setor) : all;
    const data = await pool(picked, 8, async (a) => ({ a, d: (await getUsQuote(a.symbol)).data }));
    const from = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const items = data.flatMap(({ a, d }) => (d?.dividends ?? []).filter((x) => x.date > from && x.date <= today && x.date.slice(5, 7) === mm).map((x) => ({ a, ...x, price: d?.price ?? null }))).sort((x, y) => x.date.localeCompare(y.date));
    const failed = data.filter((x) => !x.d).length;
    const link = (m: number) => `${path}?${new URLSearchParams({ pais: "us", aba: "calendario", mes: String(m), ...(setor ? { setor } : {}) }).toString()}`;
    return (
      <>
        {tabs}
        <form method="get" className="card mb-4 flex flex-wrap items-end gap-3 p-4">
          <input type="hidden" name="pais" value="us" /><input type="hidden" name="aba" value="calendario" />
          <div><label className="label" htmlFor="setor">Filtrar por {label}</label><select id="setor" name="setor" defaultValue={setor || ""} className="input"><option value="">Todos</option>{sectors.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="label" htmlFor="mes">Mês</label><select id="mes" name="mes" defaultValue={String(month)} className="input">{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
          <button className="btn btn-gold">Filtrar</button>
        </form>
        <div className="mb-4 grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
          {MONTHS.map((m, i) => <Link key={m} href={link(i + 1)} className={`rounded-lg border px-2 py-1.5 text-center text-xs ${i + 1 === month ? "border-gold bg-gold/10 text-gold-soft" : "border-line bg-panel-2 text-muted"}`}>{m.slice(0, 3)}</Link>)}
        </div>
        <section className="card p-4">
          <h2 className="mb-1 font-semibold">{MONTHS[month - 1]}: {items.length} provento(s){setor ? ` em ${setor}` : ""}</h2>
          <p className="mb-3 text-xs text-muted">Analisamos {picked.length} {reits ? "REITs" : "ações"} da nossa lista.{failed ? ` ${failed} sem dados agora.` : ""} Valores em dólar.</p>
          {items.length === 0 ? <p className="text-sm text-muted">Nenhum provento neste mês nos últimos 12 meses para esta seleção.</p> : (
            <table className="data w-full table-fixed text-xs [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:text-[10px]">
              <thead><tr><th className="w-[22%] sm:w-[14%]">Data com</th><th className="w-[38%] sm:w-[36%]">Ativo</th><th className="hidden w-[24%] sm:table-cell">{reits ? "Segmento" : "Setor"}</th><th className="num w-[20%] sm:w-[13%]">Valor</th><th className="num w-[20%] sm:w-[13%]">% preço</th></tr></thead>
              <tbody>{items.map((x) => (
                <tr key={`${x.a.symbol}-${x.date}`}>
                  <td>{x.date.split("-").reverse().join("/")}</td>
                  <td className="truncate" title={x.a.name}><Link className="font-semibold text-gold-soft underline" href={`/painel/ativo-us/${x.a.symbol}?de=${reits ? "fiis" : "acoes"}`}>{x.a.symbol}</Link> <span className="text-[11px] text-muted">{x.a.name}</span></td>
                  <td className="hidden truncate sm:table-cell">{x.a.sector}</td>
                  <td className="num">{usd(x.value)}</td>
                  <td className="num">{x.price ? pct((x.value / x.price) * 100, 2) : "—"}</td>
                </tr>))}</tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted">Fonte: proventos da Yahoo Finance (data com/ex). É histórico: datas e valores futuros são divulgados pelas empresas.</p>
        </section>
      </>
    );
  }

  const rowsAll = await getUsRows(kind);
  warmUs(rowsAll.map((r) => r.symbol));
  const extra = new Map(rowsAll.map((r) => {
    const f = peekFund(r.symbol), qd = peekQuote(r.symbol);
    const a = f || qd ? buildUsAssessment(r.symbol, reits, f, qd ? { ...qd, price: r.price ?? qd.price } : null, r.name) : null;
    return [r.symbol, { mc: marketCapOf(r.price, f), a: a && a.total > 0 ? { points: a.bad + a.warn, total: a.total, critical: isCritical(a) } : null, ready: !!f && !!qd }] as const;
  }));
  const loading = [...extra.values()].some((x) => !x.ready);
  const term = (q || "").trim().toUpperCase().slice(0, 30);
  const bySector = isPro && setor ? rowsAll.filter((r) => r.sector === setor) : rowsAll;
  const filtered = isPro && term ? bySector.filter((r) => r.symbol.includes(term) || r.name.toUpperCase().includes(term)) : bySector;
  const rows = isPro ? filtered : filtered.slice(0, reits ? FREE_LIMITS.fiis : FREE_LIMITS.stocks);
  return (
    <>
      {tabs}
      <section className="card p-4">
        {isPro ? (
          <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="pais" value="us" />
            <div><label className="label" htmlFor="setor">Filtrar por {label}</label><select id="setor" name="setor" defaultValue={setor || ""} className="input"><option value="">Todos</option>{sectors.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="label" htmlFor="q">Buscar ativo</label><input id="q" name="q" defaultValue={q || ""} placeholder={reits ? "Ex.: O, PLD" : "Ex.: AAPL"} className="input" maxLength={30} /></div>
            <button className="btn btn-gold">Filtrar</button>
          </form>
        ) : <div className="mb-4 flex items-center gap-2 text-sm text-muted"><ProBadge /> Lista completa, filtro por {label} e busca no plano Premium.</div>}
        {isPro && <p className="mb-2 text-xs text-muted">{rows.length} de {rowsAll.length} ativos. Cotações em dólar (US$). Clique no código para abrir.{loading ? " Valor de mercado e indicadores estão sendo carregados da SEC (primeira vez leva alguns minutos): atualize a página em instantes." : ""}</p>}
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>Código</th><th>Nome</th><th>{reits ? "Segmento" : "Setor"}</th><th className="num">Preço</th><th className="num">Dia</th><th className="num">Volume</th><th className="num">Valor de mercado</th><th className="num">Indic.</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.symbol}>
                <td className="font-semibold"><Link href={`/painel/ativo-us/${r.symbol}?de=${reits ? "fiis" : "acoes"}`} className="text-gold-soft underline-offset-2 hover:underline"><span className="inline-flex items-center gap-2"><TickerLogo src={usLogo(r.symbol)} symbol={r.symbol} />{r.symbol} <span aria-hidden>📈</span></span></Link></td>
                <td className="max-w-[260px] truncate text-muted" title={r.name}>{r.name}</td>
                <td>{r.sector}</td>
                <td className="num">{usd(r.price)}</td>
                <td className="num"><Change value={r.changePct} /></td>
                <td className="num">{r.volume === null ? "—" : r.volume.toLocaleString("en-US")}</td>
                <td className="num">{extra.get(r.symbol)?.mc ? usdCompact(extra.get(r.symbol)!.mc) : "—"}</td>
                <td className="num"><AttentionBall a={extra.get(r.symbol)?.a ?? null} /></td>
              </tr>))}</tbody>
          </table>
        </div>
        {!isPro && rowsAll.length > rows.length && <div className="mt-4"><Locked feature={`Lista completa (${rowsAll.length} ativos)`} /></div>}
      </section>
      <p className="mt-3 text-xs text-muted">Seleção das maiores {reits ? "REITs (fundos imobiliários dos EUA)" : "ações dos EUA"}, não o mercado inteiro. Cotações da Yahoo Finance, podem ter atraso. Não é recomendação de compra.</p>
    </>
  );
}
