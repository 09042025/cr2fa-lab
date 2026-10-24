import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit, rateLimitReset, signToken, userFromToken, verifyPassword } from "@/lib/auth";
import { db, type UserRow } from "@/lib/db";
import { clientIp, fail, json } from "@/lib/http";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });
const DUMMY = bcrypt.hashSync("senha-inexistente", 12);
const APP_TOKEN_SECONDS = 60 * 60 * 24 * 30; // 30 dias

/** Login do app: devolve um token para o celular guardar (no cofre do aparelho). */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Informe um e-mail e uma senha válidos.");
  const { email, password } = parsed.data;

  const key = `login:${clientIp(req)}:${email}`;
  if (!rateLimit(key)) return fail("Muitas tentativas. Aguarde alguns minutos e tente de novo.", 429);

  const row = db().prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  const ok = await verifyPassword(password, row?.password_hash ?? DUMMY).catch(() => false);
  if (!row || !ok) return fail("E-mail ou senha incorretos.", 401);
  if (row.must_change_password) return fail("Antes de usar o app, entre uma vez no site (nizainvest.com.br) e troque a sua senha.", 403);

  rateLimitReset(key);
  const token = await signToken(row.id, APP_TOKEN_SECONDS);
  const user = await userFromToken(token);
  return json({ token, user: user && { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, planExpiresAt: user.planExpiresAt, onTrial: user.onTrial } });
}
