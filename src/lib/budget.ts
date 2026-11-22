import { db } from "./db";
import { BUDGET_CATS, clean, emptyAmounts, type BudgetInput } from "./budget-calc";

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
