import { z } from "zod";
import { getUser } from "@/lib/auth";
import { setBlocked } from "@/lib/community";
import { fail, json, sameOrigin } from "@/lib/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("A Comunidade é exclusiva do plano Pró.", 403);
  const parsed = z.object({ userId: z.number().int().positive(), blocked: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !setBlocked(user.id, parsed.data.userId, parsed.data.blocked)) return fail("Não foi possível alterar o bloqueio.");
  return json({ ok: true });
}
