import { z } from "zod";
import { getUser } from "@/lib/auth";
import { MAX_BIO, saveCommunityProfile } from "@/lib/feed";
import { fail, json, sameOrigin } from "@/lib/http";

export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("O perfil da comunidade é exclusivo do plano Pró.", 403);
  const parsed = z.object({ bio: z.string().max(MAX_BIO), avatarId: z.number().int().positive().nullable() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !saveCommunityProfile(user.id, parsed.data.bio, parsed.data.avatarId)) return fail(`A bio pode ter até ${MAX_BIO} caracteres e a foto precisa ser sua.`);
  return json({ ok: true });
}
