import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { ADDRESS, PROTOS } from "@/lib/lppositions";
import { graphEnabled } from "@/lib/graph";
import { loadMulti, parseSelection } from "@/lib/boards";
import { EXCHANGES, NETWORKS, readySources, sourceReady } from "@/lib/sources";
import { filterBoard, getTopPositions, parsePair, KINDS, type BoardFilter, type PoolKind } from "@/lib/toppositions";

/** Pools Position: maiores posições de um pool (somente leitura). Exclusivo Premium. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  if (user.plan !== "pro" && user.role !== "admin") return fail("Exclusivo do plano Premium.", 403);
  const q = new URL(req.url).searchParams;
  const ready = readySources();
  const chains = [...new Set(ready.map((x) => x.chain))];
  if (!q.get("pool")) {
    const meta = {
      networks: NETWORKS.map((n) => ({ id: n.id, label: n.label, ready: EXCHANGES.some((e) => e.chains.includes(n.id) && sourceReady(n.id, e.id)) })),
      exchanges: EXCHANGES.map((e) => ({ id: e.id, label: e.label, ready: e.chains.some((c) => sourceReady(c, e.id)) })),
      kinds: KINDS.map(([id, label]) => ({ id, label })),
    };
    if (!q.get("redes") && !q.get("dex") && !q.get("buscar")) return json({ chains, enabled: graphEnabled(), data: null, meta });
    if (!graphEnabled()) return fail("A chave do The Graph ainda não foi configurada no servidor.", 503);
    const num = (k: string, ok: number[], d: number) => (ok.includes(Number(q.get(k))) ? Number(q.get(k)) : d);
    const sort = (["apr", "roi", "pnl", "valor"].includes(q.get("ordem") ?? "") ? q.get("ordem") : "apr") as BoardFilter["sort"];
    const sel = parseSelection(q.get("redes") ?? undefined, q.get("dex") ?? undefined, { chains: chains.length ? chains : ["Ethereum"], dexes: ["uniswap-v3"] });
    const [ta, tb] = parsePair(q.get("t0") ?? "", q.get("t1") ?? "");
    const kind = (KINDS.some(([k]) => k === q.get("tipo")) ? q.get("tipo") : "todos") as PoolKind | "todos";
    try {
      const m = await loadMulti(sel.chains, sel.dexes, ta, tb);
      if (!m.loaded && m.errors.length) return fail(m.errors.map((e) => `${e.chain}/${e.dex}: ${e.error}`).join(" | "), 502);
      const positions = filterBoard(m.positions, { minValue: num("min", [0, 1000, 10000, 100000], 1000), minAgeDays: num("idade", [0, 7, 30, 90, 180, 365], 7), onlyInRange: q.get("faixa") === "1", sort, limit: 60, kind });
      return json({ chains, enabled: true, data: null, meta, board: { pools: m.pools, positions: positions.map((x) => ({ ...x, canAnalyze: PROTOS.some((r) => r.chain === x.chain && r.id === x.dex) })), pending: m.pending, errors: m.errors } });
    } catch (e) {
      return fail(e instanceof Error ? e.message : "erro ao consultar", 502);
    }
  }
  const chain = q.get("rede") ?? "", pool = (q.get("pool") ?? "").trim();
  if (!chains.includes(chain) || !ADDRESS.test(pool)) return fail("Rede ou endereço do pool inválido.", 400);
  if (!graphEnabled()) return fail("A chave do The Graph ainda não foi configurada no servidor.", 503);
  try {
    const data = await getTopPositions(chain, pool);
    return data ? json({ chains, enabled: true, data }) : fail("Pool não encontrado nessa rede.", 404);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "erro ao consultar", 502);
  }
}
