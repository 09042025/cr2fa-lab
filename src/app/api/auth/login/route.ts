import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession, rateLimit, rateLimitReset, verifyPassword } from "@/lib/auth";
import { db, type UserRow } from "@/lib/db";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

// Hash válido só para igualar o tempo de resposta quando o e-mail não existe
const DUMMY = bcrypt.hashSync("senha-inexistente", 12);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Informe um e-mail e uma senha válidos.");
  const { email, password } = parsed.data;

  const key = `login:${clientIp(req)}:${email}`;
  if (!rateLimit(key)) return fail("Muitas tentativas. Aguarde alguns minutos e tente de novo.", 429);

  const user = db().prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY).catch(() => false);
  if (!user || !ok) return fail("E-mail ou senha incorretos.", 401);

  rateLimitReset(key);
  await createSession(user.id);
  return json({ ok: true, next: user.must_change_password ? "/trocar-senha" : "/painel" });
}
