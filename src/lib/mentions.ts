import { db } from "./db";

const RE = /(?:^|[^\p{L}\p{N}_.-])@([\p{L}\p{N}_.-]{1,40})/gu;

/**
 * Quem foi marcado num texto. @usuario (handle) identifica uma pessoa; @PrimeiroNome só vale
 * se houver exatamente um membro com esse primeiro nome (com dois "João", ninguém é notificado por engano).
 */
export function mentionedUserIds(body: string, authorId: number): number[] {
  const out = new Set<number>();
  for (const m of body.matchAll(RE)) {
    const tag = m[1].replace(/[.-]+$/, "").toLowerCase();
    if (!tag) continue;
    const byHandle = db().prepare("SELECT id FROM users WHERE lower(handle) = ?").get(tag) as { id: number } | undefined;
    if (byHandle) { out.add(byHandle.id); continue; }
    const byName = db().prepare("SELECT id FROM users WHERE lower(substr(name, 1, instr(name || ' ', ' ') - 1)) = ? LIMIT 2").all(tag) as { id: number }[];
    if (byName.length === 1) out.add(byName[0].id);
  }
  out.delete(authorId);
  return [...out].slice(0, 10);
}

export function recordMentions(body: string, authorId: number, kind: "post" | "comment", postId: number): void {
  const ids = mentionedUserIds(body, authorId);
  if (!ids.length) return;
  const snip = body.replace(/\s+/g, " ").trim().slice(0, 140);
  const ins = db().prepare("INSERT INTO mentions (user_id, by_id, kind, post_id, snippet) VALUES (?, ?, ?, ?, ?)");
  for (const id of ids) {
    // ignora quem bloqueou o autor
    if (db().prepare("SELECT 1 FROM community_blocks WHERE blocker_id = ? AND blocked_id = ?").get(id, authorId)) continue;
    ins.run(id, authorId, kind, postId, snip);
  }
}

export interface MentionItem { id: number; byId: number; by: string; avatarId: number | null; kind: string; postId: number; snippet: string; createdAt: number; read: boolean }

export function listMentions(userId: number, limit = 30): MentionItem[] {
  return (db().prepare(`SELECT m.id, m.by_id byId, u.name by, u.avatar_id avatarId, m.kind, m.post_id postId, m.snippet, m.created_at createdAt, m.read_at IS NOT NULL read
    FROM mentions m JOIN users u ON u.id = m.by_id WHERE m.user_id = ? ORDER BY m.id DESC LIMIT ?`).all(userId, limit) as (Omit<MentionItem, "read"> & { read: number })[]).map((r) => ({ ...r, read: !!r.read }));
}

export function unreadMentions(userId: number): number {
  return (db().prepare("SELECT COUNT(*) n FROM mentions WHERE user_id = ? AND read_at IS NULL").get(userId) as { n: number }).n;
}

export function markMentionsRead(userId: number): void {
  db().prepare("UPDATE mentions SET read_at = unixepoch() WHERE user_id = ? AND read_at IS NULL").run(userId);
}
