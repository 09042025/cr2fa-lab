import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getAllPools } from "@/lib/market";
import { filterPools, poolKind, turnover } from "@/lib/pools";

/** HUB DEFI (exclusivo Premium): pools filtrados e ordenados, com os mesmos filtros do site. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  if (user.plan !== "pro" && user.role !== "admin") return fail("Exclusivo do plano Premium.", 403);
  const sp = Object.fromEntries(new URL(req.url).searchParams) as Record<string, string>;
  const tipo = sp.tipo === "rendimento" ? "rendimento" : "liquidez";
  const all = await getAllPools();
  if (!all.data) return fail("Não foi possível carregar os pools agora.", 503);
  const base = all.data.filter((p) => (tipo === "liquidez" ? p.dex : !p.dex));
  const rows = filterPools(all.data, { ...sp, tipo }).slice(0, 80);
  return json({
    tipo,
    total: filterPools(all.data, { ...sp, tipo }).length,
    chains: [...new Set(base.map((p) => p.chain))].sort(),
    pools: rows.map((p) => ({
      id: p.id, symbol: p.symbol, project: p.project, chain: p.chain, poolMeta: p.poolMeta, stablecoin: p.stablecoin, rwa: poolKind(p) === "rwa",
      tvlUsd: p.tvlUsd, volumeUsd1d: p.volumeUsd1d, turnover: turnover(p), apyBase: p.apyBase, apyReward: p.apyReward, apy: p.apy, apyMean30d: p.apyMean30d, il7d: p.il7d,
    })),
    fetchedAt: all.fetchedAt, stale: all.stale,
  });
}
