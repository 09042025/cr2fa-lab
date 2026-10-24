import { z } from "zod";
import { getUser } from "@/lib/auth";
import { isBanned, toggleReaction } from "@/lib/community";
import { fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({ messageId: z.number().int().positive(), emoji: z.string().max(8) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("A Comunidade é exclusiva do plano Pró.", 403);
  if (isBanned(user.id)) return fail("Você foi suspenso da comunidade pela moderação.", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !toggleReaction(parsed.data.messageId, user.id, parsed.data.emoji)) return fail("Reação inválida.");
  return json({ ok: true });
}
