/** Cálculo de financiamentos (imóveis e veículos): tabela Price (parcela fixa) e SAC (parcela decrescente). */

export type Amortization = "price" | "sac";

export interface Installment { month: number; payment: number; interest: number; amortization: number; balance: number }

/** Converte taxa anual efetiva (% a.a.) em mensal equivalente (% a.m.). */
export const monthlyFromAnnual = (annualPct: number) => (Math.pow(1 + annualPct / 100, 1 / 12) - 1) * 100;
export const annualFromMonthly = (monthlyPct: number) => (Math.pow(1 + monthlyPct / 100, 12) - 1) * 100;

/** Parcela fixa (Price) para financiar `principal` em `n` meses à taxa mensal `i` (decimal). */
export function pricePayment(principal: number, i: number, n: number): number {
  if (principal <= 0 || n <= 0) return 0;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

/** Cronograma completo. `extra` é o valor mensal de seguros e tarifas somado a cada parcela. */
export function schedule(principal: number, monthlyPct: number, n: number, kind: Amortization, extra = 0): Installment[] {
  const out: Installment[] = [];
  const i = monthlyPct / 100;
  if (principal <= 0 || n <= 0) return out;
  let balance = principal;
  const fixed = pricePayment(principal, i, n);
  const amortSac = principal / n;
  for (let m = 1; m <= n; m++) {
    const interest = balance * i;
    const amort = kind === "price" ? fixed - interest : amortSac;
    balance = m === n ? 0 : Math.max(0, balance - amort);
    out.push({ month: m, interest, amortization: amort, payment: interest + amort + extra, balance });
  }
  return out;
}

export interface Summary { first: number; last: number; total: number; interest: number; extraTotal: number }

export function summarize(rows: Installment[], extra = 0): Summary {
  if (!rows.length) return { first: 0, last: 0, total: 0, interest: 0, extraTotal: 0 };
  const total = rows.reduce((s, r) => s + r.payment, 0);
  return {
    first: rows[0].payment,
    last: rows[rows.length - 1].payment,
    total,
    interest: rows.reduce((s, r) => s + r.interest, 0),
    extraTotal: extra * rows.length,
  };
}

/** Renda mensal mínima para a parcela caber em `pct`% da renda (regra usual dos bancos para imóveis: 30%). */
export const minIncome = (payment: number, pct = 30) => (pct > 0 ? payment / (pct / 100) : 0);
