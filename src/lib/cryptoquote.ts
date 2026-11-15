import { cached, fetchJson } from "./market";

interface Chart { chart?: { result?: { meta?: { regularMarketPrice?: number } }[] } }

/** Preço em R$ pelo gráfico público do Yahoo (leve: 5 dias). */
export async function yahooPrice(symbol: string): Promise<number | null> {
  for (const host of ["query1", "query2"]) {
    try {
      const j = await fetchJson<Chart>(`https://${host}.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`, {}, 12000);
      const p = j.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof p === "number" && p > 0) return p;
    } catch { /* tenta o próximo */ }
  }
  return null;
}

/** Id do CoinGecko a partir do símbolo (BTC → bitcoin). A busca já vem ordenada por valor de mercado. */
export async function coinIdOf(sym: string): Promise<{ id: string; name: string } | null> {
  const s = await cached<{ coins?: { id: string; name: string; symbol: string }[] }>(`gecko:search:${sym}`, 24 * 3600, () =>
    fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(sym)}`, {}, 12000));
  const c = s.data?.coins?.find((x) => x.symbol.toUpperCase() === sym);
  return c ? { id: c.id, name: c.name } : null;
}

/** Cripto em R$: Yahoo (BTC-BRL) e, se falhar, CoinGecko. */
export async function cryptoPrice(sym: string): Promise<{ price: number; name: string | null } | null> {
  const y = await yahooPrice(`${sym}-BRL`);
  if (y) return { price: y, name: null };
  try {
    const coin = await coinIdOf(sym);
    if (!coin) return null;
    const p = await cached<Record<string, { brl: number }>>(`gecko:brl:${coin.id}`, 60, () =>
      fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=brl`, {}, 12000));
    const price = p.data?.[coin.id]?.brl;
    return price ? { price, name: coin.name } : null;
  } catch { return null; }
}
