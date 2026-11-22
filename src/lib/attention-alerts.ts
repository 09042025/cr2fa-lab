import { db, now, type UserRow } from "./db";
import { assessHolding, isCritical } from "./assess";
import { attentionEmail, mailEnabled, sendMail } from "./mail";

type Sender = (to: string, mail: { subject: string; html: string; text: string }) => Promise<void>;
interface H { id: number; block: string; label: string; ticker: string | null; ack_at: number | null }

/**
 * Para cada Premium: se mais da metade dos indicadores de um ativo está ruim e o investidor ainda não confirmou ("ciente"),
 * entra no e-mail do dia. Quando o ativo volta ao normal, a confirmação é zerada (um novo alerta voltará a avisar).
 */
export async function runAttentionAlerts(send: Sender = (to, m) => sendMail({ to, ...m }), opts: { userId?: number; ignoreAck?: boolean } = {}): Promise<{ sent: number; items: number; incomplete: boolean }> {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const users = (db().prepare("SELECT * FROM users WHERE plan = 'pro' AND (role = 'admin' OR plan_expires_at IS NULL OR plan_expires_at > ?)").all(now()) as UserRow[]).filter((u) => !opts.userId || u.id === opts.userId);
  let sent = 0, total = 0, incomplete = false;
  for (const u of users) {
    const hs = db().prepare("SELECT id, block, label, ticker, ack_at FROM holdings WHERE user_id = ? AND ticker IS NOT NULL").all(u.id) as H[];
    const items: { label: string; bad: number; total: number; id: number }[] = [];
    for (const h of hs) {
      const a = await assessHolding(h).catch(() => null);
      if (!a) { incomplete = true; continue; }
      if (a.total === 0) { if (a.kind !== "cripto" ? a.notice !== null : true) incomplete = true; continue; }
      if (!isCritical(a)) { if (h.ack_at) db().prepare("UPDATE holdings SET ack_at = NULL WHERE id = ?").run(h.id); continue; }
      if (!opts.ignoreAck && alertedToday(h.id)) continue; // já avisado hoje (evita repetir se o job rodar de novo)
      if (!h.ack_at || opts.ignoreAck) items.push({ label: h.ticker ?? h.label, bad: a.bad, total: a.total, id: h.id });
    }
    if (!items.length) continue;
    total += items.length;
    try { await send(u.email, attentionEmail(u.name, items, base)); sent += 1; if (!opts.ignoreAck) for (const it of items) markAlerted(it.id); } catch (e) { if (opts.userId) throw e; console.error("[atenção] falha ao enviar para o usuário", u.id, e); }
  }
  return { sent, items: total, incomplete };
}

const alertedToday = (hid: number) => (db().prepare("SELECT day FROM job_runs WHERE name = ?").get(`attention-h${hid}`) as { day: string } | undefined)?.day === spNow().day;
const markAlerted = (hid: number) => db().prepare("INSERT INTO job_runs (name, day) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET day = excluded.day").run(`attention-h${hid}`, spNow().day);

const g = globalThis as unknown as { __attentionTimer?: NodeJS.Timeout };
const spNow = () => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(new Date());
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
};

/** Confere a cada 10 minutos; roda uma vez por dia, a partir das 8h (horário de Brasília). */
export function startAttentionJob(): void {
  if (g.__attentionTimer) return;
  if (!mailEnabled()) { console.log("[atenção] E-mail não configurado: alertas diários desativados."); return; }
  const tick = async () => {
    const { day, hour } = spNow();
    if (hour < 8) return;
    const done = db().prepare("SELECT day FROM job_runs WHERE name = 'attention2'").get() as { day: string } | undefined;
    if (done?.day === day) return;
    const r = await runAttentionAlerts();
    // só dá o dia como feito quando todos os dados estavam disponíveis (a CVM pode ainda estar carregando logo após o deploy);
    // se faltou algum ativo, tenta de novo em 10 min e só envia os que ainda não foram avisados hoje
    if (!r.incomplete) db().prepare("INSERT INTO job_runs (name, day) VALUES ('attention2', ?) ON CONFLICT(name) DO UPDATE SET day = excluded.day").run(day);
    if (r.sent > 0) console.log(`[atenção] ${r.sent} e-mail(s) de alerta enviado(s).`);
  };
  const safe = () => tick().catch((e) => console.error("[atenção] erro:", e));
  setTimeout(safe, 90 * 1000).unref?.();
  g.__attentionTimer = setInterval(safe, 10 * 60 * 1000);
  g.__attentionTimer.unref?.();
}
