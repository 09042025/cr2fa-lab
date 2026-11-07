import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ADDRESS, PROTOS } from "@/lib/lppositions";
import { graphEnabled, envProbe } from "@/lib/graph";
import { filterBoard, getTopPositions, parsePair, KINDS, type BoardFilter, type BoardPosition, type PoolKind, type TopPosition } from "@/lib/toppositions";
import { loadMulti, parseSelection, type MultiBoard } from "@/lib/boards";
import { EXCHANGES, NETWORKS, dexLabel, netLabel, readySources, sourceReady } from "@/lib/sources";
import { BoardTable, type BoardRow } from "@/components/BoardTable";
import { GraphSourcesForm } from "@/components/GraphSourcesForm";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { GraphKeyForm } from "@/components/GraphKeyForm";
import { pct, usd } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pools Position" };

const SORTS: Record<string, [string, (p: TopPosition) => number]> = {
  valor: ["Maior valor", (p) => p.valueUsd], apr: ["Maior APR", (p) => p.apr ?? -1e9], roi: ["Maior ROI", (p) => p.roi], pnl: ["Maior PnL", (p) => p.pnlUsd],
};
const sig = (v: number) => (v > 0 && v < 0.0001 ? v.toExponential(2).replace(".", ",") : v.toLocaleString("pt-BR", { maximumSignificantDigits: 5 }));
const PROTO_OK = new Set(PROTOS.map((x) => `${x.chain}:${x.id}`)); // exchanges que a análise completa já lê
const tone = (v: number) => (v >= 0 ? "text-up" : "text-down");

export default async function PosicoesPage({ searchParams }: { searchParams: Promise<{ pool?: string; rede?: string; redes?: string | string[]; dex?: string | string[]; ordem?: string; min?: string; idade?: string; faixa?: string; t0?: string; t1?: string; tipo?: string }> }) {
  const user = await requireUser();
  if (user.plan !== "pro" && user.role !== "admin") return <><PageTitle title="Pools Position" /><Locked feature="Pools Position (exclusivo do plano Premium)" text="Veja as maiores posições de cada pool e quem está ganhando mais." /></>;
  const sp = await searchParams;
  const ready = readySources();
  const readyChains = [...new Set(ready.map((x) => x.chain))], readyDexes = [...new Set(ready.map((x) => x.dex))];
  const chain = NETWORKS.some((n) => n.id === sp.rede) ? sp.rede! : readyChains[0] ?? "Ethereum"; // usado só no modo "um pool"
  const sel = parseSelection([sp.redes ?? ""].flat().join(","), [sp.dex ?? ""].flat().join(","), { chains: readyChains.length ? readyChains : ["Ethereum"], dexes: readyDexes.length ? readyDexes : ["uniswap-v3"] });
  const [tokenA, tokenB] = parsePair(sp.t0 ?? "", sp.t1 ?? "");
  const kind = (KINDS.some(([k]) => k === sp.tipo) ? sp.tipo : "todos") as PoolKind | "todos";
  const pool = (sp.pool ?? "").trim();
  const ordem = SORTS[sp.ordem ?? ""] ? sp.ordem! : "valor";
  let data = null, error: string | null = null;
  if (pool) {
    if (!ADDRESS.test(pool)) error = "Endereço do pool inválido (0x + 40 caracteres).";
    else if (!graphEnabled()) error = "A chave do The Graph ainda não foi configurada no servidor.";
    else { try { data = await getTopPositions(chain, pool); if (!data) error = "Pool não encontrado nessa rede."; } catch (e) { error = e instanceof Error ? e.message : "erro"; } }
  }
  let board: BoardPosition[] = [], boardPools = 0, multi: MultiBoard | null = null;
  const minValue = [0, 1000, 10000, 100000].includes(Number(sp.min)) ? Number(sp.min) : 1000;
  const minAge = [0, 7, 30, 90, 180, 365].includes(Number(sp.idade)) ? Number(sp.idade) : 7;
  const onlyIn = sp.faixa === "1";
  const sortKey = (["apr", "roi", "pnl", "valor"].includes(sp.ordem ?? "") ? sp.ordem : "apr") as BoardFilter["sort"];
  if (!pool) {
    if (!graphEnabled()) error = `A chave do The Graph ainda não foi configurada no servidor.${user.role === "admin" ? ` (diagnóstico: ${envProbe()})` : ""}`;
    else {
      try {
        multi = await loadMulti(sel.chains, sel.dexes, tokenA, tokenB);
        boardPools = multi.pools;
        board = filterBoard(multi.positions, { minValue, minAgeDays: minAge, onlyInRange: onlyIn, sort: sortKey, limit: 300, kind });
        if (!multi.loaded && multi.errors.length) error = multi.errors.map((e) => `${netLabel(e.chain)} · ${dexLabel(e.dex)}: ${e.error}`).join(" | ");
      } catch (e) { error = e instanceof Error ? e.message : "erro"; }
    }
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
          <form method="get" className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <details className="relative"><summary className="input cursor-pointer select-none">{sel.chains.length === NETWORKS.length ? "Todas as redes" : `${sel.chains.length} rede(s)`}</summary>
                <div className="absolute z-10 mt-1 grid min-w-56 gap-1 rounded-lg border border-line bg-panel p-2 shadow-lg">
                  {NETWORKS.map((n) => { const any = EXCHANGES.some((e) => e.chains.includes(n.id) && sourceReady(n.id, e.id)); return <label key={n.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="redes" value={n.id} defaultChecked={sel.chains.includes(n.id)} /> {n.label}{!any && <span className="text-xs text-muted">· em breve</span>}</label>; })}
                </div></details>
              <details className="relative"><summary className="input cursor-pointer select-none">{sel.dexes.length === EXCHANGES.length ? "Todas as exchanges" : `${sel.dexes.length} exchange(s)`}</summary>
                <div className="absolute z-10 mt-1 grid min-w-56 gap-1 rounded-lg border border-line bg-panel p-2 shadow-lg">
                  {EXCHANGES.map((e) => <label key={e.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="dex" value={e.id} defaultChecked={sel.dexes.includes(e.id)} /> {e.label}{e.schema !== "uni3" && <span className="text-xs text-muted">· em breve</span>}</label>)}
                </div></details>
              <div><label className="label" htmlFor="t0">Token 1 (ex.: ETH)</label><input id="t0" name="t0" defaultValue={tokenA} className="input" placeholder="ETH, BTC, PEPE…" autoComplete="off" /></div>
              <div><label className="label" htmlFor="t1">Token 2 (ex.: USDC)</label><input id="t1" name="t1" defaultValue={tokenB} className="input" placeholder="USDC, WETH…" autoComplete="off" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
              <div><label className="label" htmlFor="tipo">Tipo de pool</label><select id="tipo" name="tipo" defaultValue={kind} className="input">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div><label className="label" htmlFor="ordem">Ordenar por</label><select id="ordem" name="ordem" defaultValue={sortKey} className="input">{Object.entries(SORTS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div><label className="label" htmlFor="min">Valor mínimo</label><select id="min" name="min" defaultValue={String(minValue)} className="input"><option value="0">Qualquer</option><option value="1000">US$ 1 mil</option><option value="10000">US$ 10 mil</option><option value="100000">US$ 100 mil</option></select></div>
              <div><label className="label" htmlFor="idade">Idade mínima</label><select id="idade" name="idade" defaultValue={String(minAge)} className="input"><option value="0">Qualquer</option><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="180">180 dias</option><option value="365">1 ano ou mais</option></select></div>
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="faixa" value="1" defaultChecked={onlyIn} /> Só dentro da faixa</label>
              <button className="btn btn-gold" type="submit">Filtrar</button>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted">Ranking das maiores posições das 25 maiores pools de cada rede e exchange (ou das pools do par buscado), atualizado a cada 30 minutos. “ETH” também encontra WETH e “BTC” encontra WBTC/cbBTC. Toque em “Analisar” para ver a posição inteira. Fontes ativas agora: {ready.length ? ready.map((x) => `${netLabel(x.chain)} · ${dexLabel(x.dex)}`).join(", ") : "nenhuma"}.</p>
          {multi && multi.pending.length > 0 && <p className="mt-2 text-xs text-muted">Ainda sem fonte de dados: {multi.pending.map((x) => `${netLabel(x.chain)} · ${dexLabel(x.dex)}`).join(", ")}.</p>}
          {multi && multi.errors.length > 0 && multi.loaded > 0 && <p className="mt-2 text-xs text-down">Falha ao ler: {multi.errors.map((e) => `${netLabel(e.chain)} · ${dexLabel(e.dex)} (${e.error})`).join("; ")}</p>}
          {error && <p className="mt-2 text-sm text-down">{error}</p>}
          {user.role === "admin" && !graphEnabled() && <GraphKeyForm />}
          {user.role === "admin" && graphEnabled() && <details className="mt-3"><summary className="cursor-pointer text-sm text-gold-soft">Fontes de dados (administrador)</summary><GraphSourcesForm networks={NETWORKS.filter((n) => n.family === "evm").map((n) => ({ id: n.id, label: n.label }))} exchanges={EXCHANGES.filter((e) => e.schema === "uni3").map((e) => ({ id: e.id, label: e.label }))} /></details>}
        </section>
      )}
      {!pool && !error && (
        <section className="card p-4">
          <h2 className="mb-1 font-semibold">{board.length} posições <span className="text-xs font-normal text-muted">· {boardPools} pools analisadas</span></h2>
          <div className="mt-3"><BoardTable rows={board.map((p): BoardRow => ({
            key: `${p.chain}-${p.dex}-${p.tokenId}`, pair: p.pair, fee: p.fee, source: `${netLabel(p.chain)} · ${dexLabel(p.dex)}`, owner: p.owner, chain: p.chain, dex: p.dex, tokenId: p.tokenId,
            canAnalyze: PROTO_OK.has(`${p.chain}:${p.dex}`), range: `${sig(p.priceLower)} ↔ ${sig(p.priceUpper)}`, inRange: p.inRange,
            valueUsd: p.valueUsd, feesUsd: p.feesCollectedUsd, pnlUsd: p.pnlUsd, roi: p.roi, apr: p.apr, ageDays: p.ageDays,
          }))} /></div>
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
