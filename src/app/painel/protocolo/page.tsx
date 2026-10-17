import { requireUser } from "@/lib/auth";
import { ProtocolCalculator } from "@/components/ProtocolCalculator";
import { ProtocolPie } from "@/components/PieChart";
import { Disclaimer, PageTitle } from "@/components/ui";
import { BLOCKS } from "@/lib/protocol";

export default async function ProtocolPage() {
  await requireUser();
  return (
    <>
      <PageTitle title="Protocolo CR2FA" subtitle="Cinco blocos de 20%. Diversificação em duas camadas: entre os blocos e dentro de cada um." />
      <div className="mb-6 flex justify-center"><ProtocolPie blocks={BLOCKS} size={260} /></div>
      <ProtocolCalculator />
      <Disclaimer />
    </>
  );
}
