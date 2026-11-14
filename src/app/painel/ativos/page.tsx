import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getFiis, getStocks } from "@/lib/market";
import { DataStatus, Disclaimer, Locked, PageTitle, ProBadge } from "@/components/ui";
import { QuotesTable } from "@/components/QuotesTable";
import { FREE_LIMITS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string; setor?: string; q?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isPro = user.plan === "pro";
  const fii = sp.tipo === "fiis";
  const result = await (fii ? getFiis() : getStocks());
  const all = result.data ?? [];
  const sectors = [...new Set(all.map((q) => q.sector))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const term = (sp.q || "").trim().toUpperCase().slice(0, 30);
  const bySector = isPro && sp.setor ? all.filter((q) => q.sector === sp.setor) : all;
  const filtered = isPro && term ? bySector.filter((q) => q.symbol.includes(term) || q.name.toUpperCase().includes(term)) : bySector;
  const rows = isPro ? filtered : filtered.slice(0, FREE_LIMITS.stocks);
  const tab = (t: string, label: string, on: boolean) => (
    <Link href={`/painel/ativos?tipo=${t}`} className={`btn ${on ? "btn-gold" : "btn-ghost"}`}>{label}</Link>
  );

  return (
    <>
      <PageTitle title="Ativos" subtitle="Todas as ações e fundos imobiliários da B3 em um só lugar. Clique no código para ver gráfico, indicadores, pontos de atenção e calendário de proventos." />
      <div className="mb-4 flex gap-2">{tab("acoes", "Ações", !fii)}{tab("fiis", "Fundos imobiliários", fii)}</div>
      <DataStatus result={result} source="brapi.dev (B3)" />
      {result.data && (
        <section className="card p-4">
          {isPro ? (
            <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="tipo" value={fii ? "fiis" : "acoes"} />
              <div>
                <label className="label" htmlFor="setor">{fii ? "Filtrar por segmento" : "Filtrar por setor"}</label>
                <select id="setor" name="setor" defaultValue={sp.setor || ""} className="input">
                  <option value="">Todos</option>
                  {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="q">Buscar ativo</label>
                <input id="q" name="q" defaultValue={sp.q || ""} placeholder="Ex.: KNCR11" className="input" maxLength={30} />
              </div>
              <button className="btn btn-gold">Filtrar</button>
            </form>
          ) : (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted"><ProBadge /> Lista completa, filtro por setor e busca no plano Premium.</div>
          )}
          {isPro && <p className="mb-2 text-xs text-muted">{rows.length} de {all.length} ativos.</p>}
          <QuotesTable rows={rows} origem={fii ? "fiis" : "acoes"} />
          {!isPro && all.length > rows.length && <div className="mt-4"><Locked feature={`Lista completa (${all.length} ativos)`} /></div>}
        </section>
      )}
      <Disclaimer />
    </>
  );
}
