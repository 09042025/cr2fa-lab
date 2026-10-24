import { cached, fetchJson } from "./market";
import type { Candle } from "./candles-core";

export { aggregateCandles, mergeCandles, PERIOD_DAYS } from "./candles-core";
export type { Candle, Timeframe } from "./candles-core";

interface BitstampPage { data?: { ohlc?: { timestamp: string; open: string; high: string; low: string; close: string; volume: string }[] } }

/** Velas diárias BTC/USD da Bitstamp (gratuito, sem chave). O histórico começa em 2011. */
export function getBitstampDaily() {
  return cached<Candle[]>("bitstamp:btcusd:1d:v1", 60 * 60, async () => {
    const out: Candle[] = [];
    let start = Math.floor(Date.UTC(2011, 7, 1) / 1000);
    const nowSec = Math.floor(Date.now() / 1000);
    for (let page = 0; page < 10 && start < nowSec; page++) {
      const res = await fetchJson<BitstampPage>(`https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=86400&limit=1000&start=${start}`, {}, 25000);
      const rows = res.data?.ohlc ?? [];
      for (const r of rows) {
        const c: Candle = [Number(r.timestamp) * 1000, Number(r.open), Number(r.high), Number(r.low), Number(r.close), Number(r.volume)];
        if (c.every((v) => Number.isFinite(v)) && c[1] > 0 && c[4] > 0) out.push(c);
      }
      if (rows.length < 1000) break;
      start = Number(rows[rows.length - 1].timestamp) + 86400;
    }
    if (out.length < 500) throw new Error("Bitstamp devolveu poucas velas");
    return out;
  });
}

