import { z } from "zod";
import { getUser, rateLimit } from "@/lib/auth";
import { isBanned } from "@/lib/community";
import { fail, json, sameOrigin } from "@/lib/http";
import { createStory, shareStoryToFeed, deleteStory, listStoryGroups, markViewed, MAX_CAPTION } from "@/lib/stories";

const schema = z.object({
  imageId: z.number().int().positive().optional(),
  caption: z.string().max(MAX_CAPTION * 2).default(""),
  view: z.number().int().positive().optional(),
  videoId: z.number().int().positive().optional(),
  share: z.number().int().positive().optional(),
});

/** GET: stories ativos (últimas 24 h). POST: publicar ({imageId, caption}) ou marcar como visto ({view}). DELETE ?id=N: apagar. */
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  return json({ groups: listStoryGroups(user.id) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira o story.");
  if (parsed.data.view) return markViewed(parsed.data.view, user.id) ? json({ ok: true }) : fail("Story não encontrado.", 404);
  if (parsed.data.share) {
    if (user.role !== "admin" && isBanned(user.id)) return fail("Você foi suspenso da comunidade pela moderação.", 403);
    return shareStoryToFeed(parsed.data.share, user.id) ? json({ ok: true }, 201) : fail("Não foi possível publicar (já está no Feed ou o story expirou).");
  }
  if (!parsed.data.imageId) return fail("Escolha uma foto.");
  if (user.role !== "admin" && isBanned(user.id)) return fail("Você foi suspenso da comunidade pela moderação.", 403);
  if (!rateLimit(`story:${user.id}`, 20, 60 * 60_000)) return fail("Muitos stories seguidos. Tente mais tarde.", 429);
  const r = createStory(user.id, parsed.data.imageId, parsed.data.caption, parsed.data.videoId ?? null);
  return r.ok ? json({ id: r.id }, 201) : fail(r.error, r.status ?? 400);
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const id = Number(new URL(req.url).searchParams.get("id"));
  return deleteStory(id, user) ? json({ ok: true }) : fail("Não foi possível apagar.", 404);
}
