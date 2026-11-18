/** Indicadores de ações e REITs americanos (SEC + Yahoo), no mesmo formato dos brasileiros. Informativo, não é recomendação. */
import type { Indicator, Status } from "./indicators";
import { propertyIndicator, rate } from "./indicators";
import type { Fund } from "./sec";
import type { Quote } from "./dividends";
import { monthsPaid, sumBetween } from "./dividends";
import { summarize, type Assessment } from "./assess";

const n1 = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const pc = (v: number) => `${n1(v)}%`;
const x2 = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`;
function mk(id: string, label: string, value: number | null, display: string, status: Status, hint: string, alert?: string): Indicator {
  return { id, label, value, display, status, hint, alert: status === "ruim" || status === "atencao" ? alert : undefined };
}
const nd = (id: string, label: string, hint: string): Indicator => ({ id, label, value: null, display: "—", status: "nd", hint });
const growth = (c: number | null, p: number | null) => (c !== null && p !== null && p > 0 ? ((c - p) / p) * 100 : null);

export const marketCapOf = (price: number | null, f: Fund | null) => (price && f?.shares ? price * f.shares : null);

export function usIndicators(f: Fund | null, quote: Quote | null, reit: boolean, today: string): Indicator[] {
  const price = quote?.price ?? null;
  const mc = marketCapOf(price, f);
  const div12 = quote ? sumBetween(quote.dividends, new Date(Date.parse(today) - 365 * 86400000).toISOString().slice(0, 10), today) : null;
  const div12p = quote ? sumBetween(quote.dividends, new Date(Date.parse(today) - 730 * 86400000).toISOString().slice(0, 10), new Date(Date.parse(today) - 365 * 86400000).toISOString().slice(0, 10)) : null;
  const dy = price && div12 !== null && div12 > 0 ? (div12 / price) * 100 : div12 === 0 ? 0 : null;
  const dg = div12 !== null && div12p !== null && div12p > 0 ? ((div12 - div12p) / div12p) * 100 : null;
  const paid = quote ? monthsPaid(quote.dividends, today) : null;
  const margin = f && f.netIncome !== null && f.revenue ? (f.netIncome / f.revenue) * 100 : null;
  const opm = f && f.opIncome !== null && f.revenue ? (f.opIncome / f.revenue) * 100 : null;
  const roe = f && f.netIncome !== null && f.equity && f.equity > 0 ? (f.netIncome / f.equity) * 100 : null;
  const gr = f ? growth(f.revenue, f.revenuePrev) : null;
  const gn = f && f.netIncome !== null && f.netIncomePrev !== null && f.netIncomePrev > 0 ? ((f.netIncome - f.netIncomePrev) / f.netIncomePrev) * 100 : null;
  const de = f && f.debt !== null && f.equity && f.equity > 0 ? f.debt / f.equity : null;
  const la = f && f.liabilities !== null && f.assets ? (f.liabilities / f.assets) * 100 : null;
  const cr = f && f.curAssets && f.curLiab ? f.curAssets / f.curLiab : null;
  const pl = mc && f && f.netIncome && f.netIncome > 0 ? mc / f.netIncome : null;
  const pvp = mc && f?.equity && f.equity > 0 ? mc / f.equity : null;
  const payout = f && f.shares && f.netIncome && f.netIncome > 0 && div12 ? ((div12 * f.shares) / f.netIncome) * 100 : null;

  const list: Indicator[] = [];
  list.push(dy === null ? nd("dy", "Dividend yield (12 meses)", "Proventos dos últimos 12 meses ÷ preço.") : mk("dy", "Dividend yield (12 meses)", dy, pc(dy), dy === 0 ? "atencao" : "bom", "Proventos dos últimos 12 meses ÷ preço. Muito alto pode indicar risco.", "Não pagou proventos nos últimos 12 meses."));
  list.push(dg === null ? nd("dg", "Crescimento do provento", "Proventos de 12 meses ÷ 12 meses anteriores.") : mk("dg", "Crescimento do provento", dg, pc(dg), rate(dg, "higher", 0, -10), "Proventos dos últimos 12 meses contra os 12 anteriores.", "Proventos em queda."));
  if (reit) {
    list.push(propertyIndicator(f?.properties ?? null, "imóveis"));
    list.push(paid === null ? nd("paid", "Regularidade", "Meses com pagamento no ano.") : mk("paid", "Regularidade", paid, `${paid} meses`, paid >= 4 ? "bom" : paid >= 2 ? "atencao" : "ruim", "Meses diferentes com pagamento nos últimos 12 meses.", "Pagamentos pouco frequentes."));
    list.push(la === null ? nd("la", "Passivo ÷ ativo", "Quanto do ativo é financiado por dívidas e obrigações.") : mk("la", "Passivo ÷ ativo", la, pc(la), rate(la, "lower", 50, 65), "Quanto do ativo é financiado por obrigações. Mais baixo é mais folgado.", "Alto endividamento em relação ao ativo."));
    list.push(pvp === null ? nd("pvp", "Preço ÷ patrimônio (P/VP)", "Valor de mercado ÷ patrimônio contábil.") : mk("pvp", "Preço ÷ patrimônio (P/VP)", pvp, x2(pvp), rate(pvp, "lower", 3, 6), "Valor de mercado ÷ patrimônio contábil (em REITs o contábil subestima imóveis).", "Preço muito acima do patrimônio contábil."));
  } else {
    list.push(pl === null ? nd("pl", "P/L", "Valor de mercado ÷ lucro dos últimos 12 meses.") : mk("pl", "P/L", pl, x2(pl), rate(pl, "lower", 25, 40), "Valor de mercado ÷ lucro dos últimos 12 meses.", "P/L alto: o preço embute muito crescimento."));
    list.push(payout === null ? nd("payout", "Payout (proventos ÷ lucro)", "Parte do lucro paga como provento.") : mk("payout", "Payout (proventos ÷ lucro)", payout, pc(payout), rate(payout, "lower", 80, 100), "Parte do lucro distribuída como provento.", "Paga mais do que lucra: provento pode não se sustentar."));
    list.push(opm === null ? nd("opm", "Margem operacional", "Lucro operacional ÷ receita.") : mk("opm", "Margem operacional", opm, pc(opm), rate(opm, "higher", 10, 3), "Lucro operacional ÷ receita dos últimos 12 meses.", "Margem operacional baixa ou negativa."));
    list.push(roe === null ? nd("roe", "ROE", "Lucro ÷ patrimônio líquido.") : mk("roe", "ROE", roe, pc(roe), rate(roe, "higher", 12, 6), "Retorno sobre o patrimônio líquido.", "Retorno sobre o patrimônio baixo."));
    list.push(de === null ? nd("de", "Dívida de longo prazo ÷ patrimônio", "Dívida de longo prazo ÷ patrimônio líquido.") : mk("de", "Dívida de longo prazo ÷ patrimônio", de, x2(de), rate(de, "lower", 1, 2), "Dívida de longo prazo ÷ patrimônio líquido.", "Dívida alta em relação ao patrimônio."));
    list.push(cr === null ? nd("cr", "Liquidez corrente", "Ativo circulante ÷ passivo circulante.") : mk("cr", "Liquidez corrente", cr, x2(cr), rate(cr, "higher", 1.2, 1), "Ativo circulante ÷ passivo circulante.", "Liquidez de curto prazo apertada."));
    list.push(f?.ocf == null ? nd("ocf", "Caixa das operações", "Caixa gerado pela operação em 12 meses.") : mk("ocf", "Caixa das operações", f.ocf, f.ocf >= 0 ? "Positivo" : "Negativo", f.ocf > 0 ? "bom" : "ruim", "Caixa gerado pela operação nos últimos 12 meses.", "Operação consumiu caixa."));
  }
  list.push(margin === null ? nd("margin", "Margem líquida", "Lucro líquido ÷ receita.") : mk("margin", "Margem líquida", margin, pc(margin), rate(margin, "higher", reit ? 15 : 8, reit ? 0 : 3), "Lucro líquido ÷ receita dos últimos 12 meses.", "Margem líquida baixa ou negativa."));
  list.push(gr === null ? nd("gr", "Crescimento da receita", "Receita dos últimos 12 meses contra o anterior.") : mk("gr", "Crescimento da receita", gr, pc(gr), rate(gr, "higher", 3, 0), "Receita dos últimos 12 meses contra o anterior.", "Receita em queda ou estagnada."));
  if (!reit) list.push(gn === null ? nd("gn", "Crescimento do lucro", "Lucro dos últimos 12 meses contra o anterior.") : mk("gn", "Crescimento do lucro", gn, pc(gn), rate(gn, "higher", 0, -10), "Lucro dos últimos 12 meses contra o anterior.", "Lucro em queda."));
  return list;
}

export function buildUsAssessment(sym: string, reit: boolean, f: Fund | null, quote: Quote | null, name: string | null, today = new Date().toISOString().slice(0, 10)): Assessment {
  const indicators = usIndicators(f, quote, reit, today);
  return { kind: reit ? "fii" : "acao", indicators, ...summarize(indicators), period: f?.period ?? null, notice: f ? null : "Fundamentos da SEC indisponíveis agora; mostramos só o que vem dos proventos e da cotação.", source: "Demonstrações da SEC (dados abertos), proventos e cotação da Yahoo Finance", logo: null, name, quote, quoteError: null, coinId: null };
}
