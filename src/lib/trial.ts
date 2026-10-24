import { db, effectivePlan, now, type UserRow } from "./db";

const DAY = 24 * 60 * 60;

/** Duração do teste grátis, em dias. Pode ser trocada pela variável TRIAL_DAYS. */
export function trialDays(): number {
  const n = Number(process.env.TRIAL_DAYS);
  return Number.isInteger(n) && n >= 1 && n <= 90 ? n : 30;
}

/** Tem direito ao teste: conta comum, nunca usou o teste, está no Grátis e nunca pagou. */
export function trialAvailable(u: Pick<UserRow, "id" | "role" | "plan" | "plan_expires_at" | "trial_ends_at">): boolean {
  if (u.role !== "user" || u.trial_ends_at !== null) return false;
  if (effectivePlan(u) !== "free") return false;
  const paid = db().prepare("SELECT 1 FROM orders WHERE user_id = ? AND status = 'paid' LIMIT 1").get(u.id);
  return !paid;
}

/** O Pró atual ainda é o do teste? (Se a pessoa pagar, o vencimento passa a ser maior que o fim do teste.) */
export function onTrial(u: Pick<UserRow, "role" | "plan" | "plan_expires_at" | "trial_ends_at">): boolean {
  return u.role === "user" && u.plan === "pro" && u.trial_ends_at !== null && u.plan_expires_at === u.trial_ends_at && u.trial_ends_at > now();
}

/** Libera o Pró pelo período do teste. Uma vez por conta. */
export function startTrial(userId: number): { ok: true; expiresAt: number } | { ok: false; error: string } {
  const d = db();
  const run = d.transaction((): { ok: true; expiresAt: number } | { ok: false; error: string } => {
    const user = d.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
    if (!user) return { ok: false, error: "Usuário não encontrado." };
    if (user.trial_ends_at !== null) return { ok: false, error: "O teste grátis já foi usado nesta conta." };
    if (!trialAvailable(user)) return { ok: false, error: "O teste grátis é só para contas do plano Grátis que ainda não assinaram." };
    const expiresAt = now() + trialDays() * DAY;
    d.prepare("UPDATE users SET plan = 'pro', plan_expires_at = ?, trial_ends_at = ? WHERE id = ?").run(expiresAt, expiresAt, userId);
    return { ok: true, expiresAt };
  });
  return run();
}
