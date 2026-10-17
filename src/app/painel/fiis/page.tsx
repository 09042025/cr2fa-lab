import { requireUser } from "@/lib/auth";
import { getFiis } from "@/lib/market";
import { DataStatus, Disclaimer, Locked, PageTitle, ProBadge } from "@/components/ui";
import { QuotesTable } from "@/components/QuotesTable";
import { FREE_LIMITS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ setor?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isPro = user.plan === "pro";
  const result = await getFiis();
  const all = result.data ?? [];
  const sectors = [...new Set(all.map((q) => q.sector))];
  const filtered = isPro && sp.setor ? all.filter((q) => q.sector === sp.setor) : all;
  const rows = isPro ? filtered : filtered.slice(0, FREE_LIMITS.fiis);

  return (
    <>
      <PageTitle title="Fundos imobiliários" subtitle="Bloco de 20% do Protocolo: 30% galpões logísticos, 30% shopping centers, 30% outros imóveis de tijolo e 10% fundos de papel." />
      <DataStatus result={result} source="brapi.dev (B3)" />
      {result.data && (
        <section className="card p-4">
          {isPro ? (
            <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="label" htmlFor="setor">Filtrar por setor</label>
                <select id="setor" name="setor" defaultValue={sp.setor || ""} className="input">
                  <option value="">Todos</option>
                  {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button className="btn btn-gold">Filtrar</button>
            </form>
          ) : (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted"><ProBadge /> Lista completa e filtro por setor no plano Pró.</div>
          )}
          <QuotesTable rows={rows} origem="fiis" />
          {!isPro && all.length > rows.length && <div className="mt-4"><Locked feature={`Lista completa (${all.length} ativos)`} /></div>}
        </section>
      )}
      <p className="mt-4 text-xs text-muted">Os fundos listados são exemplos de cada segmento para ilustrar a estrutura, e não são recomendação de compra.</p>
      <Disclaimer />
    </>
  );
}
