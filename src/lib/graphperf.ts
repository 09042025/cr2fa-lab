import { graphEnabled, graphQuery } from "./graph";
import type { Perf } from "./lpperf";

interface GP {
  depositedToken0: string; depositedToken1: string; withdrawnToken0: string; withdrawnToken1: string;
  collectedFeesToken0: string; collectedFeesToken1: string; transaction: { timestamp: string };
}

/** Monta o desempenho a partir do total de depósitos/retiradas/taxas do indexador. Mesma referência HOLD (preços de hoje). */
export function perfFromTotals(g: GP, now: { amount0: number; amount1: number; fees0: number; fees1: number; u0: number; u1: number }, t: number): Perf | null {
  const inv0 = Number(g.depositedToken0), inv1 = Number(g.depositedToken1), w0 = Number(g.withdrawnToken0), w1 = Number(g.withdrawnToken1);
  let c0 = Number(g.collectedFeesToken0), c1 = Number(g.collectedFeesToken1);
  const opened = Number(g.transaction.timestamp);
  if (![inv0, inv1, w0, w1, c0, c1, opened].every(Number.isFinite) || !(opened > 0)) return null;
  const { u0, u1 } = now;
  const investedUsd = inv0 * u0 + inv1 * u1;
  if (!(investedUsd > 0)) return null;
  const value = now.amount0 * u0 + now.amount1 * u1;
  // bug conhecido do indexador: taxas coletadas absurdas. Nesse caso elas ficam de fora (o PnL passa a contar só o que dá para confirmar).
  if (!(c0 >= 0 && c1 >= 0) || c0 * u0 + c1 * u1 > investedUsd * 3) { c0 = 0; c1 = 0; }
  const withdrawnUsd = w0 * u0 + w1 * u1, collectedUsd = c0 * u0 + c1 * u1, uncollectedUsd = now.fees0 * u0 + now.fees1 * u1;
  const totalFeesUsd = collectedUsd + uncollectedUsd;
  const ageDays = Math.max((t - opened) / 86400, 1 / 24);
  const divergenceUsd = value + withdrawnUsd - investedUsd, pnlUsd = divergenceUsd + totalFeesUsd, roi = pnlUsd / investedUsd;
  return {
    openedAt: opened, ageDays, invested0: inv0, invested1: inv1, investedUsd, withdrawnUsd, collected0: c0, collected1: c1, collectedUsd, uncollectedUsd, totalFeesUsd,
    avgDailyFeesUsd: totalFeesUsd / ageDays, pnlUsd, roi, apr: roi * (365 / ageDays), feeApr: (totalFeesUsd / investedUsd) * (365 / ageDays), divergenceUsd,
    diff0: now.amount0 + w0 - inv0, diff1: now.amount1 + w1 - inv1,
  };
}

export async function positionFromGraph(chain: string, tokenId: string, now: Parameters<typeof perfFromTotals>[1]): Promise<Perf | null> {
  if (!graphEnabled()) return null;
  const q = `query($id:ID!){ position(id:$id){ depositedToken0 depositedToken1 withdrawnToken0 withdrawnToken1 collectedFeesToken0 collectedFeesToken1 transaction{timestamp} } }`;
  const d = await graphQuery<{ position: GP | null }>(chain, "v3", q, { id: tokenId });
  return d.position ? perfFromTotals(d.position, now, Math.floor(Date.now() / 1000)) : null;
}
