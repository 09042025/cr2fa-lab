import { requireUser } from "@/lib/auth";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { FinancingSimulator } from "@/components/FinancingSimulator";

export default async function FinancingPage() {
  const user = await requireUser();
  if (user.plan !== "pro" && user.role !== "admin") {
    return (
      <>
        <PageTitle title="Simulador de Financiamentos" subtitle="Veja quanto fica a parcela de um imóvel ou veículo conforme o prazo." />
        <Locked feature="Simulador de Financiamentos (exclusivo do plano Pró)" text="Simule a parcela mensal, o total de juros e compare prazos para imóveis e veículos, em Price ou SAC." />
      </>
    );
  }
  return (
    <>
      <PageTitle title="Simulador de Financiamentos" subtitle="Imóveis e veículos: descubra quanto fica a parcela mensal conforme o prazo, a entrada e a taxa de juros." />
      <FinancingSimulator />
      <Disclaimer />
    </>
  );
}
