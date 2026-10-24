import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { chartLinks, cleanCoinId, cleanTicker, isKind, tradingViewSymbol } from "@/lib/charts";
import { Disclaimer, PageTitle } from "@/components/ui";
import { TradingViewChart } from "@/components/TradingViewChart";

export const dynamic = "force-dynamic";

type SP = { tipo?: string; ativo?: string; nome?: string; id?: string; de?: string };

const BACK: Record<string, { href: string; label: string }> = {
  cripto: { href: "/painel/cripto", label: "Voltar para Cripto" },
  acoes: { href: "/painel/acoes", label: "Voltar para Ações" },
  fiis: { href: "/painel/fiis", label: "Voltar para Fundos imobiliários" },
};

export default async function ChartPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const sp = await searchParams;
  const kind = isKind(sp.tipo) ? sp.tipo : null;
  const ticker = cleanTicker(sp.ativo);

  if (!kind || !ticker) {
    return (
      <>
        <PageTitle title="Gráfico" subtitle="Escolha um ativo nas páginas de Cripto, Ações ou Fundos imobiliários." />
        <Link className="text-gold-soft underline" href="/painel/cripto">Ir para Cripto</Link>
      </>
    );
  }

  const symbol = tradingViewSymbol(kind, ticker);
  const links = chartLinks(kind, ticker, cleanCoinId(sp.id));
  const name = (sp.nome || "").replace(/[^\p{L}\p{N} .&'-]/gu, "").slice(0, 60);
  const back = kind === "cripto" ? BACK.cripto : sp.de === "fiis" ? BACK.fiis : BACK.acoes;

  return (
    <>
      <PageTitle title={name ? `${name} (${ticker})` : ticker} subtitle="Gráfico interativo. Você pode trocar o intervalo, adicionar indicadores e buscar outro ativo dentro do próprio gráfico." />
      <p className="mb-3 text-sm"><Link className="text-gold-soft underline" href={back.href}>{back.label}</Link></p>
      {symbol ? <TradingViewChart symbol={symbol} /> : <p className="card p-4 text-sm text-muted">Não foi possível montar o gráfico deste ativo.</p>}
      {links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((l) => <a key={l.url} className="btn btn-ghost" href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Se o gráfico aparecer vazio, o ativo pode não ter negociação nessa corretora de referência. Use a busca do próprio gráfico ou um dos links acima. Gráficos fornecidos pelo TradingView.</p>
      <Disclaimer />
    </>
  );
}
