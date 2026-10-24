import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getCryptoMarkets } from "@/lib/market";
import { FREE_LIMITS } from "@/lib/plans";

/** Ranking de criptomoedas para o app. Grátis vê o início da lista; Pró vê tudo (mesma regra do site). */
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const res = await getCryptoMarkets();
  const all = res.data ?? [];
  const pro = user.plan === "pro";
  const coins = (pro ? all : all.slice(0, FREE_LIMITS.crypto)).map((c) => ({
    id: c.id, symbol: c.symbol, name: c.name, priceUsd: c.priceUsd, change24h: c.change24h, change7d: c.change7d, marketCapUsd: c.marketCapUsd, image: c.image ?? null,
  }));
  return json({ coins, limited: !pro && all.length > coins.length, fetchedAt: res.fetchedAt, stale: res.stale, failed: res.data === null });
}
