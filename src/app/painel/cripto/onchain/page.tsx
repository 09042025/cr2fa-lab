import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DEFAULT_IDS, INDICATORS, parseIds } from "@/lib/onchain-defs";
import { Disclaimer, PageTitle } from "@/components/ui";
import { OnchainExplorer } from "@/components/OnchainExplorer";
import { TradingViewChart } from "@/components/TradingViewChart";

export const dynamic = "force-dynamic";

export default async function OnchainPage({ searchParams }: { searchParams: Promise<{ i?: string; v?: string }> }) {
  const user = await requireUser();
  const isPro = user.plan === "pro";
  const sp = await searchParams;
  const view = sp.v === "onchain" || (sp.i && sp.v !== "tv") ? "onchain" : "tv";
  const fromUrl = parseIds(sp.i, isPro ? INDICATORS.length : undefined);
  const initial = fromUrl.length > 0 ? fromUrl : DEFAULT_IDS;

  const tab = (active: boolean) => `btn ${active ? "btn-gold" : "btn-ghost"}`;
  return (
    <>
      <PageTitle
        title="Análise do Bitcoin"
        subtitle={view === "tv"
          ? "O gráfico oficial do TradingView, com todos os indicadores técnicos, Fibonacci, MACD, RSI, ferramentas de desenho e troca de ativo."
          : "O gráfico do Bitcoin com os indicadores on-chain. Ative e desative cada um no painel à direita, arraste sobre o gráfico para dar zoom e passe o mouse para ler os valores de cada dia."}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/painel/cripto/onchain?v=tv" className={tab(view === "tv")}>Análise técnica (TradingView)</Link>
        <Link href="/painel/cripto/onchain?v=onchain" className={tab(view === "onchain")}>Indicadores on-chain</Link>
      </div>
      {view === "tv" ? (
        <>
          <TradingViewChart symbol="BITSTAMP:BTCUSD" height={760} />
          <p className="mt-3 text-xs text-muted">
            Use o botão <strong>Indicadores</strong> no topo do gráfico para ligar MACD, RSI, médias, Bollinger e centenas de outros, e a barra à esquerda para Fibonacci, tendências e canais.
            Os indicadores on-chain (MVRV, preço realizado, Puell e outros) ficam na aba ao lado, porque o TradingView não aceita dados de fora.
            Gráficos fornecidos pelo TradingView.
          </p>
        </>
      ) : (
        <OnchainExplorer initial={initial} isPro={isPro} />
      )}
      <Disclaimer />
    </>
  );
}
