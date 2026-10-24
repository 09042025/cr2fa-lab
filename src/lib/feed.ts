import { db } from "./db";

/** Assuntos do feed: ajudam a filtrar as publicações. */
export const TOPICS = [
  { id: "geral", label: "Geral" },
  { id: "cripto", label: "Cripto" },
  { id: "acoes", label: "Ações" },
  { id: "fiis", label: "FIIs" },
  { id: "renda-fixa", label: "Renda fixa" },
  { id: "macro", label: "Economia" },
] as const;
export const topicLabel = (id: string) => TOPICS.find((t) => t.id === id)?.label ?? "Geral";
export const MAX_POST = 1500;
export const MAX_COMMENT = 500;
export const MAX_BIO = 200;

export interface Post {
  id: number;
  userId: number;
  author: string;
  authorAvatar: number | null;
  authorIsAdmin: boolean;
  authorBanned: boolean;
  topic: string;
  body: string;
  imageId: number | null;
  createdAt: number;
  likes: number;
  liked: boolean;
  comments: Comment[];
}
export interface Comment { id: number; postId: number; userId: number; author: string; authorAvatar: number | null; authorIsAdmin: boolean; body: string; createdAt: number }

interface ListOpts { viewerId: number; topic?: string; authorId?: number; before?: number; limit?: number }

/** Publicações mais novas primeiro. Esconde quem o leitor bloqueou. Cada página traz `limit` itens; use `before` (id) para a seguinte. */
export function listPosts(o: ListOpts): { posts: Post[]; more: boolean } {
  const limit = o.limit ?? 15;
  const where: string[] = ["(p.user_id = ? OR p.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = ?))"];
  const args: (number | string)[] = [o.viewerId, o.viewerId];
  if (o.topic && TOPICS.some((t) => t.id === o.topic)) { where.push("p.topic = ?"); args.push(o.topic); }
  if (o.authorId) { where.push("p.user_id = ?"); args.push(o.authorId); }
  if (o.before) { where.push("p.id < ?"); args.push(o.before); }
  const rows = db()
    .prepare(
      `SELECT p.id, p.user_id userId, u.name author, u.avatar_id authorAvatar, u.role = 'admin' authorIsAdmin, u.community_banned = 1 authorBanned,
              p.topic, p.body, p.image_id imageId, p.created_at createdAt,
              (SELECT COUNT(*) FROM community_post_likes l WHERE l.post_id = p.id) likes,
              EXISTS (SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = ?) liked
       FROM community_posts p JOIN users u ON u.id = p.user_id
       WHERE ${where.join(" AND ")} ORDER BY p.id DESC LIMIT ?`,
    )
    .all(o.viewerId, ...args, limit + 1) as (Omit<Post, "comments" | "authorIsAdmin" | "authorBanned" | "liked"> & { authorIsAdmin: number; authorBanned: number; liked: number })[];
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  const ids = page.map((r) => r.id);
  const cs = ids.length
    ? (db()
        .prepare(
          `SELECT c.id, c.post_id postId, c.user_id userId, u.name author, u.avatar_id authorAvatar, u.role = 'admin' authorIsAdmin, c.body, c.created_at createdAt
           FROM community_comments c JOIN users u ON u.id = c.user_id
           WHERE c.post_id IN (${ids.map(() => "?").join(",")})
             AND (c.user_id = ? OR c.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = ?))
           ORDER BY c.id ASC`,
        )
        .all(...ids, o.viewerId, o.viewerId) as (Omit<Comment, "authorIsAdmin"> & { authorIsAdmin: number })[])
    : [];
  return {
    more,
    posts: page.map((r) => ({
      ...r,
      authorIsAdmin: !!r.authorIsAdmin,
      authorBanned: !!r.authorBanned,
      liked: !!r.liked,
      comments: cs.filter((c) => c.postId === r.id).map((c) => ({ ...c, authorIsAdmin: !!c.authorIsAdmin })),
    })),
  };
}

function ownImage(userId: number, imageId?: number | null): number | null {
  if (!imageId) return null;
  return (db().prepare("SELECT id FROM community_images WHERE id = ? AND user_id = ?").get(imageId, userId) as { id: number } | undefined)?.id ?? null;
}

export function addPost(userId: number, topic: string, body: string, imageId?: number | null): number | null {
  const text = body.trim();
  const img = ownImage(userId, imageId);
  if ((!text && !img) || text.length > MAX_POST) return null;
  const t = TOPICS.some((x) => x.id === topic) ? topic : "geral";
  return Number(db().prepare("INSERT INTO community_posts (user_id, topic, body, image_id) VALUES (?, ?, ?, ?)").run(userId, t, text, img).lastInsertRowid);
}

export function deletePost(id: number, user: { id: number; role: string }): boolean {
  const r =
    user.role === "admin"
      ? db().prepare("DELETE FROM community_posts WHERE id = ?").run(id)
      : db().prepare("DELETE FROM community_posts WHERE id = ? AND user_id = ?").run(id, user.id);
  return r.changes > 0;
}

export function toggleLike(postId: number, userId: number): boolean {
  if (!db().prepare("SELECT 1 FROM community_posts WHERE id = ?").get(postId)) return false;
  const del = db().prepare("DELETE FROM community_post_likes WHERE post_id = ? AND user_id = ?").run(postId, userId);
  if (!del.changes) db().prepare("INSERT INTO community_post_likes (post_id, user_id) VALUES (?, ?)").run(postId, userId);
  return true;
}

export function addComment(postId: number, userId: number, body: string): boolean {
  const text = body.trim();
  if (!text || text.length > MAX_COMMENT) return false;
  if (!db().prepare("SELECT 1 FROM community_posts WHERE id = ?").get(postId)) return false;
  db().prepare("INSERT INTO community_comments (post_id, user_id, body) VALUES (?, ?, ?)").run(postId, userId, text);
  return true;
}

export function deleteComment(id: number, user: { id: number; role: string }): boolean {
  const r =
    user.role === "admin"
      ? db().prepare("DELETE FROM community_comments WHERE id = ?").run(id)
      : db().prepare("DELETE FROM community_comments WHERE id = ? AND user_id = ?").run(id, user.id);
  return r.changes > 0;
}

export function reportPost(postId: number, reporterId: number, reason: string, allowed: readonly string[]): boolean {
  if (!allowed.includes(reason)) return false;
  const p = db().prepare("SELECT user_id FROM community_posts WHERE id = ?").get(postId) as { user_id: number } | undefined;
  if (!p || p.user_id === reporterId) return false;
  return db().prepare("INSERT OR IGNORE INTO community_post_reports (post_id, reporter_id, reason) VALUES (?, ?, ?)").run(postId, reporterId, reason).changes > 0;
}

export interface PostReport { id: number; reason: string; createdAt: number; reporter: string; postId: number; body: string; authorId: number; author: string; authorBanned: boolean }
export function listPostReports(): PostReport[] {
  return db()
    .prepare(
      `SELECT r.id, r.reason, r.created_at createdAt, rp.name reporter, p.id postId, p.body, a.id authorId, a.name author, a.community_banned = 1 authorBanned
       FROM community_post_reports r JOIN community_posts p ON p.id = r.post_id
       JOIN users rp ON rp.id = r.reporter_id JOIN users a ON a.id = p.user_id
       ORDER BY r.id DESC LIMIT 100`,
    )
    .all() as PostReport[];
}
export function dismissPostReport(id: number): boolean {
  return db().prepare("DELETE FROM community_post_reports WHERE id = ?").run(id).changes > 0;
}

/* ------------------------------ Perfil público ------------------------------ */

export interface Member { id: number; name: string; bio: string; avatarId: number | null; isAdmin: boolean; banned: boolean; since: number; posts: number }

export function getMember(id: number): Member | null {
  const r = db()
    .prepare(
      `SELECT u.id, u.name, u.bio, u.avatar_id avatarId, u.role = 'admin' isAdmin, u.community_banned = 1 banned, u.created_at since,
              (SELECT COUNT(*) FROM community_posts p WHERE p.user_id = u.id) posts
       FROM users u WHERE u.id = ?`,
    )
    .get(id) as (Omit<Member, "isAdmin" | "banned"> & { isAdmin: number; banned: number }) | undefined;
  return r ? { ...r, isAdmin: !!r.isAdmin, banned: !!r.banned } : null;
}

/** Salva bio e foto. A foto precisa ser uma imagem enviada pela própria pessoa; avatarId null remove. */
export function saveCommunityProfile(userId: number, bio: string, avatarId: number | null): boolean {
  const text = bio.trim();
  if (text.length > MAX_BIO) return false;
  if (avatarId !== null && !ownImage(userId, avatarId)) return false;
  db().prepare("UPDATE users SET bio = ?, avatar_id = ? WHERE id = ?").run(text, avatarId, userId);
  return true;
}
