import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getQuote } from "@/lib/dividends";
import { cached, fetchJson, getAssetDetail } from "@/lib/market";

interface Chart { chart?: { result?: { meta?: { regularMarketPrice?: number } }[] } }

/** Preço em R$ pelo gráfico público do Yahoo (leve: 5 dias). */
async function yahooPrice(symbol: string): Promise<number | null> {
  for (const host of ["query1", "query2"]) {
    try {
      const j = await fetchJson<Chart>(`https://${host}.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`, {}, 12000);
      const p = j.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof p === "number" && p > 0) return p;
    } catch { /* tenta o próximo */ }
  }
  return null;
}

/** Cripto em R$: Yahoo (BTC-BRL) e, se falhar, CoinGecko (busca pelo símbolo). */
async function cryptoPrice(sym: string): Promise<{ price: number; name: string | null } | null> {
  const y = await yahooPrice(`${sym}-BRL`);
  if (y) return { price: y, name: null };
  try {
    const s = await cached<{ coins?: { id: string; name: string; symbol: string }[] }>(`gecko:search:${sym}`, 24 * 3600, () =>
      fetchJson(`https://api.coingecko.com/api/v3/search?query=${sym}`, {}, 12000));
    const coin = s.data?.coins?.find((c) => c.symbol.toUpperCase() === sym) ?? null;
    if (!coin) return null;
    const p = await cached<Record<string, { brl: number }>>(`gecko:brl:${coin.id}`, 60, () =>
      fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=brl`, {}, 12000));
    const price = p.data?.[coin.id]?.brl;
    return price ? { price, name: coin.name } : null;
  } catch { return null; }
}

/** Preço atual de ação/FII da B3 ou de cripto (BTC, ETH, SOL…), usado ao cadastrar posição. Premium. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("Recurso do plano Premium.", 403);
  const t = (new URL(req.url).searchParams.get("ticker") || "").trim().toUpperCase();
  if (/^[A-Z]{4}\d{1,2}$/.test(t)) {
    let price = (await getQuote(t)).data?.price ?? null;
    let name: string | null = null;
    if (price === null) price = await yahooPrice(`${t}.SA`);
    if (price === null) { const d = (await getAssetDetail(t)).data; price = d?.price ?? null; name = d?.name ?? null; }
    if (price === null) return fail("Não encontramos esse código na B3.", 404);
    return json({ ticker: t, kind: t.endsWith("11") ? "fiis" : "acoes", price, name });
  }
  if (/^[A-Z]{2,10}$/.test(t)) {
    const c = await cryptoPrice(t);
    if (!c) return fail("Não encontramos esse código.", 404);
    return json({ ticker: t, kind: "cripto", price: c.price, name: c.name });
  }
  return fail("Código inválido.");
}
