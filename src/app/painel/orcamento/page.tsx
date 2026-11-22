import { requireUser } from "@/lib/auth";
import { getBudget } from "@/lib/budget";
import { BudgetView } from "@/components/BudgetView";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  return (
    <>
      <PageTitle title="Orçamento familiar" subtitle="Antes de investir, organize a casa: veja para onde vai o seu dinheiro, compare com o ideal e descubra quanto tempo falta para a sua reserva de emergência. Gratuito para todos." />
      <BudgetView saved={getBudget(user.id)} />
    </>
  );
}
