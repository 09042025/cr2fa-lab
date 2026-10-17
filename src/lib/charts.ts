/**
 * Montagem dos destinos de gráfico. Os parâmetros vêm da URL, então tudo é
 * validado por regex antes de virar símbolo ou link.
 */

export type ChartKind = "cripto" | "b3";

const TICKER = /^[A-Z0-9]{2,10}$/;
const COIN_ID = /^[a-z0-9][a-z0-9-]{0,60}$/;

/** Cripto sem par USDT na Binance usa outro par de referência. */
const CRYPTO_OVERRIDE: Record<string, string> = {
  USDT: "KRAKEN:USDTUSD",
  USDC: "KRAKEN:USDCUSD",
  DAI: "KRAKEN:DAIUSD",
};

export function isKind(v: string | undefined): v is ChartKind {
  return v === "cripto" || v === "b3";
}

export function cleanTicker(v: string | undefined): string | null {
  const t = (v || "").trim().toUpperCase();
  return TICKER.test(t) ? t : null;
}

export function cleanCoinId(v: string | undefined): string | null {
  const t = (v || "").trim().toLowerCase();
  return COIN_ID.test(t) ? t : null;
}

/** Símbolo no formato do TradingView, ou null quando não há como mapear. */
export function tradingViewSymbol(kind: ChartKind, ticker: string): string | null {
  if (!TICKER.test(ticker)) return null;
  if (kind === "b3") return `BMFBOVESPA:${ticker}`;
  return CRYPTO_OVERRIDE[ticker] ?? `BINANCE:${ticker}USDT`;
}

export interface ChartLink { label: string; url: string }

export function chartLinks(kind: ChartKind, ticker: string, coinId: string | null): ChartLink[] {
  const sym = tradingViewSymbol(kind, ticker);
  const links: ChartLink[] = [];
  if (sym) links.push({ label: "Abrir no TradingView", url: `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}` });
  if (kind === "cripto" && coinId) links.push({ label: "Ver no CoinGecko", url: `https://www.coingecko.com/en/coins/${coinId}` });
  if (kind === "b3") links.push({ label: "Ver no Google Finance", url: `https://www.google.com/finance/quote/${ticker}:BVMF` });
  return links;
}

/** Endereço interno da página de gráfico. */
export function chartHref(kind: ChartKind, ticker: string, opts: { nome?: string; id?: string; de?: "acoes" | "fiis" } = {}): string {
  const qs = new URLSearchParams({ tipo: kind, ativo: ticker });
  if (opts.nome) qs.set("nome", opts.nome.slice(0, 80));
  if (opts.id) qs.set("id", opts.id);
  if (opts.de) qs.set("de", opts.de);
  return `/painel/grafico?${qs.toString()}`;
}
