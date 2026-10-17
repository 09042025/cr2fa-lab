import { requireUser } from "@/lib/auth";
import { getRates } from "@/lib/market";
import { DataStatus, Disclaimer, Locked, PageTitle } from "@/components/ui";
import { FixedIncomeComparator } from "@/components/FixedIncomeComparator";
import { pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FixedIncomePage() {
  const user = await requireUser();
  const rates = await getRates();
  return (
    <>
      <PageTitle title="Renda fixa" subtitle="Bloco de 20% do Protocolo: 30% Tesouro Selic, 30% CDBs e 40% LCI/LCA. A reserva para oportunidades também fica aqui, metade em CDB com liquidez diária e metade em Tesouro Selic." />
      <DataStatus result={rates} source="Banco Central do Brasil (SGS)" />
      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        {[["Selic (meta)", rates.data?.selic], ["CDI (anualizado)", rates.data?.cdi], ["IPCA (12 meses)", rates.data?.ipca12m]].map(([label, v]) => (
          <div key={label as string} className="card p-4">
            <p className="text-xs text-muted">{label as string}</p>
            <p className="mt-1 text-2xl font-bold text-gold-soft">{pct((v as number | null) ?? null)}</p>
          </div>
        ))}
      </section>
      {user.plan === "pro" ? (
        <FixedIncomeComparator cdi={rates.data?.cdi ?? null} selic={rates.data?.selic ?? null} />
      ) : (
        <Locked feature="Comparador líquido de CDB, LCI/LCA e Tesouro Selic" />
      )}
      <p className="mt-4 text-xs text-muted">Em CDBs, confira a cobertura do FGC (até R$ 250 mil por CPF e por instituição) e a solidez do emissor.</p>
      <Disclaimer />
    </>
  );
}
