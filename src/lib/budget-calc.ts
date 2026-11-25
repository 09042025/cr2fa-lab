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

/* ---------- Acompanhamento mês a mês ---------- */

export interface MonthEntry {
  /** "AAAA-MM" */
  ym: string;
  income: number;
  actual: Amounts;
  /** Saldo da reserva de emergência no fim do mês (opcional). */
  reserve: number | null;
}

export const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const validYm = (ym: string) => /^(20\d\d|2100)-(0[1-9]|1[0-2])$/.test(ym);
export const ymOf = (year: number, monthIndex: number) => `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

export interface MonthStats {
  total: number;
  /** Renda menos tudo o que foi gasto e guardado no mês. */
  sobra: number;
  /** Por categoria: ideal do mês, realizado e diferença (realizado − ideal). Para "reserva", gastar menos que o ideal é ruim. */
  rows: { id: CatId; label: string; ideal: number; real: number; diff: number; bad: boolean }[];
  /** Gastos (sem a categoria reserva) acima do ideal. */
  overspent: number;
}

export function monthStats(income: number, actual: Amounts): MonthStats {
  const ideal = idealAmounts(clean(income));
  const rows = BUDGET_CATS.map((c) => {
    const real = actual[c.id] ?? 0;
    const diff = Math.round((real - ideal[c.id]) * 100) / 100;
    return { id: c.id, label: c.label, ideal: ideal[c.id], real, diff, bad: c.id === "reserva" ? diff < 0 : diff > 0 };
  });
  const total = sumAmounts({ ...emptyAmounts(), ...actual });
  return {
    total,
    sobra: Math.round((clean(income) - total) * 100) / 100,
    rows,
    overspent: rows.filter((r) => r.id !== "reserva" && r.diff > 0).reduce((s, r) => s + r.diff, 0),
  };
}

/* ---------- Lançamentos por dia ---------- */

/** Subcategorias de cada categoria. A última é sempre "Outros", com campo livre para descrever. */
export const SUBS: Record<CatId, string[]> = {
  moradia: ["Aluguel", "Prestação da casa", "Condomínio", "Luz", "Água", "Internet e telefone", "Gás", "IPTU", "Manutenção e reparos", "Outros"],
  alimentacao: ["Mercado", "Açougue", "Padaria", "Feira e hortifrúti", "Fast food", "Restaurante", "Delivery", "Outros"],
  transporte: ["Combustível", "Aplicativo (Uber/99)", "Transporte público", "Estacionamento e pedágio", "Prestação do carro", "Seguro do carro", "Manutenção do carro", "Outros"],
  saude: ["Plano de saúde", "Farmácia", "Consultas e exames", "Escola ou faculdade", "Cursos", "Outros"],
  lazer: ["Passeios e viagens", "Assinaturas (streaming)", "Roupas e calçados", "Presentes", "Cuidados pessoais", "Hobbies", "Outros"],
  reserva: ["Reserva de emergência", "Renda fixa", "Ações e FIIs", "Cripto", "Outros"],
};
export const OTHER_SUB = "Outros";

export interface Expense {
  id: number;
  /** "AAAA-MM-DD" */
  day: string;
  cat: CatId;
  sub: string;
  amount: number;
  note: string;
}

export const validDay = (d: string) => /^(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d);
export const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();
export const dayOf = (ym: string, d: number) => `${ym}-${String(d).padStart(2, "0")}`;

/** Nome mostrado: em "Outros", vale o que a pessoa escreveu. */
export const expenseLabel = (e: Pick<Expense, "sub" | "note">) => (e.sub === OTHER_SUB && e.note.trim() ? e.note.trim() : e.sub);

/** Soma dos lançamentos por categoria em um mês ("AAAA-MM"). */
export function actualFromExpenses(list: Expense[], ym: string): Amounts {
  const out = emptyAmounts();
  for (const e of list) if (e.day.startsWith(ym)) out[e.cat] += e.amount;
  for (const c of BUDGET_CATS) out[c.id] = Math.round(out[c.id] * 100) / 100;
  return out;
}

/** Gasto do mês = valores digitados no mês (sem detalhar) + lançamentos por dia. */
export function combineActual(manual: Amounts | null, list: Expense[], ym: string): Amounts {
  const d = actualFromExpenses(list, ym);
  const out = emptyAmounts();
  for (const c of BUDGET_CATS) out[c.id] = Math.round(((manual?.[c.id] ?? 0) + d[c.id]) * 100) / 100;
  return out;
}

export interface RankItem { label: string; cat: CatId; total: number; pctSpend: number; pctIncome: number | null }

/**
 * Ranking anual dos maiores gastos (sem a categoria "Reserva e investimentos"), do maior para o menor.
 * Valores digitados no mês sem detalhar entram como "<categoria> (sem detalhar)".
 */
export function rankSpending(list: Expense[], months: MonthEntry[], year: number, limit = 10): { items: RankItem[]; totalSpend: number; totalIncome: number } {
  const prefix = `${year}-`;
  const map = new Map<string, { label: string; cat: CatId; total: number }>();
  const add = (key: string, label: string, cat: CatId, v: number) => {
    if (v <= 0) return;
    const cur = map.get(key) ?? { label, cat, total: 0 };
    cur.total += v;
    map.set(key, cur);
  };
  for (const e of list) {
    if (!e.day.startsWith(prefix) || e.cat === "reserva") continue;
    const label = expenseLabel(e);
    add(`${e.cat}|${label.toLowerCase()}`, label, e.cat, e.amount);
  }
  let totalIncome = 0;
  for (const m of months) {
    if (!m.ym.startsWith(prefix)) continue;
    totalIncome += m.income;
    for (const c of BUDGET_CATS) if (c.id !== "reserva") add(`${c.id}|__manual`, `${c.label} (sem detalhar)`, c.id, m.actual[c.id] ?? 0);
  }
  const all = [...map.values()].sort((a, b) => b.total - a.total);
  const totalSpend = all.reduce((s, x) => s + x.total, 0);
  return {
    items: all.slice(0, limit).map((x) => ({ label: x.label, cat: x.cat, total: Math.round(x.total * 100) / 100, pctSpend: totalSpend > 0 ? (x.total / totalSpend) * 100 : 0, pctIncome: totalIncome > 0 ? (x.total / totalIncome) * 100 : null })),
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalIncome,
  };
}
