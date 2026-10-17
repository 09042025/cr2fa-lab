import { z } from "zod";
import { createSession, hashPassword, rateLimit, validatePasswordStrength } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().max(200),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  if (!rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000)) return fail("Muitos cadastros deste endereço. Tente mais tarde.", 429);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira nome, e-mail e senha.");
  const { name, email, password } = parsed.data;

  const weak = validatePasswordStrength(password);
  if (weak) return fail(weak);

  const exists = db().prepare("SELECT 1 FROM users WHERE email = ?").get(email);
  if (exists) return fail("Este e-mail já está cadastrado.", 409);

  const info = db()
    .prepare("INSERT INTO users (email, name, password_hash, role, plan) VALUES (?, ?, ?, 'user', 'free')")
    .run(email, name, await hashPassword(password));
  await createSession(Number(info.lastInsertRowid));
  return json({ ok: true, next: "/painel" }, 201);
}
