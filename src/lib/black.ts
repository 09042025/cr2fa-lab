import { db } from "./db";
import { hasBlack } from "./orders";

export type BlackStatus = "requested" | "invited" | "declined";
export interface BlackRow { userId: number; status: BlackStatus; name: string; email: string; createdAt: number }

export function getInvite(userId: number): BlackStatus | null {
  const r = db().prepare("SELECT status FROM black_invites WHERE user_id = ?").get(userId) as { status: BlackStatus } | undefined;
  return r?.status ?? null;
}

/** Pode contratar o Diamond Black VIP? Só convidados (ou admin). */
export function canBuyBlack(user: { id: number; role: string }): boolean {
  return user.role === "admin" || getInvite(user.id) === "invited";
}

export function requestInvite(userId: number): void {
  db().prepare("INSERT INTO black_invites (user_id, status) VALUES (?, 'requested') ON CONFLICT(user_id) DO NOTHING").run(userId);
}

export function setInvite(userId: number, status: BlackStatus): boolean {
  const u = db().prepare("SELECT 1 FROM users WHERE id = ?").get(userId);
  if (!u) return false;
  db().prepare("INSERT INTO black_invites (user_id, status) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET status = excluded.status, updated_at = unixepoch()").run(userId, status);
  return true;
}

export function inviteByEmail(email: string): boolean {
  const u = db().prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email.trim()) as { id: number } | undefined;
  return u ? setInvite(u.id, "invited") : false;
}

export function listInvites(): BlackRow[] {
  return (db().prepare("SELECT b.user_id AS userId, b.status, u.name, u.email, b.created_at AS createdAt FROM black_invites b JOIN users u ON u.id = b.user_id ORDER BY b.updated_at DESC").all() as BlackRow[]);
}

export function listMembers(): { userId: number; name: string; email: string; paidAt: number }[] {
  return db().prepare("SELECT o.user_id AS userId, u.name, u.email, MAX(o.paid_at) AS paidAt FROM orders o JOIN users u ON u.id = o.user_id WHERE o.product = 'black' AND o.status = 'paid' GROUP BY o.user_id ORDER BY paidAt DESC").all() as never;
}

export { hasBlack };
