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

interface SearchCoin { id: string; name: string; symbol: string; market_cap_rank?: number | null }
/** Entre os resultados que casam, fica o de maior valor de mercado (menor rank); sem rank = golpe/moeda minúscula, vai por último. */
function pickCoin(list: SearchCoin[], match: (c: SearchCoin) => boolean): SearchCoin | null {
  return list.filter(match).sort((a, b) => (a.market_cap_rank ?? 1e9) - (b.market_cap_rank ?? 1e9))[0] ?? null;
}

/** Principais criptos: id e nome fixos (evita busca ambígua ou limite da API). */
export const KNOWN_COINS: Record<string, { id: string; name: string }> = {
  BTC: { id: "bitcoin", name: "Bitcoin" }, ETH: { id: "ethereum", name: "Ethereum" }, SOL: { id: "solana", name: "Solana" },
  USDC: { id: "usd-coin", name: "USDC" }, USDT: { id: "tether", name: "Tether" }, BNB: { id: "binancecoin", name: "BNB" },
  XRP: { id: "ripple", name: "XRP" }, ADA: { id: "cardano", name: "Cardano" }, DOGE: { id: "dogecoin", name: "Dogecoin" },
};
const NAME_TO_SYM: Record<string, string> = { BITCOIN: "BTC", ETHEREUM: "ETH", SOLANA: "SOL", "USD COIN": "USDC", TETHER: "USDT", XRP: "XRP", CARDANO: "ADA", DOGECOIN: "DOGE", BNB: "BNB" };

/** Cripto na carteira: bloco Cripto, ou Reserva para oportunidades com código (ex.: USDC). */
export const isCryptoHolding = (h: { block: string; ticker: string | null }) => h.block === "cripto" || (h.block === "oportunidades" && !!h.ticker);

/** Id do CoinGecko a partir do símbolo (BTC → bitcoin). A busca já vem ordenada por valor de mercado. */
export async function coinIdOf(sym: string): Promise<{ id: string; name: string } | null> {
  if (KNOWN_COINS[sym]) return KNOWN_COINS[sym];
  const s = await cached<{ coins?: SearchCoin[] }>(`gecko:search:v2:${sym}`, 24 * 3600, () =>
    fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(sym)}`, {}, 12000));
  const c = pickCoin(s.data?.coins ?? [], (x) => x.symbol.toUpperCase() === sym);
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
  const known = KNOWN_COINS[q.toUpperCase()] ? q.toUpperCase() : NAME_TO_SYM[q.toUpperCase()];
  if (known) return { ...KNOWN_COINS[known], symbol: known };
  const s = await cached<{ coins?: SearchCoin[] }>(`gecko:search:v2:${q.toLowerCase()}`, 24 * 3600, () =>
    fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, {}, 12000));
  const list = s.data?.coins ?? [];
  const c = pickCoin(list, (x) => x.symbol.toUpperCase() === q.toUpperCase()) ?? pickCoin(list, (x) => x.name.toLowerCase() === q.toLowerCase());
  return c ? { id: c.id, name: c.name, symbol: c.symbol.toUpperCase() } : null;
}

/** Ação/ETF/BDR fora da B3 (ex.: AAPL): código só com letras, sem número. */
export const isUsStock = (h: { block: string; ticker: string | null }) => (h.block === "acoes" || h.block === "fiis") && !!h.ticker && !/^[A-Z]{4}\d{1,2}$/.test(h.ticker);

/** Logo de empresa americana (fonte aberta de logos por código). */
const LOGO_OVERRIDE: Record<string, string[]> = {
  SPCX: ["https://www.google.com/s2/favicons?domain=spacex.com&sz=128", "https://icons.duckduckgo.com/ip3/spacex.com.ico"],
};
export const usLogo = (t: string) => LOGO_OVERRIDE[t] ?? [`https://assets.parqet.com/logos/symbol/${t}?format=png`, `https://financialmodelingprep.com/image-stock/${t}.png`];

async function usRate(): Promise<number | null> { return yahooPrice("BRL=X"); }

/** Preço em R$ de uma ação americana: cotação em dólar × dólar do dia. */
export async function usPrice(sym: string): Promise<number | null> {
  const [p, r] = await Promise.all([yahooPrice(sym), usRate()]);
  return p && r ? p * r : null;
}

interface YSearch { quotes?: { symbol?: string; quoteType?: string; shortname?: string }[] }
/** Descobre o código americano a partir do nome digitado (ex.: AAPLE → AAPL). */
async function findUsSymbol(label: string): Promise<string | null> {
  const q = label.trim();
  if (!q) return null;
  const upper = q.toUpperCase();
  for (const c of [upper, upper.slice(0, -1)]) if (/^[A-Z]{1,5}$/.test(c) && (await yahooPrice(c))) return c; // AAPLE → AAPL
  try {
    const r = await cached<YSearch>(`yahoo:search:${upper}`, 24 * 3600, () => fetchJson(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=6&newsCount=0`, {}, 12000));
    const hit = r.data?.quotes?.find((x) => x.symbol && /^[A-Z]{1,5}$/.test(x.symbol) && (x.quoteType === "EQUITY" || x.quoteType === "ETF"));
    return hit?.symbol ?? null;
  } catch { return null; }
}

/** Completa/corrige o código das posições: cripto conhecida pelo nome, ação/FII cujo nome já é o código e ações americanas. */
export async function backfillTickers(userId: number): Promise<void> {
  const { db } = await import("./db");
  const rows = db().prepare("SELECT id, block, label, ticker FROM holdings WHERE user_id = ? AND block IN ('cripto','acoes','fiis','oportunidades')").all(userId) as { id: number; block: string; label: string; ticker: string | null }[];
  for (const r of rows) {
    const label = r.label.trim().toUpperCase();
    let t: string | null = null;
    if (r.block === "oportunidades") { if (r.ticker) continue; t = KNOWN_COINS[label] ? label : NAME_TO_SYM[label] ?? null; }
    else if (r.block === "cripto") {
      const known = KNOWN_COINS[label] ? label : NAME_TO_SYM[label];
      if (known) t = known; // conserta códigos errados gravados antes (moedas homônimas)
      else if (!r.ticker) { try { t = (await findCoin(r.label))?.symbol ?? null; } catch { t = null; } }
    } else if (!r.ticker) {
      if (/^[A-Z]{4}\d{1,2}$/.test(label)) t = label;
      else { try { t = await findUsSymbol(r.label); } catch { t = null; } }
    }
    if (t && t !== r.ticker && /^([A-Z]{4}\d{1,2}|[A-Z]{1,10})$/.test(t)) db().prepare("UPDATE holdings SET ticker = ? WHERE id = ?").run(t, r.id);
  }
}
