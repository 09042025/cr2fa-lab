import { db } from "./db";
import { addPost } from "./feed";

/** Um story dura 24 horas e depois some (a foto também é apagada). */
export const STORY_TTL = 24 * 60 * 60;
export const MAX_CAPTION = 200;

export interface Story {
  id: number;
  imageId: number;
  videoId: number | null;
  caption: string;
  createdAt: number;
  seen: boolean;
  views?: number;
}
export interface StoryGroup {
  userId: number;
  name: string;
  avatarId: number | null;
  isAdmin: boolean;
  mine: boolean;
  allSeen: boolean;
  stories: Story[];
}

/** Apaga stories vencidos junto com as fotos (se nenhum outro lugar usa a imagem). */
export function purgeExpired(now = Math.floor(Date.now() / 1000)): number {
  const d = db();
  const old = d.prepare("SELECT id, image_id imageId, video_id videoId FROM stories WHERE created_at <= ?").all(now - STORY_TTL) as { id: number; imageId: number; videoId: number | null }[];
  for (const s of old) {
    d.prepare("DELETE FROM stories WHERE id = ?").run(s.id);
    if (s.videoId) d.prepare("DELETE FROM community_videos WHERE id = ?").run(s.videoId);
    d.prepare("DELETE FROM community_images WHERE id = ? AND private = 0 AND id NOT IN (SELECT image_id FROM stories) AND id NOT IN (SELECT image_id FROM community_posts WHERE image_id IS NOT NULL) AND id NOT IN (SELECT image_id FROM community_messages WHERE image_id IS NOT NULL) AND id NOT IN (SELECT avatar_id FROM users WHERE avatar_id IS NOT NULL) AND id NOT IN (SELECT banner_id FROM users WHERE banner_id IS NOT NULL)").run(s.imageId);
  }
  return old.length;
}

/** Stories ativos agrupados por membro: o seu primeiro, depois os não vistos, depois os vistos. */
export function listStoryGroups(viewerId: number, now = Math.floor(Date.now() / 1000)): StoryGroup[] {
  purgeExpired(now);
  const rows = db().prepare(`
    SELECT s.id, s.user_id userId, s.image_id imageId, s.video_id videoId, s.caption, s.created_at createdAt,
           u.name, u.avatar_id avatarId, u.role,
           EXISTS (SELECT 1 FROM story_views v WHERE v.story_id = s.id AND v.viewer_id = ?) seen,
           (SELECT COUNT(*) FROM story_views v WHERE v.story_id = s.id AND v.viewer_id <> s.user_id) views
    FROM stories s JOIN users u ON u.id = s.user_id
    WHERE s.created_at > ?
      AND (s.user_id = ? OR s.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = ?))
    ORDER BY s.created_at ASC`).all(viewerId, now - STORY_TTL, viewerId, viewerId) as { id: number; userId: number; imageId: number; videoId: number | null; caption: string; createdAt: number; name: string; avatarId: number | null; role: string; seen: number; views: number }[];
  const map = new Map<number, StoryGroup>();
  for (const r of rows) {
    let g = map.get(r.userId);
    if (!g) {
      g = { userId: r.userId, name: r.name, avatarId: r.avatarId, isAdmin: r.role === "admin", mine: r.userId === viewerId, allSeen: true, stories: [] };
      map.set(r.userId, g);
    }
    const mine = r.userId === viewerId;
    g.stories.push({ id: r.id, imageId: r.imageId, videoId: r.videoId, caption: r.caption, createdAt: r.createdAt, seen: !!r.seen || mine, ...(mine ? { views: r.views } : {}) });
    if (!r.seen && !mine) g.allSeen = false;
  }
  const rank = (g: StoryGroup) => (g.mine ? 0 : g.allSeen ? 2 : 1);
  return [...map.values()].sort((a, b) => rank(a) - rank(b) || b.stories[b.stories.length - 1].createdAt - a.stories[a.stories.length - 1].createdAt);
}

export type StoryResult = { ok: true; id: number } | { ok: false; error: string; status?: number };

export function createStory(userId: number, imageId: number, captionRaw: string, videoId: number | null = null): StoryResult {
  const caption = captionRaw.replace(/\s+/g, " ").trim().slice(0, MAX_CAPTION);
  const img = db().prepare("SELECT 1 FROM community_images WHERE id = ? AND user_id = ? AND private = 0").get(imageId, userId);
  if (!img) return { ok: false, error: "Imagem inválida. Envie a foto novamente." };
  if (videoId) {
    const v = db().prepare("SELECT 1 FROM community_videos WHERE id = ? AND user_id = ? AND id NOT IN (SELECT video_id FROM stories WHERE video_id IS NOT NULL)").get(videoId, userId);
    if (!v) return { ok: false, error: "Vídeo inválido. Grave ou envie novamente." };
  }
  const used = db().prepare("SELECT 1 FROM stories WHERE image_id = ?").get(imageId);
  if (used) return { ok: false, error: "Essa foto já foi usada em um story." };
  const n = db().prepare("SELECT COUNT(*) n FROM stories WHERE user_id = ? AND created_at > unixepoch() - ?").get(userId, STORY_TTL) as { n: number };
  if (n.n >= 20) return { ok: false, error: "Limite de 20 stories em 24 horas.", status: 429 };
  const id = Number(db().prepare("INSERT INTO stories (user_id, image_id, video_id, caption) VALUES (?, ?, ?, ?)").run(userId, imageId, videoId, caption).lastInsertRowid);
  return { ok: true, id };
}

export function markViewed(storyId: number, viewerId: number): boolean {
  const s = db().prepare("SELECT user_id userId FROM stories WHERE id = ? AND created_at > unixepoch() - ?").get(storyId, STORY_TTL) as { userId: number } | undefined;
  if (!s) return false;
  if (s.userId !== viewerId) db().prepare("INSERT OR IGNORE INTO story_views (story_id, viewer_id) VALUES (?, ?)").run(storyId, viewerId);
  return true;
}

export function deleteStory(storyId: number, user: { id: number; role: string }): boolean {
  const s = db().prepare("SELECT user_id userId, image_id imageId, video_id videoId FROM stories WHERE id = ?").get(storyId) as { userId: number; imageId: number; videoId: number | null } | undefined;
  if (!s || (s.userId !== user.id && user.role !== "admin")) return false;
  db().prepare("DELETE FROM stories WHERE id = ?").run(storyId);
  if (s.videoId) db().prepare("DELETE FROM community_videos WHERE id = ?").run(s.videoId);
  db().prepare("DELETE FROM community_images WHERE id = ? AND private = 0 AND id NOT IN (SELECT image_id FROM stories) AND id NOT IN (SELECT image_id FROM community_posts WHERE image_id IS NOT NULL)").run(s.imageId);
  return true;
}

/** "Virar publicação": copia o story para o Feed, onde ele não expira. Só o dono do story. */
export function shareStoryToFeed(storyId: number, userId: number, topic = "geral"): boolean {
  const s = db().prepare("SELECT image_id imageId, caption FROM stories WHERE id = ? AND user_id = ? AND video_id IS NULL AND created_at > unixepoch() - ?").get(storyId, userId, STORY_TTL) as { imageId: number; caption: string } | undefined;
  if (!s) return false;
  const dup = db().prepare("SELECT 1 FROM community_posts WHERE user_id = ? AND image_id = ?").get(userId, s.imageId);
  if (dup) return false;
  return addPost(userId, topic, s.caption, s.imageId) !== null;
}
