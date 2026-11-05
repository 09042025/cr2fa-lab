import { cached, fetchJson } from "./market";

/** Preço do Bitcoin em dólar quase em tempo real: tenta Binance, Coinbase e Kraken (APIs públicas, sem chave). */
export interface Spot { usd: number; source: string; ts: number }

const valid = (n: number) => Number.isFinite(n) && n > 100 && n < 10_000_000;

export const parseBinance = (j: unknown): number => Number((j as { price?: string })?.price);
export const parseCoinbase = (j: unknown): number => Number((j as { data?: { amount?: string } })?.data?.amount);
export const parseKraken = (j: unknown): number => Number((j as { result?: Record<string, { c?: string[] }> })?.result && Object.values((j as { result: Record<string, { c?: string[] }> }).result)[0]?.c?.[0]);

const SOURCES: { name: string; url: string; parse: (j: unknown) => number }[] = [
  { name: "Binance", url: "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", parse: parseBinance },
  { name: "Coinbase", url: "https://api.coinbase.com/v2/prices/BTC-USD/spot", parse: parseCoinbase },
  { name: "Kraken", url: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD", parse: parseKraken },
];

async function load(): Promise<Spot> {
  for (const s of SOURCES) {
    try {
      const usd = s.parse(await fetchJson<unknown>(s.url, {}, 3500));
      if (valid(usd)) return { usd, source: s.name, ts: Math.floor(Date.now() / 1000) };
    } catch { /* tenta a próxima fonte */ }
  }
  throw new Error("Preço ao vivo indisponível");
}

/** Cache de 3 segundos: muitos usuários consultando não passam do limite das corretoras. */
export function getBtcSpot() {
  return cached<Spot>("spot:btcusd", 3, load);
}
