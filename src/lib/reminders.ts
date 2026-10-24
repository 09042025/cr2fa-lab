import { db, now, type UserRow } from "./db";
import { mailEnabled, renewalEmail, sendMail } from "./mail";

const DAY = 24 * 60 * 60;

export interface DueReminder {
  user: UserRow;
  stage: 1 | 2;
  daysLeft: number;
}

/**
 * Quem deve receber lembrete agora: Pró com vencimento nos próximos 7 dias.
 * Etapa 1 = a 7 dias ou menos do vencimento; etapa 2 = a 1 dia ou menos.
 * Cada etapa sai uma vez por vencimento. Ao renovar, o vencimento muda e o ciclo recomeça.
 */
export function dueReminders(t: number = now()): DueReminder[] {
  const rows = db()
    .prepare("SELECT * FROM users WHERE role = 'user' AND plan = 'pro' AND plan_expires_at IS NOT NULL AND plan_expires_at > ? AND plan_expires_at <= ?")
    .all(t, t + 7 * DAY) as UserRow[];
  const out: DueReminder[] = [];
  for (const user of rows) {
    const expiry = user.plan_expires_at!;
    const done = user.reminder_expiry === expiry ? user.reminder_stage : 0;
    const remaining = expiry - t;
    const stage: 1 | 2 = remaining <= DAY ? 2 : 1;
    if (done >= stage) continue;
    out.push({ user, stage, daysLeft: Math.max(1, Math.ceil(remaining / DAY)) });
  }
  return out;
}

type Sender = (to: string, mail: { subject: string; html: string; text: string }) => Promise<void>;

/** Envia os lembretes pendentes. Só marca como enviado se o e-mail saiu; se falhar, tenta de novo na próxima rodada. */
export async function runReminders(send: Sender = (to, m) => sendMail({ to, ...m }), t: number = now()): Promise<number> {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  let sent = 0;
  for (const { user, stage, daysLeft } of dueReminders(t)) {
    try {
      await send(user.email, renewalEmail(user.name, daysLeft, new Date(user.plan_expires_at! * 1000), `${base}/planos`));
      db().prepare("UPDATE users SET reminder_expiry = ?, reminder_stage = ? WHERE id = ?").run(user.plan_expires_at, stage, user.id);
      sent += 1;
    } catch (e) {
      console.error("[lembrete] falha ao enviar para o usuário", user.id, e);
    }
  }
  return sent;
}

const g = globalThis as unknown as { __reminderTimer?: NodeJS.Timeout };

/** Roda uma vez pouco depois de iniciar e depois a cada 6 horas. */
export function startReminderJob(): void {
  if (g.__reminderTimer) return;
  if (!mailEnabled()) {
    console.log("[lembrete] E-mail não configurado (RESEND_API_KEY e MAIL_FROM): lembretes de renovação desativados.");
    return;
  }
  const tick = () => runReminders().then((n) => n > 0 && console.log(`[lembrete] ${n} lembrete(s) de renovação enviado(s).`)).catch((e) => console.error("[lembrete] erro:", e));
  setTimeout(tick, 60 * 1000).unref?.();
  g.__reminderTimer = setInterval(tick, 6 * 60 * 60 * 1000);
  g.__reminderTimer.unref?.();
}
