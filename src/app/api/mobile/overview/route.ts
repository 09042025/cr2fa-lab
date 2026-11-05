import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getCryptoMarkets, getDefiPools, getRates } from "@/lib/market";

/** Visão geral do app: os mesmos dados da página "Visão geral" do site. */
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const [rates, coins, pools] = await Promise.all([getRates(), getCryptoMarkets(), getDefiPools()]);
  return json({
    rates: { selic: rates.data?.selic ?? null, cdi: rates.data?.cdi ?? null, ipca12m: rates.data?.ipca12m ?? null, updatedAt: rates.data?.updatedAt ?? null },
    coins: (coins.data ?? []).slice(0, 5).map((c) => ({ id: c.id, symbol: c.symbol, name: c.name, priceUsd: c.priceUsd, change24h: c.change24h, image: c.image ?? null })),
    pools: (pools.data ?? []).slice(0, 5).map((p) => ({ id: p.id, symbol: p.symbol, project: p.project, chain: p.chain, tvlUsd: p.tvlUsd, apy: p.apy })),
    fetchedAt: coins.fetchedAt,
  });
}
