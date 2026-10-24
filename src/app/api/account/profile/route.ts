import { getUser, rateLimit } from "@/lib/auth";
import { profileSchema, updateProfile } from "@/lib/account";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";

export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const session = await getUser();
  if (!session) return fail("Faça login novamente.", 401);
  if (!rateLimit(`profile:${session.id}:${clientIp(req)}`, 20, 15 * 60 * 1000)) return fail("Muitas tentativas. Aguarde alguns minutos.", 429);

  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Confira os dados.");
  const result = await updateProfile(session.id, parsed.data);
  if (!result.ok) return fail(result.error, result.status);
  return json({ ok: true, emailChanged: result.emailChanged });
}
