import { z } from "zod";
import { getUser, hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth";
import { db, type UserRow } from "@/lib/db";
import { fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({ current: z.string().max(200), next: z.string().max(200) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const session = await getUser();
  if (!session) return fail("Faça login novamente.", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Preencha os dois campos.");
  const { current, next } = parsed.data;

  const row = db().prepare("SELECT * FROM users WHERE id = ?").get(session.id) as UserRow;
  if (!(await verifyPassword(current, row.password_hash))) return fail("A senha atual está incorreta.", 401);
  if (current === next) return fail("A nova senha precisa ser diferente da atual.");
  const weak = validatePasswordStrength(next);
  if (weak) return fail(weak);

  db().prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(await hashPassword(next), session.id);
  return json({ ok: true, next: "/painel" });
}
