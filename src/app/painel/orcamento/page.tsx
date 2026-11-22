import { requireUser } from "@/lib/auth";
import { getBudget, listMonths } from "@/lib/budget";
import { BudgetView } from "@/components/BudgetView";
import { BudgetMonthly } from "@/components/BudgetMonthly";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const saved = getBudget(user.id);
  return (
    <>
      <PageTitle title="Orçamento familiar" subtitle="Antes de investir, organize a casa: veja para onde vai o seu dinheiro, compare com o ideal e descubra quanto tempo falta para a sua reserva de emergência. Gratuito para todos." />
      <a href="#acompanhamento" className="btn btn-ghost mb-4 !py-1.5 !text-sm">📅 Ir para o acompanhamento mês a mês</a>
      <div className="space-y-6">
        <BudgetView saved={saved} />
        <BudgetMonthly initial={listMonths(user.id)} base={saved} />
      </div>
    </>
  );
}
