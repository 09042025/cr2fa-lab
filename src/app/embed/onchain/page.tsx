import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DEFAULT_IDS, INDICATORS, parseIds } from "@/lib/onchain-defs";
import { Disclaimer } from "@/components/ui";
import { OnchainExplorer } from "@/components/OnchainExplorer";
import { TradingViewChart } from "@/components/TradingViewChart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Análise on Chain" };

/**
 * Mesma tela da "Análise on Chain" do site, sem o cabeçalho e o menu, para o app abrir dentro dele.
 * O app entra com o mesmo login (cabeçalho Authorization na primeira abertura).
 */
export default async function EmbedOnchain({ searchParams }: { searchParams: Promise<{ i?: string; v?: string }> }) {
  const user = await requireUser();
  const isPro = user.plan === "pro" || user.role === "admin";
  if (!isPro) return <p className="p-4 text-sm text-muted">Análise on Chain é exclusiva do plano Premium.</p>;
  const sp = await searchParams;
  const view = sp.v === "onchain" || (sp.i && sp.v !== "tv") ? "onchain" : "tv";
  const fromUrl = parseIds(sp.i, INDICATORS.length);
  const initial = fromUrl.length > 0 ? fromUrl : DEFAULT_IDS;
  const tab = (active: boolean) => `btn ${active ? "btn-gold" : "btn-ghost"}`;
  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/embed/onchain?v=tv" className={tab(view === "tv")}>Análise técnica (TradingView)</Link>
        <Link href="/embed/onchain?v=onchain" className={tab(view === "onchain")}>Indicadores on-chain</Link>
      </div>
      {view === "tv" ? (
        <>
          <TradingViewChart symbol="BITSTAMP:BTCUSD" height={620} />
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
    </div>
  );
}
