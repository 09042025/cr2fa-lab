/**
 * Orçamento familiar: divisão ideal da renda, situação atual e reserva de emergência.
 * Funções puras (sem rede nem banco), usadas pela tela e pelos testes.
 */

export const BUDGET_CATS = [
  { id: "moradia", label: "Moradia e contas da casa", ideal: 30, essential: true, hint: "Aluguel/financiamento, condomínio, luz, água, internet, gás." },
  { id: "alimentacao", label: "Alimentação total", ideal: 20, essential: true, hint: "Mercado, feira, restaurantes e delivery." },
  { id: "transporte", label: "Transporte", ideal: 8, essential: true, hint: "Combustível, aplicativo, ônibus, seguro e manutenção do carro." },
  { id: "saude", label: "Saúde e educação", ideal: 7, essential: true, hint: "Plano de saúde, remédios, escola, cursos." },
  { id: "lazer", label: "Lazer e compras pessoais", ideal: 15, essential: false, hint: "Passeios, assinaturas, roupas, presentes, hobbies." },
  { id: "reserva", label: "Reserva e investimentos", ideal: 20, essential: false, hint: "Quanto você guarda ou investe por mês hoje." },
] as const;

export type CatId = (typeof BUDGET_CATS)[number]["id"];
export type Amounts = Record<CatId, number>;

export interface BudgetInput {
  /** Renda líquida mensal da família (o que cai na conta). */
  income: number;
  /** Quanto gasta hoje em cada categoria, por mês. */
  actual: Amounts;
  /** Quanto já tem guardado para emergências. */
  reserveNow: number;
}

export const emptyAmounts = (): Amounts => ({ moradia: 0, alimentacao: 0, transporte: 0, saude: 0, lazer: 0, reserva: 0 });

export const clean = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100) / 100, 1e10) : 0;
};

/** Lê um valor digitado em reais: "1.234,56", "1234,56" ou "1234.56". */
export function parseBRL(text: string): number {
  const t = text.trim().replace(/[^\d.,]/g, "");
  if (!t) return 0;
  const lastComma = t.lastIndexOf(","), lastDot = t.lastIndexOf(".");
  let s = t;
  if (lastComma >= 0 && lastDot >= 0) s = lastComma > lastDot ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (lastComma >= 0) s = t.replace(/\./g, "").replace(",", ".");
  else if (lastDot >= 0 && t.length - lastDot - 1 === 3 && (t.match(/\./g) ?? []).length >= 1 && lastDot > 0) s = t.replace(/\./g, ""); // 1.234 → 1234
  return clean(s);
}

export function idealAmounts(income: number): Amounts {
  const out = emptyAmounts();
  for (const c of BUDGET_CATS) out[c.id] = Math.round(income * c.ideal) / 100;
  return out;
}

export const sumAmounts = (a: Amounts) => BUDGET_CATS.reduce((s, c) => s + a[c.id], 0);
/** Custo de vida essencial por mês (moradia, alimentação, transporte, saúde e educação): é o que a reserva precisa cobrir. */
export const essentials = (a: Amounts) => BUDGET_CATS.filter((c) => c.essential).reduce((s, c) => s + a[c.id], 0);

/** Meses (inteiros, arredondados para cima) para juntar `falta` poupando `aporte` por mês. null = sem aporte. */
export function monthsToGoal(falta: number, aporte: number): number | null {
  if (falta <= 0) return 0;
  if (aporte <= 0) return null;
  return Math.ceil(falta / aporte - 1e-9);
}

export function fmtMonths(m: number | null): string {
  if (m === null) return "—";
  if (m === 0) return "Meta atingida";
  const y = Math.floor(m / 12), r = m % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} ${y === 1 ? "ano" : "anos"}`);
  if (r) parts.push(`${r} ${r === 1 ? "mês" : "meses"}`);
  return parts.join(" e ");
}

export interface BudgetResult {
  ideal: Amounts;
  /** Custo essencial usado na meta (gastos reais; se ainda vazios, o ideal). */
  essentialMonthly: number;
  usedIdealEssentials: boolean;
  /** Meta: 12 meses do custo essencial. */
  goal: number;
  pct: number;
  /** Quantos meses de custo essencial a reserva atual cobre. */
  coveredMonths: number;
  falta: number;
  /** Aporte mensal atual (categoria Reserva e investimentos) e o ideal (20% da renda). */
  aporteNow: number;
  aporteIdeal: number;
  monthsNow: number | null;
  monthsIdeal: number | null;
  /** Renda menos todos os gastos (negativo = gasta mais do que ganha). */
  sobra: number;
  totalActual: number;
}

export function computeBudget(inp: BudgetInput): BudgetResult {
  const income = clean(inp.income);
  const actual = { ...emptyAmounts(), ...inp.actual };
  const ideal = idealAmounts(income);
  const realEss = essentials(actual);
  const usedIdealEssentials = realEss <= 0;
  const essentialMonthly = usedIdealEssentials ? essentials(ideal) : realEss;
  const goal = Math.round(essentialMonthly * 12 * 100) / 100;
  const reserveNow = clean(inp.reserveNow);
  const falta = Math.max(0, goal - reserveNow);
  const aporteNow = actual.reserva;
  const aporteIdeal = ideal.reserva;
  return {
    ideal, essentialMonthly, usedIdealEssentials, goal,
    pct: goal > 0 ? Math.min(100, (reserveNow / goal) * 100) : 0,
    coveredMonths: essentialMonthly > 0 ? reserveNow / essentialMonthly : 0,
    falta, aporteNow, aporteIdeal,
    monthsNow: monthsToGoal(falta, aporteNow),
    monthsIdeal: monthsToGoal(falta, aporteIdeal),
    sobra: income - sumAmounts(actual),
    totalActual: sumAmounts(actual),
  };
}
