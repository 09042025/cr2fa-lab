import crypto from "node:crypto";
import { db, now, type UserRow } from "./db";

export interface Invite {
  id: number; code: string; email: string | null; note: string; days: number; expiresAt: number; createdAt: number;
  revokedAt: number | null; redeemedBy: number | null; redeemedByName: string | null; redeemedAt: number | null; emailedAt: number | null;
}
export type InviteStatus = "pendente" | "usado" | "expirado" | "revogado";

export const CODE_RE = /^[A-Za-z0-9_-]{20,64}$/;

export function inviteStatus(i: Pick<Invite, "revokedAt" | "redeemedAt" | "expiresAt">): InviteStatus {
  if (i.revokedAt) return "revogado";
  if (i.redeemedAt) return "usado";
  return i.expiresAt <= now() ? "expirado" : "pendente";
}

export function createInvite(adminId: number, o: { email?: string | null; note?: string; days: number; validDays: number }): Invite {
  const code = crypto.randomBytes(24).toString("base64url");
  const email = o.email?.trim().toLowerCase() || null;
  db()
    .prepare("INSERT INTO vip_invites (code, email, note, days, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?)")
    .run(code, email, (o.note ?? "").trim().slice(0, 200), o.days, now() + o.validDays * 86400, adminId);
  return getInviteByCode(code)!;
}

const SELECT = `SELECT i.id, i.code, i.email, i.note, i.days, i.expires_at expiresAt, i.created_at createdAt, i.revoked_at revokedAt,
  i.redeemed_by redeemedBy, u.name redeemedByName, i.redeemed_at redeemedAt, i.emailed_at emailedAt
  FROM vip_invites i LEFT JOIN users u ON u.id = i.redeemed_by`;

export function getInviteByCode(code: string): Invite | null {
  if (!CODE_RE.test(code)) return null;
  return (db().prepare(`${SELECT} WHERE i.code = ?`).get(code) as Invite | undefined) ?? null;
}
export function getInvite(id: number): Invite | null {
  return (db().prepare(`${SELECT} WHERE i.id = ?`).get(id) as Invite | undefined) ?? null;
}
export function listInvites(): Invite[] {
  return db().prepare(`${SELECT} ORDER BY i.id DESC LIMIT 200`).all() as Invite[];
}

export function revokeInvite(id: number): boolean {
  return db().prepare("UPDATE vip_invites SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL AND redeemed_at IS NULL").run(now(), id).changes > 0;
}
export function markEmailed(id: number) {
  db().prepare("UPDATE vip_invites SET emailed_at = ? WHERE id = ?").run(now(), id);
}

/** Resumo seguro para a página pública do convite (não mostra o e-mail completo). */
export function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  return `${u.slice(0, 2)}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
}

export type RedeemResult = { ok: true; days: number; expiresAt: number } | { ok: false; error: string };

/** Usa o convite: libera o Pró por `days` dias, somando ao que a pessoa já tem. Uso único, com checagem do e-mail quando o convite é nominal. */
export function redeemInvite(code: string, userId: number): RedeemResult {
  const d = db();
  const run = d.transaction((): RedeemResult => {
    const inv = d.prepare("SELECT * FROM vip_invites WHERE code = ?").get(code) as { id: number; email: string | null; days: number; expires_at: number; revoked_at: number | null; redeemed_at: number | null } | undefined;
    if (!inv || !CODE_RE.test(code)) return { ok: false, error: "Convite não encontrado." };
    if (inv.revoked_at) return { ok: false, error: "Este convite foi cancelado." };
    if (inv.redeemed_at) return { ok: false, error: "Este convite já foi utilizado." };
    if (inv.expires_at <= now()) return { ok: false, error: "Este convite expirou. Peça um novo ao Emerson." };
    const user = d.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
    if (!user) return { ok: false, error: "Faça login para ativar o convite." };
    if (user.role === "admin") return { ok: false, error: "Administradores já têm acesso total." };
    if (inv.email && inv.email.toLowerCase() !== user.email.toLowerCase()) return { ok: false, error: `Este convite é para ${maskEmail(inv.email)}. Entre ou crie a conta com esse e-mail.` };
    const t = now();
    const base = user.plan === "pro" && user.plan_expires_at && user.plan_expires_at > t ? user.plan_expires_at : t;
    const expiresAt = base + inv.days * 86400;
    d.prepare("UPDATE users SET plan = 'pro', plan_expires_at = ? WHERE id = ?").run(expiresAt, userId);
    d.prepare("UPDATE vip_invites SET redeemed_by = ?, redeemed_at = ? WHERE id = ?").run(userId, t, inv.id);
    return { ok: true, days: inv.days, expiresAt };
  });
  return run();
}
