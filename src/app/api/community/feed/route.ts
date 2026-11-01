import { z } from "zod";
import { getUser, rateLimit } from "@/lib/auth";
import { REPORT_REASONS, isBanned } from "@/lib/community";
import { recordViews, toggleBookmark, toggleRepost, setPinned, addComment, addPost, deleteComment, deletePost, MAX_COMMENT, MAX_POST, reportPost, toggleLike } from "@/lib/feed";
import { fail, json, sameOrigin } from "@/lib/http";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("post"), topic: z.string().max(20), body: z.string().max(MAX_POST), imageId: z.number().int().positive().nullish() }),
  z.object({ action: z.literal("like"), postId: z.number().int().positive() }),
  z.object({ action: z.literal("comment"), postId: z.number().int().positive(), body: z.string().max(MAX_COMMENT) }),
  z.object({ action: z.literal("repost"), postId: z.number().int().positive() }),
  z.object({ action: z.literal("bookmark"), postId: z.number().int().positive() }),
  z.object({ action: z.literal("views"), postIds: z.array(z.number().int().positive()).max(30) }),
  z.object({ action: z.literal("pin"), postId: z.number().int().positive(), pin: z.boolean() }),
  z.object({ action: z.literal("report"), postId: z.number().int().positive(), reason: z.string().max(60) }),
]);

async function member() {
  const user = await getUser();
  if (!user) return { error: fail("Faça login.", 401) };
  return { user };
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const { user, error } = await member();
  if (error) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira o que você escreveu.");
  const d = parsed.data;
  if (d.action === "views") return json({ counted: recordViews(d.postIds, user!.id) });
  if (d.action === "bookmark") return toggleBookmark(d.postId, user!.id) ? json({ ok: true }) : fail("Publicação não encontrada.", 404);
  if (isBanned(user!.id)) return fail("Você foi suspenso da comunidade pela moderação.", 403);
  if (!rateLimit(`feed:${user!.id}`, 30, 60_000)) return fail("Calma! Muitas ações seguidas. Tente em instantes.", 429);
  if (d.action === "post") {
    if (!rateLimit(`feed-post:${user!.id}`, 10, 60 * 60_000)) return fail("Limite de 10 publicações por hora atingido.", 429);
    return addPost(user!.id, d.topic, d.body, d.imageId) ? json({ ok: true }, 201) : fail("Escreva algo ou anexe uma imagem.");
  }
  if (d.action === "pin") return setPinned(user!.id, d.postId, d.pin) ? json({ ok: true }) : fail("Só é possível fixar publicações suas.", 403);
  if (d.action === "repost") return toggleRepost(d.postId, user!.id) ? json({ ok: true }) : fail("Não é possível repostar esta publicação (ela é sua ou não existe).", 400);
  if (d.action === "like") return toggleLike(d.postId, user!.id) ? json({ ok: true }) : fail("Publicação não encontrada.", 404);
  if (d.action === "comment") return addComment(d.postId, user!.id, d.body) ? json({ ok: true }, 201) : fail("Escreva um comentário de até 500 caracteres.");
  return reportPost(d.postId, user!.id, d.reason, REPORT_REASONS) ? json({ ok: true }, 201) : fail("Não foi possível denunciar (você já denunciou ou a publicação é sua).");
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const q = new URL(req.url).searchParams;
  const id = Number(q.get("id"));
  if (!Number.isInteger(id)) return fail("Item inválido.");
  const ok = q.get("kind") === "comment" ? deleteComment(id, user) : deletePost(id, user);
  return ok ? json({ ok: true }) : fail("Não foi possível apagar.", 404);
}
