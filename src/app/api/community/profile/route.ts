import { z } from "zod";
import { getUser } from "@/lib/auth";
import { MAX_BIO, saveCommunityProfile, setFollow } from "@/lib/feed";
import { fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({
  bio: z.string().max(MAX_BIO),
  avatarId: z.number().int().positive().nullable(),
  bannerId: z.number().int().positive().nullable(),
  handle: z.string().max(21),
  location: z.string().max(40),
  website: z.string().max(100),
});

export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("O perfil da comunidade é exclusivo do plano Pró.", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira os campos do perfil.");
  const error = saveCommunityProfile(user.id, parsed.data);
  return error ? fail(error) : json({ ok: true });
}

/** Seguir ou deixar de seguir um membro. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("A Comunidade é exclusiva do plano Pró.", 403);
  const parsed = z.object({ userId: z.number().int().positive(), follow: z.boolean() }).safeParse(await req.json().catch(() => null));
  return parsed.success && setFollow(user.id, parsed.data.userId, parsed.data.follow) ? json({ ok: true }) : fail("Não foi possível alterar.");
}
