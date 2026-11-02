import { db } from "./db";
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
