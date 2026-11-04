import { db } from "./db";

/** Cashpills: vídeos curtos (reels) dos membros. Duração máxima escolhida na gravação. */
export const CASHPILL_DURATIONS = [15, 30, 45, 60] as const;
export const MAX_CASHPILL_CAPTION = 200;

export interface Cashpill { id: number; userId: number; videoId: number; posterId: number; caption: string; duration: number; createdAt: number }
const SEL = "SELECT id, user_id userId, video_id videoId, poster_id posterId, caption, duration, created_at createdAt FROM cashpills";

export function createCashpill(userId: number, videoId: number, posterId: number, durationRaw: number, captionRaw: string): { ok: true; id: number } | { ok: false; error: string; status?: number } {
  const caption = captionRaw.replace(/\s+/g, " ").trim().slice(0, MAX_CASHPILL_CAPTION);
  const duration = Math.max(1, Math.min(60, Math.round(durationRaw) || 1));
  const v = db().prepare("SELECT 1 FROM community_videos WHERE id = ? AND user_id = ? AND id NOT IN (SELECT video_id FROM stories WHERE video_id IS NOT NULL) AND id NOT IN (SELECT video_id FROM cashpills)").get(videoId, userId);
  if (!v) return { ok: false, error: "Vídeo inválido. Grave novamente." };
  const p = db().prepare("SELECT 1 FROM community_images WHERE id = ? AND user_id = ? AND private = 0 AND id NOT IN (SELECT poster_id FROM cashpills)").get(posterId, userId);
  if (!p) return { ok: false, error: "Capa inválida. Grave novamente." };
  const n = db().prepare("SELECT COUNT(*) n FROM cashpills WHERE user_id = ? AND created_at > unixepoch() - 86400").get(userId) as { n: number };
  if (n.n >= 10) return { ok: false, error: "Limite de 10 Cashpills por dia.", status: 429 };
  const id = Number(db().prepare("INSERT INTO cashpills (user_id, video_id, poster_id, caption, duration) VALUES (?, ?, ?, ?, ?)").run(userId, videoId, posterId, caption, duration).lastInsertRowid);
  return { ok: true, id };
}

export function listCashpills(authorId: number, limit = 60): Cashpill[] {
  return db().prepare(`${SEL} WHERE user_id = ? ORDER BY id DESC LIMIT ?`).all(authorId, limit) as Cashpill[];
}

export function countCashpills(authorId: number): number {
  return (db().prepare("SELECT COUNT(*) c FROM cashpills WHERE user_id = ?").get(authorId) as { c: number }).c;
}

export function deleteCashpill(id: number, user: { id: number; role: string }): boolean {
  const r = db().prepare(`${SEL} WHERE id = ?`).get(id) as Cashpill | undefined;
  if (!r || (r.userId !== user.id && user.role !== "admin")) return false;
  db().prepare("DELETE FROM cashpills WHERE id = ?").run(id);
  db().prepare("DELETE FROM community_videos WHERE id = ?").run(r.videoId);
  db().prepare("DELETE FROM community_images WHERE id = ? AND id NOT IN (SELECT image_id FROM stories) AND id NOT IN (SELECT image_id FROM community_posts WHERE image_id IS NOT NULL)").run(r.posterId);
  return true;
}

/** Fotos das publicações do membro (aba Fotos do perfil). */
export function listPhotos(authorId: number, limit = 60): { postId: number; imageId: number }[] {
  return db().prepare("SELECT id postId, image_id imageId FROM community_posts WHERE user_id = ? AND image_id IS NOT NULL ORDER BY id DESC LIMIT ?").all(authorId, limit) as { postId: number; imageId: number }[];
}

export interface FeedPill extends Cashpill { author: string; avatarId: number | null }

/** Cashpills mais recentes da comunidade para o Feed (sem os de membros bloqueados por você). */
export function listFeedCashpills(viewerId: number, limit = 24): FeedPill[] {
  return db().prepare(`SELECT c.id, c.user_id userId, c.video_id videoId, c.poster_id posterId, c.caption, c.duration, c.created_at createdAt, u.name author, u.avatar_id avatarId
    FROM cashpills c JOIN users u ON u.id = c.user_id
    WHERE c.user_id = ? OR c.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = ?)
    ORDER BY c.id DESC LIMIT ?`).all(viewerId, viewerId, limit) as FeedPill[];
}
