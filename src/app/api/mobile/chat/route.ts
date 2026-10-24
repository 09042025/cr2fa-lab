import { getUser } from "@/lib/auth";
import { canPost, canView, findChannel, isBanned, listMessages, REACTIONS, REPORT_REASONS } from "@/lib/community";
import { fail, json } from "@/lib/http";

/** Mensagens de um canal para o app. Grátis só lê os canais livres (chat-geral); o resto é Pró. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const slug = new URL(req.url).searchParams.get("c") ?? "chat-geral";
  const ch = findChannel(slug, user.role === "admin");
  if (ch.slug !== slug) return fail("Canal inválido.", 404);
  if (!canView(ch, user)) return fail("Este canal é exclusivo do plano Pró.", 403);
  const banned = user.role !== "admin" && isBanned(user.id);
  return json({
    channel: { slug: ch.slug, name: ch.name, description: ch.description },
    canPost: canPost(ch, user) && !banned,
    banned,
    me: { id: user.id, admin: user.role === "admin" },
    reactions: REACTIONS,
    reportReasons: REPORT_REASONS,
    messages: listMessages(ch.slug, user.id).map((m) => ({
      id: m.id, userId: m.userId, author: m.author, isAdmin: m.isAdmin, avatarId: m.avatarId, body: m.body, createdAt: m.createdAt,
      imageId: m.imageId, audioId: m.audioId, edited: m.edited, reply: m.reply, reactions: m.reactions,
    })),
  });
}
