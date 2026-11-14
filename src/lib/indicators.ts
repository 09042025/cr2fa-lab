/**
 * Indicadores fundamentalistas calculados a partir dos dados abertos da CVM, com classificação
 * simples (bom / atenção / ruim). Funções puras, sem rede: fáceis de testar.
 * Texto sempre informativo: critérios gerais, não é recomendação de investimento.
 */

export type Status = "bom" | "atencao" | "ruim" | "nd";

/** Linha de demonstração já normalizada: k = conta canônica, i/f = início/fim do período (AAAA-MM-DD), v = valor em reais. */
export interface CvmRow { k: string; i: string; f: string; v: number }

export interface Indicator {
  id: string;
  label: string;
  /** Texto pronto para exibir (ex.: "12,3%"). */
  display: string;
  value: number | null;
  status: Status;
  /** Frase curta: o que significa / critério usado. */
  hint: string;
  /** Frase usada na observação quando o indicador é ruim ou merece atenção. */
  alert?: string;
}

export interface StockInput {
  rows: CvmRow[];
  bank: boolean;
  /** Preço atual, valor de mercado e dividendos pagos nos últimos 12 meses por ação (ex-date). */
  price: number | null;
  marketCap: number | null;
  dividends12m: number | null;
}

const addYear = (d: string, n: number) => `${Number(d.slice(0, 4)) + n}${d.slice(4)}`;

/** Último valor de uma conta de balanço (data fim mais recente). */
export function latestBalance(rows: CvmRow[], k: string): { f: string; v: number } | null {
  let best: CvmRow | null = null;
  for (const r of rows) if (r.k === k && (!best || r.f > best.f)) best = r;
  return best ? { f: best.f, v: best.v } : null;
}

function balanceAt(rows: CvmRow[], k: string, f: string): number | null {
  const r = rows.find((x) => x.k === k && x.f === f);
  return r ? r.v : null;
}

/** Valor acumulado no ano até a data f (a linha com início mais antigo naquele fim). */
function ytd(rows: CvmRow[], k: string, f: string): number | null {
  let best: CvmRow | null = null;
  for (const r of rows) {
    if (r.k !== k || r.f !== f || !r.i) continue;
    if (!best || r.i < best.i) best = r;
  }
  if (!best) return null;
  // só aceita acumulado do ano (início em 1º de janeiro do mesmo ano do fim)
  return best.i.slice(5) === "01-01" && best.i.slice(0, 4) === f.slice(0, 4) ? best.v : null;
}

/** Soma dos últimos 12 meses (LTM): acumulado atual + ano anterior − acumulado do ano anterior até a mesma data. */
export function ltm(rows: CvmRow[], k: string, f: string): number | null {
  const cur = ytd(rows, k, f);
  if (cur === null) return null;
  if (f.slice(5) === "12-31") return cur;
  const fyPrev = ytd(rows, k, `${Number(f.slice(0, 4)) - 1}-12-31`);
  const prevYtd = ytd(rows, k, addYear(f, -1));
  if (fyPrev === null || prevYtd === null) return null;
  return cur + fyPrev - prevYtd;
}

/** Crescimento do acumulado do ano contra o mesmo período do ano anterior, em %. */
export function yoyGrowth(rows: CvmRow[], k: string, f: string): number | null {
  const cur = ytd(rows, k, f);
  const prev = ytd(rows, k, addYear(f, -1));
  if (cur === null || prev === null || prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

const pct = (v: number | null, d = 1) => (v === null ? "—" : `${v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`);
const dec = (v: number | null, d = 2) => (v === null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }));

/** higher = quanto maior, melhor. good/ok são os limites de "bom" e "atenção". */
export function rate(v: number | null, mode: "higher" | "lower", good: number, ok: number): Status {
  if (v === null || !Number.isFinite(v)) return "nd";
  if (mode === "higher") return v >= good ? "bom" : v >= ok ? "atencao" : "ruim";
  return v <= good ? "bom" : v <= ok ? "atencao" : "ruim";
}

function mk(id: string, label: string, value: number | null, display: string, status: Status, hint: string, alert?: string): Indicator {
  return { id, label, value, display, status, hint, alert };
}

export interface StockAnalysis {
  period: string | null; // data do último balanço
  indicators: Indicator[];
  missing: string[];
}

export function analyzeStock(inp: StockInput): StockAnalysis {
  const { rows, bank } = inp;
  const out: Indicator[] = [];
  const missing: string[] = [];
  const f = rows.filter((r) => r.k === "ll").reduce<string | null>((m, r) => (!m || r.f > m ? r.f : m), null)
    ?? rows.filter((r) => r.k === "ll_total").reduce<string | null>((m, r) => (!m || r.f > m ? r.f : m), null);
  if (!f) return { period: null, indicators: [], missing: ["demonstrações financeiras"] };

  const llKey = rows.some((r) => r.k === "ll" && r.f === f) ? "ll" : "ll_total";
  const ll = ltm(rows, llKey, f);
  const rec = ltm(rows, "rec", f);
  const ebit = ltm(rows, "ebit", f);
  const pl = balanceAt(rows, "pl", f);
  const ativo = balanceAt(rows, "ativo", f);
  const ac = balanceAt(rows, "ac", f);
  const pc = balanceAt(rows, "pc", f);
  const caixa = (balanceAt(rows, "caixa", f) ?? 0) + (balanceAt(rows, "aplic", f) ?? 0);
  const divBruta = (balanceAt(rows, "div_cp", f) ?? 0) + (balanceAt(rows, "div_lp", f) ?? 0);
  const divLiq = divBruta - caixa;

  // --- Valuation / mercado ---
  const pl_ = inp.marketCap !== null && ll !== null && ll !== 0 ? inp.marketCap / ll : null;
  const pe = pl_ !== null && ll! > 0 ? pl_ : null;
  out.push(mk("pl", "P/L", pe, ll !== null && ll <= 0 ? "Prejuízo" : dec(pe), ll !== null && ll <= 0 ? "ruim" : rate(pe, "lower", 12, 20),
    "Quantos anos de lucro o mercado paga. Menor tende a ser mais barato. Bom até 12, atenção até 20.",
    ll !== null && ll <= 0 ? "A empresa teve prejuízo nos últimos 12 meses." : `P/L de ${dec(pe)}: o mercado paga caro pelo lucro atual.`));
  const pvp = inp.marketCap !== null && pl !== null && pl > 0 ? inp.marketCap / pl : null;
  out.push(mk("pvp", "P/VP", pvp, dec(pvp), rate(pvp, "lower", 1.5, 3),
    "Preço sobre o patrimônio líquido. Bom até 1,5, atenção até 3.", `P/VP de ${dec(pvp)}: preço bem acima do patrimônio contábil.`));
  const dy = inp.price && inp.dividends12m !== null ? (inp.dividends12m / inp.price) * 100 : null;
  out.push(mk("dy", "Dividend yield (12 meses)", dy, pct(dy), rate(dy, "higher", 6, 3),
    "Proventos dos últimos 12 meses sobre o preço. Bom a partir de 6%, atenção a partir de 3%.", `Dividend yield de ${pct(dy)}: retorno em proventos baixo.`));
  const payout = ll !== null && ll > 0 && inp.marketCap !== null && inp.price && inp.dividends12m !== null
    ? ((inp.dividends12m * (inp.marketCap / inp.price)) / ll) * 100 : null;
  out.push(mk("payout", "Payout", payout, pct(payout, 0),
    payout === null ? "nd" : payout > 100 ? "ruim" : payout >= 25 && payout <= 80 ? "bom" : "atencao",
    "Parte do lucro paga como proventos. Entre 25% e 80% costuma ser sustentável.",
    payout !== null && payout > 100 ? `Payout de ${pct(payout, 0)}: paga mais do que lucra, difícil de manter.` : `Payout de ${pct(payout, 0)} fora da faixa mais sustentável (25% a 80%).`));

  // --- Rentabilidade ---
  const roe = ll !== null && pl !== null && pl > 0 ? (ll / pl) * 100 : null;
  out.push(mk("roe", "ROE", roe, pct(roe), rate(roe, "higher", bank ? 15 : 15, bank ? 10 : 8),
    bank ? "Retorno sobre o patrimônio. Em bancos, bom a partir de 15%." : "Retorno sobre o patrimônio. Bom a partir de 15%, atenção a partir de 8%.",
    `ROE de ${pct(roe)}: retorno sobre o patrimônio abaixo do desejável.`));
  const roa = ll !== null && ativo !== null && ativo > 0 ? (ll / ativo) * 100 : null;
  out.push(mk("roa", "ROA", roa, pct(roa), bank ? rate(roa, "higher", 1.2, 0.8) : rate(roa, "higher", 7, 3),
    bank ? "Retorno sobre os ativos. Em bancos, bom a partir de 1,2%." : "Retorno sobre os ativos. Bom a partir de 7%, atenção a partir de 3%.",
    `ROA de ${pct(roa)}: pouco retorno sobre os ativos.`));
  const mliq = ll !== null && rec !== null && rec > 0 ? (ll / rec) * 100 : null;
  if (!bank) {
    out.push(mk("mliq", "Margem líquida", mliq, pct(mliq), rate(mliq, "higher", 10, 5), "Lucro sobre a receita. Bom a partir de 10%, atenção a partir de 5%.", `Margem líquida de ${pct(mliq)}: sobra pouco lucro de cada real vendido.`));
    const mebit = ebit !== null && rec !== null && rec > 0 ? (ebit / rec) * 100 : null;
    out.push(mk("mebit", "Margem EBIT", mebit, pct(mebit), rate(mebit, "higher", 15, 8), "Resultado operacional sobre a receita. Bom a partir de 15%, atenção a partir de 8%.", `Margem EBIT de ${pct(mebit)}: operação com pouca folga.`));
  }

  // --- Endividamento (não se aplica a bancos) ---
  if (!bank) {
    const dle = ebit !== null && ebit > 0 ? divLiq / ebit : null;
    out.push(mk("dle", "Dívida líquida / EBIT", dle, ebit !== null && ebit <= 0 && divLiq > 0 ? "EBIT negativo" : dle !== null && dle < 0 ? "Caixa líquido" : dec(dle),
      ebit !== null && ebit <= 0 && divLiq > 0 ? "ruim" : rate(dle, "lower", 2, 3.5),
      "Quantos anos de resultado operacional para quitar a dívida líquida. Bom até 2, atenção até 3,5.",
      ebit !== null && ebit <= 0 ? "Resultado operacional negativo com dívida a pagar." : `Dívida líquida de ${dec(dle)}x o EBIT: alavancagem elevada.`));
    const dlp = pl !== null && pl > 0 ? divLiq / pl : null;
    out.push(mk("dlpl", "Dívida líquida / patrimônio", dlp, dlp !== null && dlp < 0 ? "Caixa líquido" : dec(dlp), rate(dlp, "lower", 0.5, 1),
      "Dívida líquida sobre o patrimônio. Bom até 0,5, atenção até 1.", `Dívida líquida de ${dec(dlp)}x o patrimônio: endividamento alto.`));
    const lc = ac !== null && pc !== null && pc > 0 ? ac / pc : null;
    out.push(mk("lc", "Liquidez corrente", lc, dec(lc), rate(lc, "higher", 1.5, 1), "Ativo circulante sobre passivo circulante. Bom a partir de 1,5, atenção a partir de 1.", `Liquidez corrente de ${dec(lc)}: curto prazo apertado.`));
  }

  // --- Crescimento ---
  const gl = yoyGrowth(rows, llKey, f);
  out.push(mk("gl", "Crescimento do lucro", gl, pct(gl), rate(gl, "higher", 10, 0), "Lucro acumulado do ano contra o mesmo período do ano anterior. Bom a partir de +10%, ruim se cair.", `Lucro ${gl !== null && gl < 0 ? "caiu" : "cresceu pouco"} (${pct(gl)}) contra o mesmo período do ano anterior.`));
  const gr = yoyGrowth(rows, "rec", f);
  out.push(mk("gr", "Crescimento da receita", gr, pct(gr), rate(gr, "higher", 5, 0), "Receita acumulada do ano contra o mesmo período do ano anterior. Bom a partir de +5%, ruim se cair.", `Receita ${gr !== null && gr < 0 ? "caiu" : "cresceu pouco"} (${pct(gr)}) contra o mesmo período do ano anterior.`));

  for (const i of out) if (i.status === "nd") missing.push(i.label);
  return { period: f, indicators: out, missing };
}

/** Observação com os pontos de atenção (ruim primeiro, depois atenção). */
export function attentionPoints(list: Indicator[]): { bad: string[]; warn: string[] } {
  return {
    bad: list.filter((i) => i.status === "ruim" && i.alert).map((i) => i.alert as string),
    warn: list.filter((i) => i.status === "atencao" && i.alert).map((i) => i.alert as string),
  };
}

/* ============================== Fundos imobiliários ============================== */

export interface FiiInput {
  price: number | null;
  dividends12m: number | null;
  /** Dados do informe mensal da CVM (podem faltar). */
  vpa: number | null;
  patrimonio: number | null;
  cotistas: number | null;
  taxaAdm: number | null; // % ao mês sobre o PL, como o informe traz
  /** Média de dividendos mensais dos últimos 12 meses e a dos 12 anteriores, p/ tendência. */
  div12mPrev: number | null;
  /** Quantos dos últimos 12 meses tiveram pagamento. */
  monthsPaid: number;
  avgDailyVolume: number | null;
}

export function analyzeFii(i: FiiInput): Indicator[] {
  const out: Indicator[] = [];
  const dy = i.price && i.dividends12m !== null ? (i.dividends12m / i.price) * 100 : null;
  out.push(mk("dy", "Dividend yield (12 meses)", dy, pct(dy), rate(dy, "higher", 9, 6), "Proventos dos últimos 12 meses sobre a cota. Bom a partir de 9%, atenção a partir de 6%.", `Dividend yield de ${pct(dy)}: renda abaixo do esperado para fundos imobiliários.`));
  const pvp = i.price && i.vpa && i.vpa > 0 ? i.price / i.vpa : null;
  out.push(mk("pvp", "P/VP", pvp, dec(pvp), pvp === null ? "nd" : pvp < 0.85 ? "atencao" : pvp <= 1.05 ? "bom" : pvp <= 1.2 ? "atencao" : "ruim",
    "Cota sobre o valor patrimonial. Entre 0,85 e 1,05 costuma ser equilibrado; muito abaixo pode sinalizar risco nos ativos; acima de 1,2 é caro.",
    pvp !== null && pvp < 0.85 ? `P/VP de ${dec(pvp)}: o mercado desconta bastante o patrimônio, vale entender o porquê.` : `P/VP de ${dec(pvp)}: cota negociando bem acima do patrimônio.`));
  out.push(mk("vpa", "Valor patrimonial por cota", i.vpa, i.vpa === null ? "—" : i.vpa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), "nd", "Patrimônio líquido dividido pelas cotas (informe mensal da CVM)."));
  const trend = i.dividends12m !== null && i.div12mPrev && i.div12mPrev > 0 ? ((i.dividends12m - i.div12mPrev) / i.div12mPrev) * 100 : null;
  out.push(mk("trend", "Proventos vs. 12 meses anteriores", trend, pct(trend), rate(trend, "higher", 0, -10), "Soma dos proventos dos últimos 12 meses contra os 12 anteriores. Bom se estável ou crescendo, ruim se cair mais de 10%.", `Proventos ${pct(trend)} contra os 12 meses anteriores: renda em queda.`));
  out.push(mk("reg", "Meses com pagamento (últimos 12)", i.monthsPaid, `${i.monthsPaid} de 12`, i.dividends12m === null ? "nd" : i.monthsPaid >= 12 ? "bom" : i.monthsPaid >= 9 ? "atencao" : "ruim", "Regularidade dos proventos. O ideal é pagar todos os meses.", `Pagou proventos em só ${i.monthsPaid} dos últimos 12 meses: renda irregular.`));
  out.push(mk("pl", "Patrimônio líquido", i.patrimonio, i.patrimonio === null ? "—" : i.patrimonio.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }), i.patrimonio === null ? "nd" : i.patrimonio >= 500e6 ? "bom" : i.patrimonio >= 150e6 ? "atencao" : "ruim", "Tamanho do fundo. Acima de R$ 500 milhões costuma ter mais liquidez e diversificação.", `Patrimônio pequeno: pouca diversificação e liquidez.`));
  out.push(mk("cotistas", "Número de cotistas", i.cotistas, i.cotistas === null ? "—" : i.cotistas.toLocaleString("pt-BR"), i.cotistas === null ? "nd" : i.cotistas >= 20000 ? "bom" : i.cotistas >= 5000 ? "atencao" : "ruim", "Mais cotistas costuma significar mais liquidez de negociação.", `Poucos cotistas (${i.cotistas?.toLocaleString("pt-BR")}): liquidez de negociação limitada.`));
  out.push(mk("liq", "Liquidez diária média", i.avgDailyVolume, i.avgDailyVolume === null ? "—" : i.avgDailyVolume.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }), i.avgDailyVolume === null ? "nd" : i.avgDailyVolume >= 1e6 ? "bom" : i.avgDailyVolume >= 3e5 ? "atencao" : "ruim", "Volume financeiro médio negociado por dia. Acima de R$ 1 milhão é confortável.", "Liquidez diária baixa: pode ser difícil comprar ou vender grandes valores."));
  if (i.taxaAdm !== null) out.push(mk("adm", "Taxa de administração (informe)", i.taxaAdm, pct(i.taxaAdm, 2), "nd", "Percentual de despesa de administração informado no último informe mensal."));
  return out;
}
