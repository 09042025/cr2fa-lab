import { cached } from "./market";
import { getLpPositions, type LpPosition } from "./lppositions";
import { loadDistribution, type Distribution } from "./liquidity";
import { DEXS_CHAIN, getPoolHistory, type HistPoint } from "./pooldetail";
import { dailyPrices, loadEvents, summarize, valueSeries, type Perf, type SeriesPoint } from "./lpperf";

export interface LpDetail {
  position: LpPosition; perf: Perf | null; series: SeriesPoint[]; dist: Distribution | null; history: HistPoint[];
  chart: { embed: string; page: string } | null; eventsOk: boolean; eventsError: string | null;
}

/** Tudo de uma posição: desempenho, séries, distribuição de liquidez e histórico do pool. Somente leitura. */
export async function getLpDetail(address: string, chain: string, tokenId: string): Promise<LpDetail | null> {
  const res = await getLpPositions(address);
  const position = res.chains.find((c) => c.chain === chain)?.positions.find((p) => p.tokenId === tokenId);
  if (!position) return null;
  const p = position;
  const [evRes, dist, history] = await Promise.all([
    cached(`lpev2:${chain}:${tokenId}`, 600, () => loadEvents(chain, tokenId, p.dec0, p.dec1)),
    // falha não pode ficar guardada: lança erro em vez de devolver null
    cached(`lpdist2:${chain}:${p.pool}`, 300, async () => { const x = await loadDistribution(chain, p.pool, p.token0, p.fee); if (!x) throw new Error("sem distribuição"); return x; }).then((r) => r.data ?? null),
    p.llamaId ? getPoolHistory(p.llamaId).catch(() => []) : Promise.resolve([] as HistPoint[]),
  ]);
  const events = evRes.data;
  let perf: Perf | null = null, series: SeriesPoint[] = [];
  if (events && p.usd0 && p.usd1) {
    perf = summarize(events, { t: Math.floor(Date.now() / 1000), amount0: p.amount0, amount1: p.amount1, fees0: p.fees0, fees1: p.fees1, u0: p.usd0, u1: p.usd1 });
    if (perf) {
      const start = Math.floor(perf.openedAt / 86400) * 86400;
      const days = Math.min(400, Math.ceil((Date.now() / 1000 - start) / 86400) + 1);
      const [a, b] = await Promise.all([dailyPrices(chain, p.token0, start, days), dailyPrices(chain, p.token1, start, days)]);
      series = valueSeries(events, p.lower, p.upper, p.dec0, p.dec1, a, b);
    }
  }
  const ds = DEXS_CHAIN[chain];
  const chart = ds ? { embed: `https://dexscreener.com/${ds}/${p.pool}?embed=1&theme=dark&trades=0&info=0&loadChartSettings=0`, page: `https://dexscreener.com/${ds}/${p.pool}` } : null;
  return { position, perf, series, dist, history, chart, eventsOk: events !== null, eventsError: events === null ? (evRes.error ?? null) : null };
}
