import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { canAccessVip, saveProgress } from "@/lib/wfs";

/** Salva o acompanhamento da jornada de 12 semanas e do ciclo (área VIP). */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (!canAccessVip(user)) return fail("Área exclusiva VIP.", 403);
  const parsed = z.object({
    weeks: z.array(z.number().int().min(1).max(12)).max(12),
    stage: z.number().int().min(1).max(6),
    laps: z.number().int().min(0).max(999),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Dados inválidos.");
  saveProgress(user.id, parsed.data);
  return json({ ok: true });
}
