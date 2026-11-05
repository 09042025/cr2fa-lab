import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ADDRESS, getLpPositions } from "@/lib/lppositions";
import { LpHealth } from "@/components/LpHealth";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saúde das pools" };

export default async function SaudePage({ searchParams }: { searchParams: Promise<{ carteira?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  if (user.plan !== "pro" && user.role !== "admin") {
    return <><PageTitle title="Saúde das pools" /><Locked feature="Saúde das pools (exclusivo do plano Premium)" text="Acompanhe suas posições de liquidez na blockchain com faixa, taxas a coletar e rendimento estimado." /></>;
  }
  const raw = (sp.carteira ?? "").trim();
  const valid = ADDRESS.test(raw);
  const data = valid ? await getLpPositions(raw) : null;
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/painel/cripto/defi" className="text-gold-soft hover:underline">← HUB DEFI</Link></p>
      <PageTitle title="Saúde das pools" subtitle="Siga o dinheiro dentro da blockchain: veja as posições de liquidez de qualquer carteira, se estão dentro da faixa, as taxas a coletar e o rendimento estimado." />
      <section className="card mb-4 p-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="label" htmlFor="carteira">Endereço da carteira</label>
            <input id="carteira" name="carteira" defaultValue={raw} className="input" placeholder="0x..." autoComplete="off" spellCheck={false} />
          </div>
          <button className="btn btn-gold" type="submit">Consultar</button>
        </form>
        {raw && !valid && <p className="mt-2 text-sm text-down">Endereço inválido. Cole o endereço completo (começa com 0x e tem 42 caracteres).</p>}
        <p className="mt-3 text-xs text-muted">Somente visualização: não conectamos a carteira, não pedimos assinatura e não existe swap, aprovação ou ajuste de pool aqui. Para sua segurança, desconfie de qualquer site que peça para conectar a carteira e assinar algo para “ver” posições. Cobertura: posições Uniswap v3 em Ethereum, Base, Arbitrum, Polygon e Optimism.</p>
      </section>
      {data && <LpHealth data={data} />}
      <p className="mt-4 text-xs text-muted">Taxas a coletar são calculadas direto do contrato da Uniswap. O rendimento estimado usa o volume de 24h e a liquidez ativa do pool e muda todo dia. PnL, ROI e perda de divergência dependem do histórico de depósitos e saques e entram na próxima etapa.</p>
      <Disclaimer />
    </>
  );
}
