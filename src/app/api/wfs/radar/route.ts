import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { canAccessVip, saveRadar } from "@/lib/wfs";

/** Salva a autoavaliação do mês (10 notas de 0 a 10). Área VIP. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (!canAccessVip(user)) return fail("Área exclusiva VIP.", 403);
  const parsed = z.object({ ym: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), scores: z.array(z.number().int().min(0).max(10)).length(10) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Dados inválidos.");
  return saveRadar(user.id, parsed.data.ym, parsed.data.scores) ? json({ ok: true }) : fail("Dados inválidos.");
}
