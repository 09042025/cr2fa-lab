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

/** Acha a cripto por símbolo (BTC) ou nome (Bitcoin); usado para completar posições antigas sem código. */
export async function findCoin(query: string): Promise<{ id: string; name: string; symbol: string } | null> {
  const q = query.trim();
  if (!q) return null;
  const s = await cached<{ coins?: { id: string; name: string; symbol: string }[] }>(`gecko:search:${q.toLowerCase()}`, 24 * 3600, () =>
    fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, {}, 12000));
  const list = s.data?.coins ?? [];
  const c = list.find((x) => x.symbol.toUpperCase() === q.toUpperCase()) ?? list.find((x) => x.name.toLowerCase() === q.toLowerCase()) ?? null;
  return c ? { id: c.id, name: c.name, symbol: c.symbol.toUpperCase() } : null;
}

/** Completa o código de posições antigas (cripto pelo nome; ação/FII quando o nome já é o código). */
export async function backfillTickers(userId: number): Promise<void> {
  const { db } = await import("./db");
  const rows = db().prepare("SELECT id, block, label FROM holdings WHERE user_id = ? AND ticker IS NULL AND block IN ('cripto','acoes','fiis')").all(userId) as { id: number; block: string; label: string }[];
  for (const r of rows) {
    const label = r.label.trim().toUpperCase();
    let t: string | null = null;
    if (r.block === "cripto") { try { t = (await findCoin(r.label))?.symbol ?? null; } catch { t = null; } }
    else if (/^[A-Z]{4}\d{1,2}$/.test(label)) t = label;
    if (t && /^([A-Z]{4}\d{1,2}|[A-Z]{2,10})$/.test(t)) db().prepare("UPDATE holdings SET ticker = ? WHERE id = ?").run(t, r.id);
  }
}
