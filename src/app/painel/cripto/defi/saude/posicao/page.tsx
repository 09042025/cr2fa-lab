import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ADDRESS, LP_CHAINS } from "@/lib/lppositions";
import { getLpDetail } from "@/lib/lpdetail";
import { LpPositionDetail } from "@/components/LpPositionDetail";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Posição de liquidez" };

export default async function PosicaoPage({ searchParams }: { searchParams: Promise<{ carteira?: string; rede?: string; id?: string }> }) {
  const user = await requireUser();
  if (user.plan !== "pro" && user.role !== "admin") return <><PageTitle title="Posição de liquidez" /><Locked feature="Saúde das pools (exclusivo do plano Premium)" text="Acompanhe suas posições de liquidez na blockchain." /></>;
  const sp = await searchParams;
  const addr = (sp.carteira ?? "").trim(), chain = sp.rede ?? "", id = sp.id ?? "";
  if (!ADDRESS.test(addr) || !(LP_CHAINS as readonly string[]).includes(chain) || !/^\d{1,12}$/.test(id)) notFound();
  const d = await getLpDetail(addr, chain, id);
  if (!d) notFound();
  const { position: p } = d;
  return (
    <>
      <p className="mb-2 text-sm"><Link href={`/painel/cripto/defi/saude?carteira=${addr}`} className="text-gold-soft hover:underline">← Saúde das pools</Link></p>
      <PageTitle title={`${p.pair} · ${p.fee / 10000}%`} subtitle={`Uniswap v3 · ${chain} · posição #${p.tokenId} · carteira ${addr.slice(0, 6)}…${addr.slice(-4)} · somente visualização`} />
      <LpPositionDetail d={d} />
      <p className="mt-4 text-xs text-muted">Cálculos feitos a partir dos eventos públicos do contrato da Uniswap, com tudo valorizado aos preços de hoje (DefiLlama), como na referência HOLD do Revert. Não inclui custo de gás. O gráfico de valor mostra a posição sem as taxas; a evolução do PnL com taxas entra quando houver o histórico da Uniswap.</p>
      <Disclaimer />
    </>
  );
}
