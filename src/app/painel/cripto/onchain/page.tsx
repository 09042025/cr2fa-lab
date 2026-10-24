import { requireUser } from "@/lib/auth";
import { DEFAULT_IDS, INDICATORS, parseIds } from "@/lib/onchain-defs";
import { Disclaimer, PageTitle } from "@/components/ui";
import { OnchainExplorer } from "@/components/OnchainExplorer";

export const dynamic = "force-dynamic";

export default async function OnchainPage({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const user = await requireUser();
  const isPro = user.plan === "pro";
  const sp = await searchParams;
  const fromUrl = parseIds(sp.i, isPro ? INDICATORS.length : undefined);
  const initial = fromUrl.length > 0 ? fromUrl : DEFAULT_IDS;

  return (
    <>
      <PageTitle
        title="Análise on-chain do Bitcoin"
        subtitle="O gráfico do Bitcoin com os indicadores on-chain. Ative e desative cada um no painel à direita, arraste sobre o gráfico para dar zoom e passe o mouse para ler os valores de cada dia."
      />
      <OnchainExplorer initial={initial} isPro={isPro} />
      <Disclaimer />
    </>
  );
}
