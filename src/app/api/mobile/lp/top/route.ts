import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { ADDRESS } from "@/lib/lppositions";
import { graphChains, graphEnabled } from "@/lib/graph";
import { getTopPositions } from "@/lib/toppositions";

/** Pools Position: maiores posições de um pool (somente leitura). Exclusivo Premium. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  if (user.plan !== "pro" && user.role !== "admin") return fail("Exclusivo do plano Premium.", 403);
  const q = new URL(req.url).searchParams;
  const chains = graphChains();
  if (!q.get("pool")) return json({ chains, enabled: graphEnabled(), data: null });
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
