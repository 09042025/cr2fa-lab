import { getUser, rateLimit, verifyPassword, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";

/** Exclui a própria conta (e tudo ligado a ela) depois de confirmar a senha. Exigido pela Google Play. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login novamente.", 401);
  if (user.role === "admin") return fail("A conta de administrador não pode ser excluída por aqui.", 403);
  if (!rateLimit(`delete:${user.id}:${clientIp(req)}`, 5, 15 * 60 * 1000)) return fail("Muitas tentativas. Aguarde alguns minutos.", 429);
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const row = db().prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string } | undefined;
  if (!row || !(await verifyPassword(password, row.password_hash))) return fail("Senha incorreta.", 403);
  db().prepare("DELETE FROM users WHERE id = ?").run(user.id);
  await destroySession().catch(() => undefined);
  return json({ ok: true });
}
