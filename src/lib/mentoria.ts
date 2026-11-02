import { db, now } from "./db";
import { MENTORIA_SESSIONS } from "./plans";

export interface Mentorship { id: number; userId: number; name: string; email: string; sessionsDone: number; createdAt: number }
type Row = { id: number; user_id: number; name: string; email: string; sessions_done: number; created_at: number };
const map = (r: Row): Mentorship => ({ id: r.id, userId: r.user_id, name: r.name, email: r.email, sessionsDone: r.sessions_done, createdAt: r.created_at });
const SEL = "SELECT m.id, m.user_id, u.name, u.email, m.sessions_done, m.created_at FROM mentorships m JOIN users u ON u.id = m.user_id";

export function listMine(userId: number): Mentorship[] {
  return (db().prepare(`${SEL} WHERE m.user_id = ? ORDER BY m.id DESC`).all(userId) as Row[]).map(map);
}
export function listAll(): Mentorship[] {
  return (db().prepare(`${SEL} ORDER BY m.id DESC LIMIT 300`).all() as Row[]).map(map);
}
/** Ajusta as aulas realizadas (só o administrador). Fica sempre entre 0 e 12. */
export function setSessions(id: number, done: number): boolean {
  const n = Math.min(MENTORIA_SESSIONS, Math.max(0, Math.round(done)));
  return db().prepare("UPDATE mentorships SET sessions_done = ? WHERE id = ?").run(n, id).changes > 0;
}

/* ---------- Vagas da turma SPOT (só a mentoria avulsa; o Plano Diamond não tem limite) ---------- */
export function spotsLimit(): number {
  const n = Number(process.env.MENTORIA_SPOTS);
  return Number.isInteger(n) && n >= 0 && n <= 1000 ? n : 30;
}

export function currentTurma(): number {
  const r = db().prepare("SELECT value FROM app_settings WHERE key = 'mentoria_turma'").get() as { value: string } | undefined;
  const n = Number(r?.value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Abre uma nova turma: as vagas voltam a ficar todas livres. */
export function openNewTurma(): number {
  const n = currentTurma() + 1;
  db().prepare("INSERT INTO app_settings (key, value) VALUES ('mentoria_turma', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(n));
  return n;
}

export interface Spots { turma: number; limit: number; taken: number; left: number; full: boolean }

/** Vagas ocupadas = mentorias avulsas pagas na turma atual + pedidos em andamento (reserva por 2h; cripto expira em 30 min). */
export function spots(): Spots {
  const turma = currentTurma();
  const limit = spotsLimit();
  const paid = (db().prepare("SELECT COUNT(*) c FROM mentorships WHERE kind = 'mentoria' AND turma = ?").get(turma) as { c: number }).c;
  const reserved = (db().prepare("SELECT COUNT(*) c FROM orders WHERE product = 'mentoria' AND status = 'pending' AND created_at > ? AND (expires_at IS NULL OR expires_at > ?)").get(now() - 2 * 3600, now()) as { c: number }).c;
  const taken = paid + reserved;
  return { turma, limit, taken, left: Math.max(0, limit - taken), full: taken >= limit };
}

/** Convida um membro para a mentoria sem pagamento (só o administrador). Ocupa uma vaga da turma atual. */
export function addGuest(email: string): { ok: true } | { error: string } {
  const u = db().prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email.trim()) as { id: number } | undefined;
  if (!u) return { error: "Não existe conta com esse e-mail." };
  const turma = currentTurma();
  if (db().prepare("SELECT 1 FROM mentorships WHERE user_id = ? AND turma = ? AND kind = 'mentoria'").get(u.id, turma)) return { error: "Esse membro já está nesta turma." };
  if (spots().full) return { error: "A turma está cheia. Abra uma nova turma para convidar mais alunos." };
  db().prepare("INSERT INTO mentorships (user_id, order_id, kind, turma) VALUES (?, NULL, 'mentoria', ?)").run(u.id, turma);
  return { ok: true };
}
