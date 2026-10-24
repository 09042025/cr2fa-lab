// Parte pura (sem servidor), usada também pelo navegador.
/** Vela diária: [dia em ms (UTC), abertura, máxima, mínima, fechamento, volume]. */
export type Candle = [number, number, number, number, number, number];

const DAY_MS = 86_400_000;

/**
 * Junta as velas da bolsa com a série de preço de fechamento (Coin Metrics), que cobre desde 2010.
 * Dias sem vela da bolsa viram uma vela "reta" (abertura = máxima = mínima = fechamento).
 */
export function mergeCandles(exchange: Candle[], closes: (number | null)[], startDay: number): Candle[] {
  const byDay = new Map<number, Candle>();
  for (const c of exchange) byDay.set(Math.floor(c[0] / DAY_MS), c);
  const out: Candle[] = [];
  for (let i = 0; i < closes.length; i++) {
    const day = startDay + i;
    const ex = byDay.get(day);
    if (ex) { out.push([day * DAY_MS, ex[1], ex[2], ex[3], ex[4], ex[5]]); continue; }
    const p = closes[i];
    if (p !== null && p !== undefined && p > 0) out.push([day * DAY_MS, p, p, p, p, 0]);
  }
  // Dias da bolsa depois do último dia da série de preço (a série só tem dia fechado).
  const lastDay = startDay + closes.length - 1;
  for (const c of exchange) {
    const d = Math.floor(c[0] / DAY_MS);
    if (d > lastDay) out.push([d * DAY_MS, c[1], c[2], c[3], c[4], c[5]]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

export type Timeframe = "1D" | "1W" | "1M";

/** Agrupa velas diárias em semanais (começando na segunda, UTC) ou mensais. */
export function aggregateCandles(daily: Candle[], tf: Timeframe): Candle[] {
  if (tf === "1D") return daily;
  const out: Candle[] = [];
  let curKey = "";
  for (const c of daily) {
    const d = new Date(c[0]);
    let key: string;
    let stamp: number;
    if (tf === "1M") {
      key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      stamp = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    } else {
      const back = (d.getUTCDay() + 6) % 7; // segunda = 0
      stamp = c[0] - back * DAY_MS;
      key = String(stamp);
    }
    const last = out[out.length - 1];
    if (key === curKey && last) {
      last[2] = Math.max(last[2], c[2]);
      last[3] = Math.min(last[3], c[3]);
      last[4] = c[4];
      last[5] += c[5];
    } else {
      curKey = key;
      out.push([stamp, c[1], c[2], c[3], c[4], c[5]]);
    }
  }
  return out;
}

/** Dias que cada vela cobre, para casar com as séries diárias on-chain. */
export const PERIOD_DAYS: Record<Timeframe, number> = { "1D": 1, "1W": 7, "1M": 31 };
