import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Locked, PageTitle, ProBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const isPro = user.plan === "pro";
  return (
    <>
      <PageTitle title="Masterclass" subtitle="Aulas e análises de ativos para quem é Premium." />
      {isPro ? (
        <section className="card flex flex-col items-start gap-3 p-6">
          <div className="flex items-center gap-2"><ProBadge /><h3 className="font-semibold">Em breve</h3></div>
          <p className="text-sm text-muted">Estamos preparando este espaço. Assim que estiver pronto, o conteúdo aparece aqui para você.</p>
          <Link href="/painel/visao-geral" className="btn btn-ghost">Voltar à visão geral</Link>
        </section>
      ) : (
        <Locked feature="Masterclass (exclusivo do plano Premium)" />
      )}
    </>
  );
}
