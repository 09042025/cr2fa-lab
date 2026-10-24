import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "./auth";
import { db, now } from "./db";

export const RESET_TTL_SECONDS = 60 * 60; // o link vale por 1 hora

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Cria um link de recuperação. Links anteriores do mesmo usuário deixam de valer. Devolve o token puro (vai só por e-mail). */
export function createResetToken(userId: number): string {
  const token = randomBytes(32).toString("hex");
  const d = db();
  d.prepare("DELETE FROM password_resets WHERE user_id = ?").run(userId);
  d.prepare("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), userId, now() + RESET_TTL_SECONDS);
  return token;
}

/** Diz se o token existe, não foi usado e não expirou (sem consumir). */
export function isResetTokenValid(token: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const row = db().prepare("SELECT expires_at, used_at FROM password_resets WHERE token_hash = ?").get(sha256(token)) as
    | { expires_at: number; used_at: number | null }
    | undefined;
  return Boolean(row && row.used_at === null && row.expires_at > now());
}

/** Troca a senha usando o token. Cada token vale uma única vez. A validação de força da senha é feita por quem chama. */
export async function consumeResetToken(token: string, newPassword: string): Promise<boolean> {
  if (!isResetTokenValid(token)) return false;
  const hash = await hashPassword(newPassword);
  const d = db();
  const tokenHash = sha256(token);
  const apply = d.transaction(() => {
    const marked = d.prepare("UPDATE password_resets SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?").run(now(), tokenHash, now());
    if (marked.changes !== 1) return false;
    const row = d.prepare("SELECT user_id FROM password_resets WHERE token_hash = ?").get(tokenHash) as { user_id: number };
    d.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(hash, row.user_id);
    d.prepare("DELETE FROM password_resets WHERE user_id = ?").run(row.user_id);
    return true;
  });
  return apply();
}
