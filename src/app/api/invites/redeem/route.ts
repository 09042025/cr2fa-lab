import { z } from "zod";
import { getUser, rateLimit } from "@/lib/auth";
import { redeemInvite } from "@/lib/invites";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login para ativar o convite.", 401);
  if (!rateLimit(`invite:${user.id}:${clientIp(req)}`, 10, 15 * 60_000)) return fail("Muitas tentativas. Aguarde alguns minutos.", 429);
  const parsed = z.object({ code: z.string().max(64) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Convite inválido.");
  const r = redeemInvite(parsed.data.code, user.id);
  return r.ok ? json({ ok: true, days: r.days, expiresAt: r.expiresAt }) : fail(r.error, 400);
}
