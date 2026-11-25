import { db } from "./db";
import { BUDGET_CATS, clean, emptyAmounts, validDay, validYm, type BudgetInput, type CatId, type Expense, type MonthEntry } from "./budget-calc";

export * from "./budget-calc";

export function getBudget(userId: number): BudgetInput | null {
  const r = db().prepare("SELECT income, actual, reserve_now rn FROM family_budgets WHERE user_id = ?").get(userId) as { income: number; actual: string; rn: number } | undefined;
  if (!r) return null;
  let a: Record<string, unknown> = {};
  try { a = JSON.parse(r.actual) as Record<string, unknown>; } catch { /* vazio */ }
  const actual = emptyAmounts();
  for (const c of BUDGET_CATS) actual[c.id] = clean(a[c.id]);
  return { income: r.income, actual, reserveNow: r.rn };
}

export function saveBudget(userId: number, b: BudgetInput) {
  const actual = emptyAmounts();
  for (const c of BUDGET_CATS) actual[c.id] = clean(b.actual[c.id]);
  db().prepare(`INSERT INTO family_budgets (user_id, income, actual, reserve_now, updated_at) VALUES (?, ?, ?, ?, unixepoch())
    ON CONFLICT(user_id) DO UPDATE SET income = excluded.income, actual = excluded.actual, reserve_now = excluded.reserve_now, updated_at = unixepoch()`)
    .run(userId, clean(b.income), JSON.stringify(actual), clean(b.reserveNow));
}

function parseActual(raw: string) {
  let a: Record<string, unknown> = {};
  try { a = JSON.parse(raw) as Record<string, unknown>; } catch { /* vazio */ }
  const actual = emptyAmounts();
  for (const c of BUDGET_CATS) actual[c.id] = clean(a[c.id]);
  return actual;
}

export function listMonths(userId: number): MonthEntry[] {
  const rows = db().prepare("SELECT ym, income, actual, reserve FROM budget_months WHERE user_id = ? ORDER BY ym").all(userId) as { ym: string; income: number; actual: string; reserve: number | null }[];
  return rows.map((r) => ({ ym: r.ym, income: r.income, actual: parseActual(r.actual), reserve: r.reserve }));
}

export function saveMonth(userId: number, m: MonthEntry): boolean {
  if (!validYm(m.ym)) return false;
  const actual = emptyAmounts();
  for (const c of BUDGET_CATS) actual[c.id] = clean(m.actual[c.id]);
  db().prepare(`INSERT INTO budget_months (user_id, ym, income, actual, reserve, updated_at) VALUES (?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(user_id, ym) DO UPDATE SET income = excluded.income, actual = excluded.actual, reserve = excluded.reserve, updated_at = unixepoch()`)
    .run(userId, m.ym, clean(m.income), JSON.stringify(actual), m.reserve === null ? null : clean(m.reserve));
  return true;
}

export function deleteMonth(userId: number, ym: string): boolean {
  return db().prepare("DELETE FROM budget_months WHERE user_id = ? AND ym = ?").run(userId, ym).changes > 0;
}

export function listExpenses(userId: number): Expense[] {
  return db().prepare("SELECT id, day, cat, sub, amount, note FROM budget_expenses WHERE user_id = ? ORDER BY day, id LIMIT 20000").all(userId) as Expense[];
}

export function addExpense(userId: number, e: { day: string; cat: CatId; sub: string; amount: number; note: string }): Expense | null {
  if (!validDay(e.day) || !BUDGET_CATS.some((c) => c.id === e.cat)) return null;
  const amount = clean(e.amount);
  if (amount <= 0) return null;
  const r = db().prepare("INSERT INTO budget_expenses (user_id, day, cat, sub, amount, note) VALUES (?, ?, ?, ?, ?, ?)").run(userId, e.day, e.cat, e.sub.slice(0, 40), amount, e.note.slice(0, 80));
  return { id: Number(r.lastInsertRowid), day: e.day, cat: e.cat, sub: e.sub.slice(0, 40), amount, note: e.note.slice(0, 80) };
}

export function deleteExpense(userId: number, id: number): boolean {
  return db().prepare("DELETE FROM budget_expenses WHERE user_id = ? AND id = ?").run(userId, id).changes > 0;
}
