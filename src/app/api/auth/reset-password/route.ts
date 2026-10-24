import { z } from "zod";
import { rateLimit, validatePasswordStrength } from "@/lib/auth";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";
import { consumeResetToken } from "@/lib/reset";

const schema = z.object({ token: z.string().max(200), password: z.string().max(200) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  if (!rateLimit(`reset:${clientIp(req)}`, 20, 15 * 60 * 1000)) return fail("Muitas tentativas. Aguarde alguns minutos.", 429);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Preencha a nova senha.");
  const { token, password } = parsed.data;

  const weak = validatePasswordStrength(password);
  if (weak) return fail(weak);

  const ok = await consumeResetToken(token, password);
  if (!ok) return fail("Este link expirou ou já foi usado. Peça um novo em \"Esqueci minha senha\".", 400);
  return json({ ok: true, next: "/entrar?senha=redefinida" });
}
