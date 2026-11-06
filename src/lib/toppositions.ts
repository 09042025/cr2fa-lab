import { cached } from "./market";
import { graphQuery } from "./graph";
import { positionAmounts, tickToPrice } from "./lppositions";
import { usdPrices } from "./pooldetail";

/** Pools Position: as maiores posições de um pool da Uniswap v3, com desempenho. Somente leitura (indexador público). */

interface RawPos {
  id: string; owner: string; liquidity: string; tickLower: { tickIdx: string }; tickUpper: { tickIdx: string };
  depositedToken0: string; depositedToken1: string; withdrawnToken0: string; withdrawnToken1: string;
  collectedFeesToken0: string; collectedFeesToken1: string; transaction: { timestamp: string };
}
interface RawPool { id: string; feeTier: string; sqrtPrice: string; tick: string; token0: { id: string; symbol: string; decimals: string }; token1: { id: string; symbol: string; decimals: string } }

export interface TopPosition {
  tokenId: string; owner: string; lower: number; upper: number; priceLower: number; priceUpper: number; inRange: boolean;
  valueUsd: number; feesCollectedUsd: number; pnlUsd: number; roi: number; apr: number | null; ageDays: number;
}
export interface TopResult {
  chain: string; pool: string; pair: string; fee: number; price: number; symbol0: string; symbol1: string; positions: TopPosition[]; fetchedAt: number;
}

const Q = `query($pool:String!){
  pool(id:$pool){ id feeTier sqrtPrice tick token0{id symbol decimals} token1{id symbol decimals} }
  positions(first:100, orderBy:liquidity, orderDirection:desc, where:{pool:$pool, liquidity_gt:"0"}){
    id owner liquidity tickLower{tickIdx} tickUpper{tickIdx}
    depositedToken0 depositedToken1 withdrawnToken0 withdrawnToken1 collectedFeesToken0 collectedFeesToken1 transaction{timestamp}
  }
}`;

/** Converte a resposta do indexador em posições com valor, taxas já coletadas, PnL, ROI e APR (tudo a preços de hoje, referência HOLD). */
export function rankPositions(pool: RawPool, raws: RawPos[], u0: number, u1: number, now: number): TopPosition[] {
  const d0 = Number(pool.token0.decimals), d1 = Number(pool.token1.decimals);
  const sqrtP = Number(pool.sqrtPrice) / 2 ** 96, tick = Number(pool.tick);
  return raws.flatMap((r) => {
    const lo = Number(r.tickLower.tickIdx), hi = Number(r.tickUpper.tickIdx), L = Number(r.liquidity);
    const [a0, a1] = positionAmounts(L, sqrtP, lo, hi, d0, d1);
    const value = a0 * u0 + a1 * u1;
    if (!(value >= 2)) return [];
    const deposited = Number(r.depositedToken0) * u0 + Number(r.depositedToken1) * u1;
    const withdrawn = Number(r.withdrawnToken0) * u0 + Number(r.withdrawnToken1) * u1;
    const fees = Number(r.collectedFeesToken0) * u0 + Number(r.collectedFeesToken1) * u1;
    const pnl = value + withdrawn + fees - deposited;
    const roi = deposited > 0 ? pnl / deposited : 0;
    const ageDays = Math.max(0, (now - Number(r.transaction.timestamp)) / 86400);
    return [{
      tokenId: r.id, owner: r.owner, lower: lo, upper: hi, priceLower: tickToPrice(lo, d0, d1), priceUpper: tickToPrice(hi, d0, d1), inRange: tick >= lo && tick < hi,
      valueUsd: value, feesCollectedUsd: fees, pnlUsd: pnl, roi, apr: ageDays >= 1 ? roi * (365 / ageDays) : null, ageDays,
    }];
  });
}

export async function getTopPositions(chain: string, poolAddress: string): Promise<TopResult | null> {
  const pool = poolAddress.toLowerCase();
  const r = await cached<TopResult | null>(`toppos:${chain}:${pool}`, 600, async () => {
    const data = await graphQuery<{ pool: RawPool | null; positions: RawPos[] }>(chain, "v3", Q, { pool });
    if (!data.pool) return null;
    const px = await usdPrices(chain, [data.pool.token0.id, data.pool.token1.id]);
    const u0 = px[data.pool.token0.id], u1 = px[data.pool.token1.id];
    if (!u0 || !u1) throw new Error("sem preço em dólar para os tokens deste pool");
    const d0 = Number(data.pool.token0.decimals), d1 = Number(data.pool.token1.decimals);
    return {
      chain, pool, pair: `${data.pool.token0.symbol}/${data.pool.token1.symbol}`, fee: Number(data.pool.feeTier), symbol0: data.pool.token0.symbol, symbol1: data.pool.token1.symbol,
      price: tickToPrice(Number(data.pool.tick), d0, d1), positions: rankPositions(data.pool, data.positions, u0, u1, Math.floor(Date.now() / 1000)), fetchedAt: Math.floor(Date.now() / 1000),
    };
  });
  if (r.data === undefined || (r.data === null && r.error)) throw new Error(r.error ?? "erro");
  return r.data;
}
