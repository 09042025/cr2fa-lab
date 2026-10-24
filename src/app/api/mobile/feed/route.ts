import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { REPORT_REASONS } from "@/lib/community";
import { listPosts, TOPICS } from "@/lib/feed";

/** Feed para o app: ?t=cripto | seguindo | (vazio = tudo), ?antes=<id> para a página seguinte. Livre para todos os planos. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const q = new URL(req.url).searchParams;
  const t = q.get("t") ?? "";
  const { posts, more } = listPosts({
    viewerId: user.id,
    topic: TOPICS.some((x) => x.id === t) ? t : undefined,
    following: t === "seguindo",
    before: Number(q.get("antes")) || undefined,
  });
  return json({
    topics: TOPICS,
    reportReasons: REPORT_REASONS,
    me: { id: user.id, admin: user.role === "admin" },
    posts: posts.map((p) => ({
      id: p.id, userId: p.userId, author: p.author, authorAvatar: p.authorAvatar, authorIsAdmin: p.authorIsAdmin, topic: p.topic, body: p.body, imageId: p.imageId,
      createdAt: p.createdAt, likes: p.likes, liked: p.liked, pinned: p.pinned,
      comments: p.comments.map((c) => ({ id: c.id, userId: c.userId, author: c.author, authorAvatar: c.authorAvatar, authorIsAdmin: c.authorIsAdmin, body: c.body, createdAt: c.createdAt })),
    })),
    more,
  });
}
