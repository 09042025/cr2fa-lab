import { cached, fetchJson } from "./market";

export interface LiqPoint { t: number; longUsd: number; shortUsd: number }
export type LiqInterval = "daily" | "1hour";

const BASE = "https://api.coinalyze.net/v1";

export const futuresEnabled = () => Boolean(process.env.COINALYZE_API_KEY);

const authHeaders = (): Record<string, string> => ({ api_key: process.env.COINALYZE_API_KEY || "" });

interface Market { symbol: string; exchange?: string; base_asset?: string; quote_asset?: string; is_perpetual?: boolean }

/** Contratos perpétuos do ativo nas principais corretoras (até 12), pela lista da Coinalyze. */
function perpSymbols(markets: Market[], base: string): string[] {
  return markets
    .filter((m) => m.is_perpetual !== false && m.base_asset === base && ["USDT", "USDC", "USD"].includes(m.quote_asset ?? ""))
    .map((m) => m.symbol)
    .filter((s) => typeof s === "string" && /^[A-Za-z0-9_.-]+$/.test(s))
    .slice(0, 12);
}

/** Soma por data (varias corretoras) e ordena. */
export function sumLiquidations(histories: { history?: { t: number; l?: number; s?: number }[] }[]): LiqPoint[] {
  const by = new Map<number, LiqPoint>();
  for (const h of histories) {
    for (const p of h.history ?? []) {
      if (!Number.isFinite(p.t)) continue;
      const cur = by.get(p.t) ?? { t: p.t, longUsd: 0, shortUsd: 0 };
      cur.longUsd += Number.isFinite(p.l) ? (p.l as number) : 0;
      cur.shortUsd += Number.isFinite(p.s) ? (p.s as number) : 0;
      by.set(p.t, cur);
    }
  }
  return [...by.values()].sort((a, b) => a.t - b.t);
}

/** Liquidações de futuros (longs e shorts, em US$) somadas nas principais corretoras. Exige COINALYZE_API_KEY (gratuita). */
export function getLiquidations(base: "BTC" | "ETH", interval: LiqInterval) {
  const days = interval === "daily" ? 90 : 2;
  return cached<LiqPoint[]>(`coinalyze:liq:${base}:${interval}:v1`, interval === "daily" ? 30 * 60 : 5 * 60, async () => {
    if (!futuresEnabled()) throw new Error("falta a chave COINALYZE_API_KEY");
    const markets = await cached<Market[]>("coinalyze:markets:v1", 24 * 3600, () => fetchJson<Market[]>(`${BASE}/future-markets`, { headers: authHeaders() }, 25000));
    if (!markets.data) throw new Error(markets.error || "lista de mercados indisponível");
    const symbols = perpSymbols(markets.data, base);
    if (symbols.length === 0) throw new Error("nenhum contrato encontrado");
    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 86400;
    const url = `${BASE}/liquidation-history?symbols=${encodeURIComponent(symbols.join(","))}&interval=${interval}&from=${from}&to=${to}&convert_to_usd=true`;
    const res = await fetchJson<{ history?: { t: number; l?: number; s?: number }[] }[]>(url, { headers: authHeaders() }, 30000);
    const out = sumLiquidations(res);
    if (out.length < 2) throw new Error("sem dados de liquidação");
    return out;
  });
}
