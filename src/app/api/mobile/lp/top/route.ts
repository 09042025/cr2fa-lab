import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { ADDRESS } from "@/lib/lppositions";
import { graphChains, graphEnabled } from "@/lib/graph";
import { filterBoard, getBoard, getTopPositions, type BoardFilter } from "@/lib/toppositions";

/** Pools Position: maiores posições de um pool (somente leitura). Exclusivo Premium. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  if (user.plan !== "pro" && user.role !== "admin") return fail("Exclusivo do plano Premium.", 403);
  const q = new URL(req.url).searchParams;
  const chains = graphChains();
  if (!q.get("pool")) {
    const chain = q.get("rede") ?? "";
    if (!chain) return json({ chains, enabled: graphEnabled(), data: null });
    if (!chains.includes(chain)) return fail("Rede inválida.", 400);
    if (!graphEnabled()) return fail("A chave do The Graph ainda não foi configurada no servidor.", 503);
    const num = (k: string, ok: number[], d: number) => (ok.includes(Number(q.get(k))) ? Number(q.get(k)) : d);
    const sort = (["apr", "roi", "pnl", "valor"].includes(q.get("ordem") ?? "") ? q.get("ordem") : "apr") as BoardFilter["sort"];
    try {
      const b = await getBoard(chain);
      return json({ chains, enabled: true, data: null, board: { chain, pools: b.pools, positions: filterBoard(b.positions, { minValue: num("min", [0, 1000, 10000, 100000], 1000), minAgeDays: num("idade", [0, 7, 30, 90], 7), onlyInRange: q.get("faixa") === "1", sort, limit: 60 }) } });
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
