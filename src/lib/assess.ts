/**
 * Avaliação de um ativo: lista de indicadores com selo (bom / atenção / ruim) e a contagem de "pontos de atenção".
 * Ações e FIIs usam os dados abertos da CVM; cripto usa indicadores de mercado (CoinGecko).
 * Informativo, não é recomendação de investimento.
 */
import { analyzeFii, analyzeStock, type Indicator, type Status } from "./indicators";
import { companyByName, companyInd, companyOf, getCvmData, getCvmInd, getFiiData, getFiiImoveis } from "./cvm";
import { getQuote, monthsPaid, sumBetween, type Quote } from "./dividends";
import { getAssetDetail, getCoinDetail } from "./market";
import { coinIdOf, isCryptoHolding, isUsStock } from "./cryptoquote";

export interface Assessment {
  kind: "acao" | "fii" | "cripto";
  indicators: Indicator[];
  /** Indicadores com selo (sem os "informativos"). */
  total: number;
  bad: number;
  warn: number;
  good: number;
  period: string | null;
  notice: string | null;
  source: string;
  logo: string | null;
  name: string | null;
  quote: Quote | null;
  quoteError: string | null;
  /** Só cripto: id no CoinGecko (para abrir a página do ativo). */
  coinId: string | null;
}

/** Nomes na CVM de empresas grandes cujo nome na fonte de cotação costuma não bater. */
const CVM_ALIAS: Record<string, string> = {
  PETR: "Petróleo Brasileiro Petrobras", BRAP: "Bradespar", VALE: "Vale", ITUB: "Itaú Unibanco Holding", BBDC: "Banco Bradesco", BBAS: "Banco do Brasil",
  ABEV: "Ambev", WEGE: "WEG", SUZB: "Suzano", GGBR: "Gerdau", GOAU: "Metalúrgica Gerdau", CMIG: "Companhia Energética de Minas Gerais Cemig",
  ELET: "Centrais Elétricas Brasileiras Eletrobras", SANB: "Banco Santander Brasil", BBSE: "BB Seguridade", PSSA: "Porto Seguro", ISAE: "ISA Energia Brasil",
  BRSR: "Banco do Estado do Rio Grande do Sul Banrisul", RENT: "Localiza", RADL: "Raia Drogasil", LREN: "Lojas Renner", EQTL: "Equatorial", SBSP: "Sabesp",
};

export const isFiiTicker = (t: string) => /11$/.test(t);

export function summarize(list: Indicator[]) {
  const rated = list.filter((i) => i.status !== "nd");
  const count = (s: Status) => rated.filter((i) => i.status === s).length;
  return { total: rated.length, bad: count("ruim"), warn: count("atencao"), good: count("bom") };
}

/** Mais da metade dos indicadores ruins. */
export const isCritical = (a: { total: number; bad: number }) => a.total > 0 && a.bad / a.total > 0.5;

export async function assessStockOrFii(ticker: string, isFii: boolean, hint?: { name?: string | null; marketCap?: number | null; price?: number | null; quote?: Quote | null }): Promise<Assessment> {
  const today = new Date().toISOString().slice(0, 10);
  const detail = hint ? null : (await getAssetDetail(ticker)).data;
  const name = hint?.name ?? detail?.name ?? null;
  const marketCap = hint?.marketCap ?? detail?.marketCap ?? null;
  const brapiPrice = hint?.price ?? detail?.price ?? null;
  const q = hint?.quote !== undefined ? { data: hint.quote, error: undefined as string | undefined } : await getQuote(ticker);
  const quote = q.data;
  const price = quote?.price ?? brapiPrice;
  const from12 = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const from24 = new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10);
  const div12 = quote ? sumBetween(quote.dividends, from12, today) : null;
  const div12Prev = quote ? sumBetween(quote.dividends, from24, from12) : null;

  let indicators: Indicator[] = [];
  let period: string | null = null;
  let notice: string | null = null;
  let source = "";
  if (isFii) {
    const fii = getFiiData();
    const rec = fii.data?.byPrefix[ticker.slice(0, 4)] ?? null;
    const imv = getFiiImoveis();
    const imoveis = rec?.cnpj && imv.data ? imv.data[rec.cnpj] ?? null : null;
    indicators = analyzeFii({
      imoveis,
      price, dividends12m: quote ? div12 : null, vpa: rec?.vpa ?? null, patrimonio: rec?.patrimonio ?? null, cotistas: rec?.cotistas ?? null,
      taxaAdm: rec?.taxaAdm ?? null, div12mPrev: div12Prev, monthsPaid: quote ? monthsPaid(quote.dividends, today) : 0, avgDailyVolume: quote?.avgDailyVolume ?? null,
    });
    period = rec?.date ?? null;
    source = "Informe mensal de FII da CVM (dados abertos), proventos e cotação da Yahoo Finance";
    if (!fii.data) notice = fii.loading ? "Estamos baixando o informe mensal da CVM (patrimônio, valor patrimonial, cotistas). Volte em alguns minutos." : `Informe mensal da CVM indisponível agora${fii.error ? ` (${fii.error})` : ""}. Mostramos só o que vem dos proventos e da cotação.`;
    else if (!rec) notice = "Não encontramos este fundo no informe mensal da CVM; P/VP, patrimônio e cotistas ficam sem valor.";
  } else {
    const cvm = getCvmData();
    const alias = CVM_ALIAS[ticker.slice(0, 4)];
    const found = cvm.data ? (companyOf(cvm.data, ticker) ?? (name ? companyByName(cvm.data, name) : null) ?? (alias ? companyByName(cvm.data, alias) : null) ?? companyInd(cvm.data, getCvmInd().data, ticker, name, alias)) : null;
    if (found) {
      const a = analyzeStock({ rows: found.company.rows, bank: found.company.bank, price, marketCap, dividends12m: quote ? div12 : null });
      indicators = a.indicators;
      period = a.period;
      if (!a.indicators.length) notice = `Encontramos a empresa na CVM (${found.company.name}), mas não conseguimos ler o lucro consolidado dela.`;
    } else if (!cvm.data) {
      notice = cvm.loading ? "Estamos baixando as demonstrações financeiras da CVM (leva alguns minutos na primeira vez). Volte em alguns minutos." : `Demonstrações da CVM indisponíveis agora${cvm.error ? ` (${cvm.error})` : ""}. Tentaremos de novo automaticamente.`;
    } else notice = "Não encontramos este ticker nos dados abertos da CVM (empresa sem demonstrações consolidadas ou ticker novo).";
    source = "Demonstrações financeiras ITR/DFP da CVM (dados abertos), proventos e cotação da Yahoo Finance";
  }
  return { kind: isFii ? "fii" : "acao", indicators, ...summarize(indicators), period, notice, source, logo: detail?.logo ?? null, name, quote, quoteError: (q as { error?: string }).error ?? null, coinId: null };
}

const pctTxt = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
function rate(id: string, label: string, v: number | null, text: string, hint: string, alert: string, rule: (v: number) => Status): Indicator {
  if (v === null || !Number.isFinite(v)) return { id, label, display: "—", value: null, status: "nd", hint };
  const status = rule(v);
  return { id, label, display: text, value: v, status, hint, alert: status === "ruim" || status === "atencao" ? alert : undefined };
}

/** Indicadores de mercado de uma cripto (não são on-chain; o Bitcoin tem a página própria de on-chain). */
export async function assessCrypto(symbol: string): Promise<Assessment> {
  const sym = symbol.toUpperCase();
  const coin = await coinIdOf(sym);
  const d = coin ? await getCoinDetail(coin.id) : null;
  const c = d?.data ?? null;
  if (!c) {
    return { kind: "cripto", indicators: [], total: 0, bad: 0, warn: 0, good: 0, period: null, notice: coin ? `Dados de mercado indisponíveis agora${d?.error ? ` (${d.error})` : ""}.` : "Não encontramos esta cripto no CoinGecko.", source: "CoinGecko", logo: null, name: coin?.name ?? null, quote: null, quoteError: null, coinId: coin?.id ?? null };
  }
  const dd = c.ath && c.price ? (c.price / c.ath - 1) * 100 : null;
  const liq = c.marketCap && c.volume ? (c.volume / c.marketCap) * 100 : null;
  const circ = c.circulating && (c.max ?? c.total) ? (c.circulating / (c.max ?? c.total as number)) * 100 : null;
  const fdv = c.fdv && c.marketCap ? c.fdv / c.marketCap : null;
  const indicators: Indicator[] = [
    rate("rank", "Posição por valor de mercado", c.rank, c.rank ? `#${c.rank}` : "—", "Quanto menor o número, maior e mais consolidada a cripto.", "Cripto fora das 100 maiores: mais risco e menos liquidez.", (v) => (v > 100 ? "ruim" : v > 30 ? "atencao" : "bom")),
    rate("c7", "Variação em 7 dias", c.change7d, c.change7d === null ? "—" : pctTxt(c.change7d), "Queda forte em uma semana indica estresse de curto prazo.", "Queda forte nos últimos 7 dias.", (v) => (v < -20 ? "ruim" : v < -10 ? "atencao" : "bom")),
    rate("c30", "Variação em 30 dias", c.change30d, c.change30d === null ? "—" : pctTxt(c.change30d), "Tendência do último mês.", "Queda relevante nos últimos 30 dias.", (v) => (v < -30 ? "ruim" : v < -15 ? "atencao" : "bom")),
    rate("c1y", "Variação em 1 ano", c.change1y, c.change1y === null ? "—" : pctTxt(c.change1y), "Tendência de 12 meses.", "Queda relevante em 12 meses.", (v) => (v < -50 ? "ruim" : v < -25 ? "atencao" : "bom")),
    rate("ath", "Distância da máxima histórica", dd, dd === null ? "—" : pctTxt(dd), "Quanto o preço está abaixo do topo de todos os tempos.", "Preço muito abaixo da máxima histórica.", (v) => (v < -80 ? "ruim" : v < -50 ? "atencao" : "bom")),
    rate("liq", "Liquidez (volume 24h ÷ valor de mercado)", liq, liq === null ? "—" : pctTxt(liq), "Quanto do valor de mercado gira por dia; baixo = difícil vender sem mexer no preço.", "Pouca liquidez diária.", (v) => (v < 1 ? "ruim" : v < 3 ? "atencao" : "bom")),
    rate("supply", "Oferta em circulação ÷ oferta total", circ, circ === null ? "—" : pctTxt(circ), "Muita oferta ainda por emitir pode pressionar o preço.", "Boa parte da oferta ainda não circula (diluição futura).", (v) => (v < 50 ? "ruim" : v < 80 ? "atencao" : "bom")),
    rate("fdv", "Valor totalmente diluído ÷ valor de mercado", fdv, fdv === null ? "—" : `${fdv.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`, "Quantas vezes o valor de mercado cresceria com toda a oferta emitida.", "Valor totalmente diluído muito acima do atual.", (v) => (v > 3 ? "ruim" : v > 1.5 ? "atencao" : "bom")),
  ];
  return { kind: "cripto", indicators, ...summarize(indicators), period: null, notice: null, source: "CoinGecko (dados de mercado, não on-chain)", logo: c.image, name: c.name, quote: null, quoteError: null, coinId: coin?.id ?? null };
}

export function assessHolding(h: { block: string; ticker: string | null; label: string }): Promise<Assessment | null> {
  if (!h.ticker) return Promise.resolve(null);
  if (isCryptoHolding(h)) return assessCrypto(h.ticker);
  if (isUsStock(h)) {
    const t = h.ticker;
    return (async () => {
      const [{ getFund }, { getUsQuote, US_REITS }, { buildUsAssessment }] = await Promise.all([import("./sec"), import("./usmarket"), import("./usassess")]);
      const [f, q] = await Promise.all([getFund(t), getUsQuote(t)]);
      return buildUsAssessment(t, US_REITS.some((a) => a.symbol === t), f.data, q.data, null);
    })();
  }
  if (h.block === "fiis") return assessStockOrFii(h.ticker, true);
  if (h.block === "acoes") return assessStockOrFii(h.ticker, isFiiTicker(h.ticker));
  return Promise.resolve(null);
}
