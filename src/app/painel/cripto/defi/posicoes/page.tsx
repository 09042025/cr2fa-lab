import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ADDRESS } from "@/lib/lppositions";
import { graphChains, graphEnabled } from "@/lib/graph";
import { filterBoard, getBoard, getTopPositions, type BoardFilter, type BoardPosition, type TopPosition } from "@/lib/toppositions";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { pct, usd } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pools Position" };

const SORTS: Record<string, [string, (p: TopPosition) => number]> = {
  valor: ["Maior valor", (p) => p.valueUsd], apr: ["Maior APR", (p) => p.apr ?? -1e9], roi: ["Maior ROI", (p) => p.roi], pnl: ["Maior PnL", (p) => p.pnlUsd],
};
const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 5 });
const tone = (v: number) => (v >= 0 ? "text-up" : "text-down");

export default async function PosicoesPage({ searchParams }: { searchParams: Promise<{ pool?: string; rede?: string; ordem?: string; min?: string; idade?: string; faixa?: string }> }) {
  const user = await requireUser();
  if (user.plan !== "pro" && user.role !== "admin") return <><PageTitle title="Pools Position" /><Locked feature="Pools Position (exclusivo do plano Premium)" text="Veja as maiores posições de cada pool e quem está ganhando mais." /></>;
  const sp = await searchParams;
  const chains = graphChains();
  const chain = chains.includes(sp.rede ?? "") ? sp.rede! : chains[0] ?? "Ethereum";
  const pool = (sp.pool ?? "").trim();
  const ordem = SORTS[sp.ordem ?? ""] ? sp.ordem! : "valor";
  let data = null, error: string | null = null;
  if (pool) {
    if (!ADDRESS.test(pool)) error = "Endereço do pool inválido (0x + 40 caracteres).";
    else if (!graphEnabled()) error = "A chave do The Graph ainda não foi configurada no servidor.";
    else { try { data = await getTopPositions(chain, pool); if (!data) error = "Pool não encontrado nessa rede."; } catch (e) { error = e instanceof Error ? e.message : "erro"; } }
  }
  let board: BoardPosition[] = [], boardPools = 0;
  const minValue = [0, 1000, 10000, 100000].includes(Number(sp.min)) ? Number(sp.min) : 1000;
  const minAge = [0, 7, 30, 90].includes(Number(sp.idade)) ? Number(sp.idade) : 7;
  const onlyIn = sp.faixa === "1";
  const sortKey = (["apr", "roi", "pnl", "valor"].includes(sp.ordem ?? "") ? sp.ordem : "apr") as BoardFilter["sort"];
  if (!pool) {
    if (!graphEnabled()) error = "A chave do The Graph ainda não foi configurada no servidor.";
    else { try { const b = await getBoard(chain); boardPools = b.pools; board = filterBoard(b.positions, { minValue, minAgeDays: minAge, onlyInRange: onlyIn, sort: sortKey, limit: 100 }); } catch (e) { error = e instanceof Error ? e.message : "erro"; } }
  }
  const rows = data ? [...data.positions].sort((a, b) => SORTS[ordem][1](b) - SORTS[ordem][1](a)).slice(0, 50) : [];
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/painel/cripto/defi" className="text-gold-soft hover:underline">← HUB DEFI</Link></p>
      <PageTitle title="Pools Position" subtitle="As maiores posições de liquidez de um pool, com valor, taxas já coletadas, PnL, ROI e APR. Clique na carteira para ver a saúde completa dela." />
      {pool ? (
        <section className="card mb-4 p-4">
          <p className="text-sm">Mostrando um pool específico. <Link href={`/painel/cripto/defi/posicoes?rede=${chain}`} className="text-gold-soft hover:underline">← Voltar ao ranking geral</Link></p>
          {error && <p className="mt-2 text-sm text-down">{error}</p>}
        </section>
      ) : (
        <section className="card mb-4 p-4">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] lg:items-end">
            <div><label className="label" htmlFor="rede">Rede</label><select id="rede" name="rede" defaultValue={chain} className="input">{chains.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label" htmlFor="ordem">Ordenar por</label><select id="ordem" name="ordem" defaultValue={sortKey} className="input">{Object.entries(SORTS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div><label className="label" htmlFor="min">Valor mínimo</label><select id="min" name="min" defaultValue={String(minValue)} className="input"><option value="0">Qualquer</option><option value="1000">US$ 1 mil</option><option value="10000">US$ 10 mil</option><option value="100000">US$ 100 mil</option></select></div>
            <div><label className="label" htmlFor="idade">Idade mínima</label><select id="idade" name="idade" defaultValue={String(minAge)} className="input"><option value="0">Qualquer</option><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select></div>
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="faixa" value="1" defaultChecked={onlyIn} /> Só dentro da faixa</label>
            <button className="btn btn-gold" type="submit">Filtrar</button>
          </form>
          <p className="mt-3 text-xs text-muted">Ranking das maiores posições das 25 maiores pools Uniswap v3 de cada rede, atualizado a cada 30 minutos. Toque em “Analisar” para ver a posição inteira: faixa, taxas, PnL, gráficos e o histórico da carteira. Redes disponíveis agora: {chains.join(", ")}.</p>
          {error && <p className="mt-2 text-sm text-down">{error}</p>}
        </section>
      )}
      {!pool && !error && (
        <section className="card overflow-x-auto p-4">
          <h2 className="mb-1 font-semibold">{board.length} posições em {chain} <span className="text-xs font-normal text-muted">· {boardPools} pools analisadas</span></h2>
          <table className="mt-3 w-full min-w-[980px] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-2">#</th><th>Pool</th><th>Carteira</th><th>Faixa</th><th className="text-right">Valor</th><th className="text-right">Taxas coletadas</th><th className="text-right">PnL</th><th className="text-right">ROI</th><th className="text-right">APR</th><th className="text-right">Idade</th><th></th></tr></thead>
            <tbody>
              {board.map((p, i) => (
                <tr key={`${p.pool}-${p.tokenId}`} className="border-t border-line">
                  <td className="py-2 text-muted">{i + 1}</td>
                  <td className="font-medium">{p.pair} <span className="rounded border border-line px-1 text-xs font-normal text-muted">{p.fee / 10000}%</span></td>
                  <td><Link className="text-gold-soft hover:underline" href={`/painel/cripto/defi/saude?carteira=${p.owner}`}>{p.owner.slice(0, 6)}…{p.owner.slice(-4)}</Link></td>
                  <td><span className={p.inRange ? "text-up" : "text-down"}>{p.inRange ? "●" : "○"}</span> {sig(p.priceLower)} ↔ {sig(p.priceUpper)}</td>
                  <td className="text-right font-medium">{usd(p.valueUsd)}</td>
                  <td className="text-right">{usd(p.feesCollectedUsd)}</td>
                  <td className={`text-right ${tone(p.pnlUsd)}`}>{usd(p.pnlUsd)}</td>
                  <td className={`text-right ${tone(p.roi)}`}>{pct(p.roi * 100)}</td>
                  <td className={`text-right ${p.apr === null ? "" : tone(p.apr)}`}>{p.apr === null ? "—" : pct(p.apr * 100)}</td>
                  <td className="text-right text-muted">{Math.round(p.ageDays)} d</td>
                  <td className="pl-3"><Link className="rounded border border-gold/50 px-2 py-1 text-xs font-semibold text-gold-soft hover:bg-gold/10" href={`/painel/cripto/defi/saude/posicao?carteira=${p.owner}&rede=${p.chain}&id=${p.tokenId}&proto=uniswap-v3`}>Analisar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {board.length === 0 && <p className="mt-3 text-sm text-muted">Nenhuma posição com esses filtros. Tente baixar o valor ou a idade mínima.</p>}
          <p className="mt-3 text-xs text-muted">● dentro da faixa, ○ fora. Valores a preços de hoje, referência HOLD; taxas ainda não coletadas não entram no PnL desta tabela (a análise completa inclui). Posições dentro de contratos de staking aparecem com o endereço do contrato e podem não abrir em “Analisar”.</p>
        </section>
      )}
      {pool && data && (
        <section className="card overflow-x-auto p-4">
          <h2 className="mb-1 font-semibold">{data.pair} <span className="ml-1 rounded border border-line px-1 text-xs text-muted">{data.fee / 10000}%</span> <span className="text-xs font-normal text-muted">· {data.chain} · preço atual {sig(data.price)} {data.symbol1}/{data.symbol0}</span></h2>
          <table className="mt-3 w-full min-w-[820px] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-2">#</th><th>Carteira</th><th>Faixa</th><th className="text-right">Valor</th><th className="text-right">Taxas coletadas</th><th className="text-right">PnL</th><th className="text-right">ROI</th><th className="text-right">APR</th><th className="text-right">Idade</th></tr></thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.tokenId} className="border-t border-line">
                  <td className="py-2 text-muted">{i + 1}</td>
                  <td><Link className="text-gold-soft hover:underline" href={`/painel/cripto/defi/saude?carteira=${p.owner}`}>{p.owner.slice(0, 6)}…{p.owner.slice(-4)}</Link></td>
                  <td><span className={p.inRange ? "text-up" : "text-down"}>{p.inRange ? "●" : "○"}</span> {sig(p.priceLower)} ↔ {sig(p.priceUpper)}</td>
                  <td className="text-right font-medium">{usd(p.valueUsd)}</td>
                  <td className="text-right">{usd(p.feesCollectedUsd)}</td>
                  <td className={`text-right ${tone(p.pnlUsd)}`}>{usd(p.pnlUsd)}</td>
                  <td className={`text-right ${tone(p.roi)}`}>{pct(p.roi * 100)}</td>
                  <td className={`text-right ${p.apr === null ? "" : tone(p.apr)}`}>{p.apr === null ? "—" : pct(p.apr * 100)}</td>
                  <td className="text-right text-muted">{Math.round(p.ageDays)} d</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="mt-3 text-sm text-muted">Nenhuma posição aberta relevante (acima de US$ 2) neste pool.</p>}
          <p className="mt-3 text-xs text-muted">● dentro da faixa, ○ fora. Valores a preços de hoje, referência HOLD; taxas ainda não coletadas não entram no PnL. Mostra as 100 maiores posições do pool por liquidez, e as 50 melhores pela ordem escolhida. Posições em contratos de staking aparecem com o endereço do contrato.</p>
        </section>
      )}
      <Disclaimer />
    </>
  );
}
