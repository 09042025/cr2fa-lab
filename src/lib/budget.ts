import { db } from "./db";
import { sniffImage } from "./community";
import { BUDGET_CATS, clean, emptyAmounts, repeatDays, validDay, validYm, type BudgetInput, type CatId, type Expense, type MonthEntry } from "./budget-calc";

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
  return db().prepare("SELECT id, day, cat, sub, amount, note, receipt_id receiptId, series_id seriesId FROM budget_expenses WHERE user_id = ? ORDER BY day, id LIMIT 20000").all(userId) as Expense[];
}

export const MAX_RECEIPT_BYTES = 3 * 1024 * 1024;

/** Foto (PNG, JPG, WebP, GIF) ou PDF, conferidos pelos primeiros bytes. */
export function sniffReceipt(buf: Buffer): string | null {
  if (buf.length >= 5 && buf.toString("latin1", 0, 5) === "%PDF-") return "application/pdf";
  return sniffImage(buf);
}

export function saveReceipt(userId: number, buf: Buffer): number | null {
  const mime = sniffReceipt(buf);
  if (!mime || buf.length > MAX_RECEIPT_BYTES) return null;
  return Number(db().prepare("INSERT INTO budget_receipts (user_id, mime, data) VALUES (?, ?, ?)").run(userId, mime, buf).lastInsertRowid);
}

/** Só o dono enxerga o próprio comprovante. */
export function getReceipt(userId: number, id: number): { mime: string; data: Buffer } | null {
  return (db().prepare("SELECT mime, data FROM budget_receipts WHERE id = ? AND user_id = ?").get(id, userId) as { mime: string; data: Buffer } | undefined) ?? null;
}

/** Lança um gasto. Com `repeatMonths` > 1 vira gasto fixo: cria um lançamento por mês, no mesmo dia, ligados por uma série. O anexo fica só no primeiro. */
export function addExpense(userId: number, e: { day: string; cat: CatId; sub: string; amount: number; note: string; receiptId?: number | null; repeatMonths?: number }): Expense[] | null {
  if (!validDay(e.day) || !BUDGET_CATS.some((c) => c.id === e.cat)) return null;
  const amount = clean(e.amount);
  if (amount <= 0) return null;
  let receiptId: number | null = null;
  if (e.receiptId) {
    if (!getReceipt(userId, e.receiptId)) return null; // comprovante de outra pessoa ou inexistente
    receiptId = e.receiptId;
  }
  const sub = e.sub.slice(0, 40), note = e.note.slice(0, 80);
  const days = e.repeatMonths && e.repeatMonths > 1 ? repeatDays(e.day, e.repeatMonths) : [e.day];
  const ins = db().prepare("INSERT INTO budget_expenses (user_id, day, cat, sub, amount, note, receipt_id, series_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  const out: Expense[] = [];
  db().transaction(() => {
    let seriesId: number | null = null;
    days.forEach((d, i) => {
      const r = ins.run(userId, d, e.cat, sub, amount, note, i === 0 ? receiptId : null, seriesId);
      const id = Number(r.lastInsertRowid);
      if (i === 0 && days.length > 1) { seriesId = id; db().prepare("UPDATE budget_expenses SET series_id = ? WHERE id = ?").run(id, id); }
      out.push({ id, day: d, cat: e.cat, sub, amount, note, receiptId: i === 0 ? receiptId : null, seriesId: days.length > 1 ? seriesId : null });
    });
  })();
  return out;
}

/** Apaga um lançamento. Com `series`, apaga também os próximos meses do mesmo gasto fixo. Devolve os ids apagados. */
export function deleteExpense(userId: number, id: number, series = false): number[] {
  const row = db().prepare("SELECT day, series_id sid FROM budget_expenses WHERE user_id = ? AND id = ?").get(userId, id) as { day: string; sid: number | null } | undefined;
  if (!row) return [];
  const rows = (series && row.sid
    ? db().prepare("SELECT id, receipt_id rid FROM budget_expenses WHERE user_id = ? AND series_id = ? AND day >= ?").all(userId, row.sid, row.day)
    : db().prepare("SELECT id, receipt_id rid FROM budget_expenses WHERE user_id = ? AND id = ?").all(userId, id)) as { id: number; rid: number | null }[];
  db().transaction(() => {
    for (const r of rows) {
      db().prepare("DELETE FROM budget_expenses WHERE user_id = ? AND id = ?").run(userId, r.id);
      if (r.rid) db().prepare("DELETE FROM budget_receipts WHERE user_id = ? AND id = ?").run(userId, r.rid);
    }
  })();
  return rows.map((r) => r.id);
}
