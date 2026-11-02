import { requireUser } from "@/lib/auth";
import { ProtocolCalculator } from "@/components/ProtocolCalculator";
import Image from "next/image";
import { ProtocolPizza } from "@/components/ProtocolPizza";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";

export default async function ProtocolPage() {
  const user = await requireUser();
  if (user.plan !== "pro" && user.role !== "admin") {
    return (
      <>
        <PageTitle title="Protocolo CR2FA" subtitle="Cinco blocos de 20%. Diversificação em duas camadas." />
        <Locked feature="Protocolo CR2FA (exclusivo do plano Premium)" text="A calculadora e a metodologia completa do Protocolo CR2FA fazem parte do plano Premium." />
      </>
    );
  }
  return (
    <>
      <PageTitle title="Protocolo CR2FA" subtitle="Cinco blocos de 20%. Diversificação em duas camadas: entre os blocos e dentro de cada um." />
      <div className="relative isolate mb-6 flex justify-center">
        <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/20 blur-3xl" />
        <ProtocolPizza priority className="w-full max-w-[360px] drop-shadow-[0_22px_30px_rgba(0,0,0,0.55)]" />
      </div>
      <ProtocolCalculator />
      <Disclaimer />
    </>
  );
}
