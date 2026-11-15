import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db, now } from "@/lib/db";
import { fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({ id: z.number().int() });

/** "Estou ciente": o investidor viu o ativo e decidiu; o e-mail diário de alerta para enquanto ele continuar ruim. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Posição inválida.");
  db().prepare("UPDATE holdings SET ack_at = ? WHERE id = ? AND user_id = ?").run(now(), parsed.data.id, user.id);
  return json({ ok: true });
}
