import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DEFAULT_IDS, parseIds } from "@/lib/onchain-defs";
import { Disclaimer, PageTitle } from "@/components/ui";
import { OnchainExplorer } from "@/components/OnchainExplorer";

export const dynamic = "force-dynamic";

export default async function OnchainPage({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const fromUrl = parseIds(sp.i);
  const initial = fromUrl.length > 0 ? fromUrl : DEFAULT_IDS;

  return (
    <>
      <PageTitle
        title="Análise on-chain do Bitcoin"
        subtitle="O gráfico do Bitcoin com até 3 indicadores ao mesmo tempo. Escolha os indicadores abaixo, arraste sobre o gráfico para dar zoom e passe o mouse para ler os valores de cada dia."
      />
      <p className="mb-3 text-sm"><Link className="text-gold-soft underline" href="/painel/cripto">Voltar para Cripto e DeFi</Link></p>
      <OnchainExplorer initial={initial} />
      <Disclaimer />
    </>
  );
}
