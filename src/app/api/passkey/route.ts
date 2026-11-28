import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json, sameOrigin } from "@/lib/http";

/** Remove um Face ID cadastrado (ou todos, se não vier o id). */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Entre na sua conta primeiro.", 401);
  const parsed = z.object({ id: z.number().int().optional() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("Pedido inválido.");
  if (parsed.data.id) db().prepare("DELETE FROM passkeys WHERE id = ? AND user_id = ?").run(parsed.data.id, user.id);
  else db().prepare("DELETE FROM passkeys WHERE user_id = ?").run(user.id);
  return json({ ok: true });
}
