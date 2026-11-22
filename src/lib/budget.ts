import { db } from "./db";
import { BUDGET_CATS, clean, emptyAmounts, validYm, type BudgetInput, type MonthEntry } from "./budget-calc";

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
