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
export const MAX_BIO = 160;

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
  pinned: boolean;
  reposts: number;
  reposted: boolean;
  bookmarked: boolean;
  views: number;
  /** No filtro "Seguindo": nome de quem você segue que repostou esta publicação. */
  repostedBy: string | null;
  comments: Comment[];
}
export interface Comment { id: number; postId: number; userId: number; author: string; authorAvatar: number | null; authorIsAdmin: boolean; body: string; createdAt: number }

interface ListOpts { viewerId: number; topic?: string; following?: boolean; saved?: boolean; onlyId?: number; excludeId?: number; authorId?: number; before?: number; limit?: number }

/** Publicações mais novas primeiro. Esconde quem o leitor bloqueou. Cada página traz `limit` itens; use `before` (id) para a seguinte. */
export function listPosts(o: ListOpts): { posts: Post[]; more: boolean } {
  const limit = o.limit ?? 15;
  const where: string[] = ["(p.user_id = ? OR p.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = ?))"];
  const args: (number | string)[] = [o.viewerId, o.viewerId];
  if (o.topic && TOPICS.some((t) => t.id === o.topic)) { where.push("p.topic = ?"); args.push(o.topic); }
  if (o.following) {
    where.push("(p.user_id IN (SELECT followed_id FROM community_follows WHERE follower_id = ?) OR p.id IN (SELECT r.post_id FROM post_reposts r WHERE r.user_id IN (SELECT followed_id FROM community_follows WHERE follower_id = ?)))");
    args.push(o.viewerId, o.viewerId);
  }
  if (o.saved) where.push("p.id IN (SELECT post_id FROM post_bookmarks WHERE user_id = ?)"), args.push(o.viewerId);
  if (o.onlyId) { where.push("p.id = ?"); args.push(o.onlyId); }
  if (o.excludeId) { where.push("p.id != ?"); args.push(o.excludeId); }
  if (o.authorId) { where.push("p.user_id = ?"); args.push(o.authorId); }
  if (o.before) { where.push("p.id < ?"); args.push(o.before); }
  const rows = db()
    .prepare(
      `SELECT p.id, p.user_id userId, u.name author, u.avatar_id authorAvatar, u.role = 'admin' authorIsAdmin, u.community_banned = 1 authorBanned,
              p.topic, p.body, p.image_id imageId, p.created_at createdAt,
              (SELECT COUNT(*) FROM community_post_likes l WHERE l.post_id = p.id) likes,
              EXISTS (SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = ?) liked,
              u.pinned_post_id = p.id pinned,
              (SELECT COUNT(*) FROM post_reposts r WHERE r.post_id = p.id) reposts,
              EXISTS (SELECT 1 FROM post_reposts r WHERE r.post_id = p.id AND r.user_id = ?) reposted,
              EXISTS (SELECT 1 FROM post_bookmarks b WHERE b.post_id = p.id AND b.user_id = ?) bookmarked,
              (SELECT COUNT(*) FROM post_views v WHERE v.post_id = p.id) views,
              ${o.following ? "(SELECT u2.name FROM post_reposts r2 JOIN users u2 ON u2.id = r2.user_id WHERE r2.post_id = p.id AND r2.user_id IN (SELECT followed_id FROM community_follows WHERE follower_id = ?) AND p.user_id NOT IN (SELECT followed_id FROM community_follows WHERE follower_id = ?) ORDER BY r2.created_at DESC LIMIT 1)" : "NULL"} repostedBy
       FROM community_posts p JOIN users u ON u.id = p.user_id
       WHERE ${where.join(" AND ")} ORDER BY p.id DESC LIMIT ?`,
    )
    .all(...[o.viewerId, o.viewerId, o.viewerId, ...(o.following ? [o.viewerId, o.viewerId] : []), ...args, limit + 1]) as (Omit<Post, "comments" | "authorIsAdmin" | "authorBanned" | "liked" | "pinned" | "reposted" | "bookmarked"> & { authorIsAdmin: number; authorBanned: number; liked: number; pinned: number; reposted: number; bookmarked: number })[];
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
      pinned: !!r.pinned,
      reposted: !!r.reposted,
      bookmarked: !!r.bookmarked,
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
  db().prepare("UPDATE users SET pinned_post_id = NULL WHERE pinned_post_id = ?").run(id);
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

const postExists = (id: number) => !!db().prepare("SELECT 1 FROM community_posts WHERE id = ?").get(id);

function toggleRow(table: "post_reposts" | "post_bookmarks", postId: number, userId: number): boolean {
  if (!postExists(postId)) return false;
  const del = db().prepare(`DELETE FROM ${table} WHERE post_id = ? AND user_id = ?`).run(postId, userId);
  if (!del.changes) db().prepare(`INSERT INTO ${table} (post_id, user_id) VALUES (?, ?)`).run(postId, userId);
  return true;
}
/** Repostar: aparece também para quem segue você (filtro "Seguindo"). Repostar a própria publicação não conta. */
export const toggleRepost = (postId: number, userId: number): boolean => {
  const own = db().prepare("SELECT 1 FROM community_posts WHERE id = ? AND user_id = ?").get(postId, userId);
  return !own && toggleRow("post_reposts", postId, userId);
};
export const toggleBookmark = (postId: number, userId: number): boolean => toggleRow("post_bookmarks", postId, userId);

/** Visualização única por membro; o autor não conta. */
export function recordViews(postIds: number[], userId: number): number {
  let n = 0;
  for (const id of postIds.slice(0, 30)) {
    n += db().prepare("INSERT OR IGNORE INTO post_views (post_id, user_id) SELECT id, ? FROM community_posts WHERE id = ? AND user_id != ?").run(userId, id, userId).changes;
  }
  return n;
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

export interface Member {
  id: number; name: string; handle: string; bio: string; avatarId: number | null; bannerId: number | null; location: string; website: string;
  isAdmin: boolean; banned: boolean; since: number; posts: number; followers: number; following: number; iFollow: boolean;
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
export const handleOk = (h: string) => HANDLE_RE.test(h);

/** Nome de usuário padrão enquanto a pessoa não escolhe um: primeiro nome sem acento + número do membro. */
export function defaultHandle(name: string, id: number): string {
  const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "membro";
  return `${base}${id}`;
}

export function getMember(id: number, viewerId = 0): Member | null {
  const r = db()
    .prepare(
      `SELECT u.id, u.name, u.handle, u.bio, u.avatar_id avatarId, u.banner_id bannerId, u.location, u.website,
              u.role = 'admin' isAdmin, u.community_banned = 1 banned, u.created_at since,
              (SELECT COUNT(*) FROM community_posts p WHERE p.user_id = u.id) posts,
              (SELECT COUNT(*) FROM community_follows f WHERE f.followed_id = u.id) followers,
              (SELECT COUNT(*) FROM community_follows f WHERE f.follower_id = u.id) following,
              EXISTS (SELECT 1 FROM community_follows f WHERE f.follower_id = ? AND f.followed_id = u.id) iFollow
       FROM users u WHERE u.id = ?`,
    )
    .get(viewerId, id) as (Omit<Member, "handle" | "isAdmin" | "banned" | "iFollow"> & { handle: string | null; isAdmin: number; banned: number; iFollow: number }) | undefined;
  return r ? { ...r, handle: r.handle ?? defaultHandle(r.name, r.id), isAdmin: !!r.isAdmin, banned: !!r.banned, iFollow: !!r.iFollow } : null;
}

/** Aceita só endereços http(s); devolve o endereço limpo ou "" se for inválido. */
export function cleanWebsite(raw: string): string | null {
  const t = raw.trim();
  if (!t) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || t.length > 100) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export interface ProfileInput { bio: string; avatarId: number | null; bannerId: number | null; handle: string; location: string; website: string }

/** Salva o perfil. Fotos precisam ser da própria pessoa; o @usuário é único. Devolve a mensagem de erro, ou null se deu certo. */
export function saveCommunityProfile(userId: number, p: ProfileInput): string | null {
  const bio = p.bio.trim();
  const location = p.location.trim();
  const handle = p.handle.trim().replace(/^@/, "").toLowerCase();
  if (bio.length > MAX_BIO) return `A bio pode ter até ${MAX_BIO} caracteres.`;
  if (location.length > 40) return "A localização pode ter até 40 caracteres.";
  if (handle && !handleOk(handle)) return "O @usuário deve ter de 3 a 20 letras minúsculas, números ou _.";
  const site = cleanWebsite(p.website);
  if (site === null) return "O link precisa ser um endereço válido (ex.: seusite.com.br).";
  if (p.avatarId !== null && !ownImage(userId, p.avatarId)) return "A foto precisa ser sua.";
  if (p.bannerId !== null && !ownImage(userId, p.bannerId)) return "A capa precisa ser sua.";
  if (handle) {
    const taken = db().prepare("SELECT 1 FROM users WHERE handle = ? AND id != ?").get(handle, userId);
    if (taken) return "Este @usuário já está em uso. Escolha outro.";
  }
  db().prepare("UPDATE users SET bio = ?, avatar_id = ?, banner_id = ?, location = ?, website = ?, handle = ? WHERE id = ?").run(bio, p.avatarId, p.bannerId, location, site, handle || null, userId);
  return null;
}

export function setFollow(followerId: number, followedId: number, follow: boolean): boolean {
  if (followerId === followedId || !db().prepare("SELECT 1 FROM users WHERE id = ?").get(followedId)) return false;
  if (follow) db().prepare("INSERT OR IGNORE INTO community_follows (follower_id, followed_id) VALUES (?, ?)").run(followerId, followedId);
  else db().prepare("DELETE FROM community_follows WHERE follower_id = ? AND followed_id = ?").run(followerId, followedId);
  return true;
}

/** Fixa uma publicação no topo do próprio perfil (uma por vez). pin=false desafixa. */
export function setPinned(userId: number, postId: number, pin: boolean): boolean {
  if (!pin) return db().prepare("UPDATE users SET pinned_post_id = NULL WHERE id = ? AND pinned_post_id = ?").run(userId, postId).changes > 0;
  if (!db().prepare("SELECT 1 FROM community_posts WHERE id = ? AND user_id = ?").get(postId, userId)) return false;
  db().prepare("UPDATE users SET pinned_post_id = ? WHERE id = ?").run(postId, userId);
  return true;
}

export function pinnedPostId(userId: number): number | null {
  return (db().prepare("SELECT pinned_post_id p FROM users WHERE id = ?").get(userId) as { p: number | null } | undefined)?.p ?? null;
}

export interface FollowItem { id: number; name: string; handle: string; bio: string; avatarId: number | null; iFollow: boolean; isMe: boolean }

/** Quem segue (followers) ou quem é seguido (following) por um membro, com o estado "eu sigo" do leitor. */
export function listFollows(userId: number, kind: "followers" | "following", viewerId: number): FollowItem[] {
  const [me, other] = kind === "followers" ? ["followed_id", "follower_id"] : ["follower_id", "followed_id"];
  const rows = db()
    .prepare(
      `SELECT u.id, u.name, u.handle, u.bio, u.avatar_id avatarId,
              EXISTS (SELECT 1 FROM community_follows f2 WHERE f2.follower_id = ? AND f2.followed_id = u.id) iFollow
       FROM community_follows f JOIN users u ON u.id = f.${other}
       WHERE f.${me} = ? AND u.id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = ?)
       ORDER BY u.name LIMIT 200`,
    )
    .all(viewerId, userId, viewerId) as (Omit<FollowItem, "handle" | "iFollow" | "isMe"> & { handle: string | null; iFollow: number })[];
  return rows.map((r) => ({ ...r, handle: r.handle ?? defaultHandle(r.name, r.id), iFollow: !!r.iFollow, isMe: r.id === viewerId }));
}
