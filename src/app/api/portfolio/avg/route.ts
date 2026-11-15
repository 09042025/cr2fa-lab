import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({ items: z.array(z.object({ id: z.number().int(), avg: z.number().positive().max(1e9) })).min(1).max(300) });

/**
 * Preenche o preço médio que falta no Portfólio com o que foi apurado no simulado do IR.
 * Recebe SÓ o id da posição e o preço médio, e nunca sobrescreve um preço médio que já existe.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("Recurso do plano Premium.", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Dados inválidos.");
  const st = db().prepare("UPDATE holdings SET avg_price = ? WHERE id = ? AND user_id = ? AND (avg_price IS NULL OR avg_price = 0)");
  let updated = 0;
  for (const it of parsed.data.items) updated += st.run(it.avg, it.id, user.id).changes;
  return json({ ok: true, updated });
}
