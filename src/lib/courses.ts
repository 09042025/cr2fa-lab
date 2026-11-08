import { db } from "./db";

export interface Lesson { id: number; playlistId: number; title: string; description: string; minutes: number | null; free: boolean; position: number; embed: string | null; locked: boolean; ytUrl: string; hasVideo: boolean }
export interface Playlist { id: number; title: string; description: string; position: number; lessons: number }

/** Extrai o id do vídeo e/ou da playlist de um link do YouTube (watch, youtu.be, embed, shorts, playlist). */
export function parseYoutube(raw: string): { video: string | null; list: string | null } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (!["youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) return null;
  let video: string | null = null;
  if (host === "youtu.be") video = u.pathname.slice(1).split("/")[0] || null;
  else if (u.pathname === "/watch") video = u.searchParams.get("v");
  else { const m = /^\/(?:embed|shorts|live|v)\/([\w-]{11})/.exec(u.pathname); if (m) video = m[1]; }
  const list = u.searchParams.get("list");
  if (video && !/^[\w-]{11}$/.test(video)) video = null;
  const okList = list && /^[\w-]{10,60}$/.test(list) ? list : null;
  if (!video && !okList) return null;
  return { video, list: okList };
}

export function embedUrl(video: string | null, list: string | null): string | null {
  const q = "rel=0&modestbranding=1&playsinline=1";
  if (video) return `https://www.youtube-nocookie.com/embed/${video}?${q}${list ? `&list=${list}` : ""}`;
  if (list) return `https://www.youtube-nocookie.com/embed/videoseries?list=${list}&${q}`;
  return null;
}

export function listPlaylists(): Playlist[] {
  return db().prepare(`SELECT p.id, p.title, p.description, p.position, (SELECT COUNT(*) FROM course_lessons l WHERE l.playlist_id = p.id) lessons
    FROM course_playlists p ORDER BY p.position, p.id`).all() as Playlist[];
}

export function getPlaylist(id: number): Playlist | null {
  return (db().prepare(`SELECT p.id, p.title, p.description, p.position, (SELECT COUNT(*) FROM course_lessons l WHERE l.playlist_id = p.id) lessons FROM course_playlists p WHERE p.id = ?`).get(id) as Playlist | undefined) ?? null;
}

/** Aulas da playlist. O link do vídeo só vai para quem pode assistir (Premium, administrador ou aula liberada no Grátis). */
export function listLessons(playlistId: number, canWatchAll: boolean): Lesson[] {
  const rows = db().prepare("SELECT id, playlist_id playlistId, title, description, yt_video v, yt_list l, minutes, free, position FROM course_lessons WHERE playlist_id = ? ORDER BY position, id").all(playlistId) as
    { id: number; playlistId: number; title: string; description: string; v: string | null; l: string | null; minutes: number | null; free: number; position: number }[];
  return rows.map((r) => {
    const locked = !canWatchAll && !r.free;
    const yt = r.v ? `https://youtu.be/${r.v}${r.l ? `?list=${r.l}` : ""}` : r.l ? `https://www.youtube.com/playlist?list=${r.l}` : "";
    return { id: r.id, playlistId: r.playlistId, title: r.title, description: r.description, minutes: r.minutes, free: !!r.free, position: r.position, locked, hasVideo: !!(r.v || r.l), embed: locked ? null : embedUrl(r.v, r.l), ytUrl: canWatchAll ? yt : "" };
  });
}

const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);
const nextPos = (table: "course_playlists" | "course_lessons", where = "1=1", ...args: number[]) =>
  ((db().prepare(`SELECT COALESCE(MAX(position), 0) + 1 n FROM ${table} WHERE ${where}`).get(...args) as { n: number }).n);

export function createPlaylist(title: string, description: string): number | null {
  const t = clean(title, 80);
  if (!t) return null;
  return Number(db().prepare("INSERT INTO course_playlists (title, description, position) VALUES (?, ?, ?)").run(t, clean(description, 300), nextPos("course_playlists")).lastInsertRowid);
}
export function updatePlaylist(id: number, title: string, description: string): boolean {
  const t = clean(title, 80);
  return !!t && db().prepare("UPDATE course_playlists SET title = ?, description = ? WHERE id = ?").run(t, clean(description, 300), id).changes > 0;
}
export function deletePlaylist(id: number): boolean { return db().prepare("DELETE FROM course_playlists WHERE id = ?").run(id).changes > 0; }

export function addLesson(playlistId: number, d: { title: string; description: string; url: string; minutes: number | null; free: boolean }): { ok: true; id: number } | { ok: false; error: string } {
  if (!getPlaylist(playlistId)) return { ok: false, error: "Playlist não encontrada." };
  const t = clean(d.title, 120);
  if (!t) return { ok: false, error: "Dê um título à aula." };
  const yt = parseYoutube(d.url);
  if (!yt) return { ok: false, error: "Cole um link do YouTube (vídeo ou playlist)." };
  const mins = d.minutes && d.minutes > 0 ? Math.min(Math.round(d.minutes), 600) : null;
  const id = Number(db().prepare("INSERT INTO course_lessons (playlist_id, title, description, yt_video, yt_list, minutes, free, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(playlistId, t, clean(d.description, 600), yt.video, yt.list, mins, d.free ? 1 : 0, nextPos("course_lessons", "playlist_id = ?", playlistId)).lastInsertRowid);
  return { ok: true, id };
}
export function updateLesson(id: number, d: { title: string; description: string; url?: string; minutes: number | null; free: boolean }): { ok: true } | { ok: false; error: string } {
  const t = clean(d.title, 120);
  if (!t) return { ok: false, error: "Dê um título à aula." };
  const mins = d.minutes && d.minutes > 0 ? Math.min(Math.round(d.minutes), 600) : null;
  if (d.url?.trim()) {
    const yt = parseYoutube(d.url);
    if (!yt) return { ok: false, error: "Link do YouTube inválido." };
    db().prepare("UPDATE course_lessons SET yt_video = ?, yt_list = ? WHERE id = ?").run(yt.video, yt.list, id);
  }
  const r = db().prepare("UPDATE course_lessons SET title = ?, description = ?, minutes = ?, free = ? WHERE id = ?").run(t, clean(d.description, 600), mins, d.free ? 1 : 0, id);
  return r.changes > 0 ? { ok: true } : { ok: false, error: "Aula não encontrada." };
}
export function deleteLesson(id: number): boolean { return db().prepare("DELETE FROM course_lessons WHERE id = ?").run(id).changes > 0; }

/** Sobe ou desce uma aula (ou uma playlist) trocando a posição com a vizinha. */
export function move(kind: "lesson" | "playlist", id: number, dir: "up" | "down"): boolean {
  const lesson = kind === "lesson";
  const table = lesson ? "course_lessons" : "course_playlists";
  const me = db().prepare(`SELECT id, position${lesson ? ", playlist_id pl" : ""} FROM ${table} WHERE id = ?`).get(id) as { id: number; position: number; pl?: number } | undefined;
  if (!me) return false;
  const scope = lesson ? "AND playlist_id = ?" : "";
  const args: number[] = lesson ? [me.position, me.pl!] : [me.position];
  const nb = db().prepare(`SELECT id, position FROM ${table} WHERE position ${dir === "up" ? "<" : ">"} ? ${scope} ORDER BY position ${dir === "up" ? "DESC" : "ASC"}, id LIMIT 1`).get(...args) as { id: number; position: number } | undefined;
  if (!nb) return false;
  const up = db().prepare(`UPDATE ${table} SET position = ? WHERE id = ?`);
  db().transaction(() => { up.run(nb.position, me.id); up.run(me.position, nb.id); })();
  return true;
}

/** Grava a ordem escolhida arrastando: ids na ordem nova (só ids que existem; para aulas, só as da playlist). */
export function reorder(kind: "lesson" | "playlist", ids: number[], playlistId?: number): boolean {
  const lesson = kind === "lesson";
  const table = lesson ? "course_lessons" : "course_playlists";
  const valid = new Set((db().prepare(lesson ? "SELECT id FROM course_lessons WHERE playlist_id = ?" : "SELECT id FROM course_playlists").all(...(lesson ? [playlistId ?? 0] : [])) as { id: number }[]).map((r) => r.id));
  const list = ids.filter((id, i) => valid.has(id) && ids.indexOf(id) === i);
  if (!list.length) return false;
  const up = db().prepare(`UPDATE ${table} SET position = ? WHERE id = ?`);
  db().transaction(() => list.forEach((id, i) => up.run(i + 1, id)))();
  return true;
}
