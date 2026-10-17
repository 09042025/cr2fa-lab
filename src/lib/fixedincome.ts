/** Tabela regressiva de IR sobre renda fixa tributada (CDB, Tesouro). */
export function irRate(days: number): number {
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.2;
  if (days <= 720) return 0.175;
  return 0.15;
}

export type FixedIncomeKind = "cdb" | "lci_lca" | "tesouro_selic";

export interface FixedIncomeInput {
  kind: FixedIncomeKind;
  /** CDB e LCI/LCA: percentual do CDI (ex.: 105). Tesouro Selic: ignorado. */
  percentCdi: number;
  /** CDI anual (% a.a.) */
  cdiAnnual: number;
  /** Selic anual (% a.a.), usada no Tesouro Selic */
  selicAnnual: number;
  amount: number;
  days: number;
}

export interface FixedIncomeResult {
  kind: FixedIncomeKind;
  gross: number;
  grossProfit: number;
  ir: number;
  fees: number;
  net: number;
  netProfit: number;
  netAnnualPct: number;
}

/** Taxa de custódia da B3 sobre o Tesouro Direto (0,10% a.a., simplificada e sem isenção de R$ 10 mil). */
const B3_CUSTODY = 0.001;

export function simulate(input: FixedIncomeInput): FixedIncomeResult {
  const { kind, percentCdi, cdiAnnual, selicAnnual, amount, days } = input;
  const annual = kind === "tesouro_selic" ? selicAnnual / 100 : (cdiAnnual / 100) * (percentCdi / 100);
  const gross = amount * Math.pow(1 + annual, days / 365);
  const grossProfit = gross - amount;

  const taxable = kind !== "lci_lca";
  const ir = taxable ? grossProfit * irRate(days) : 0;
  const fees = kind === "tesouro_selic" ? amount * (Math.pow(1 + B3_CUSTODY, days / 365) - 1) : 0;

  const net = gross - ir - fees;
  const netProfit = net - amount;
  const netAnnualPct = (Math.pow(net / amount, 365 / days) - 1) * 100;
  return { kind, gross, grossProfit, ir, fees, net, netProfit, netAnnualPct };
}

/** Quanto precisa pagar um CDB (em % do CDI) para empatar com uma LCI/LCA isenta. */
export function cdbEquivalentPercent(lciPercentCdi: number, days: number): number {
  return lciPercentCdi / (1 - irRate(days));
}
