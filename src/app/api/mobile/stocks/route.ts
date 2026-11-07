import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getFiis, getStocks } from "@/lib/market";
import { FREE_LIMITS } from "@/lib/plans";

/** Ações (?k=acoes) e Fundos imobiliários (?k=fiis) para o app. Grátis vê o início da lista; Premium vê tudo, com filtro por setor e busca (mesma regra do site). */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const sp = new URL(req.url).searchParams;
  const fiis = sp.get("k") === "fiis";
  const res = fiis ? await getFiis() : await getStocks();
  const all = res.data ?? [];
  const pro = user.plan === "pro" || user.role === "admin";
  const sectors = [...new Set(all.map((q) => q.sector))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const setor = (sp.get("setor") ?? "").slice(0, 60);
  const term = (sp.get("q") ?? "").trim().toUpperCase().slice(0, 30);
  const bySector = pro && setor ? all.filter((q) => q.sector === setor) : all;
  const filtered = pro && term ? bySector.filter((q) => q.symbol.includes(term) || q.name.toUpperCase().includes(term)) : bySector;
  const rows = pro ? filtered : filtered.slice(0, fiis ? FREE_LIMITS.fiis : FREE_LIMITS.stocks);
  return json({ pro, total: all.length, shown: rows.length, sectors, rows, fetchedAt: res.fetchedAt, stale: res.stale, failed: res.data === null });
}
