import { z } from "zod";
import { getUser } from "@/lib/auth";
import { setBanned } from "@/lib/community";
import { fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({ userId: z.number().int().positive(), banned: z.boolean() });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user || user.role !== "admin") return fail("Somente administradores.", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !setBanned(user, parsed.data.userId, parsed.data.banned)) return fail("Não foi possível alterar este membro.");
  return json({ ok: true });
}
