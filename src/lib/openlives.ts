import { db } from "./db";

/** Lives Abertas: qualquer membro anuncia uma transmissão que está fazendo em outra plataforma; o chat é aqui. */

export const LIVE_MAX_HOURS = 12;
export const MAX_TITLE = 80;
export const MAX_CHAT = 300;

interface Platform { name: string; hosts: string[] }
const PLATFORMS: Platform[] = [
  { name: "YouTube", hosts: ["youtube.com", "m.youtube.com", "youtu.be"] },
  { name: "Instagram", hosts: ["instagram.com"] },
  { name: "TikTok", hosts: ["tiktok.com"] },
  { name: "Facebook", hosts: ["facebook.com", "fb.watch", "m.facebook.com"] },
  { name: "Twitch", hosts: ["twitch.tv"] },
  { name: "Kick", hosts: ["kick.com"] },
  { name: "X", hosts: ["x.com", "twitter.com"] },
  { name: "Google Meet", hosts: ["meet.google.com"] },
  { name: "Zoom", hosts: ["zoom.us"] },
  { name: "LinkedIn", hosts: ["linkedin.com"] },
];

export interface ParsedLive { url: string; platform: string; embed: string | null }

/** Aceita só links https de plataformas conhecidas (evita spam e golpes). YouTube ganha player embutido. */
export function parseLiveUrl(raw: string): ParsedLive | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const plat = PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith("." + h)));
  if (!plat) return null;
  let embed: string | null = null;
  if (plat.name === "YouTube") {
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (u.pathname === "/watch") id = u.searchParams.get("v");
    else { const m = /^\/(?:live|embed|shorts)\/([\w-]{11})/.exec(u.pathname); id = m ? m[1] : null; }
    if (id && /^[\w-]{11}$/.test(id)) embed = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  }
  return { url: u.toString(), platform: plat.name, embed };
}

export interface OpenLive {
  id: number; userId: number; name: string; avatarId: number | null; isAdmin: boolean;
  title: string; url: string; platform: string; embed: string | null; startedAt: number; viewers?: number;
}
const COLS = `l.id, l.user_id userId, u.name, u.avatar_id avatarId, (u.role = 'admin') isAdmin, l.title, l.url, l.platform, l.embed, l.started_at startedAt`;
const ACTIVE = "l.ended_at IS NULL AND l.started_at > unixepoch() - " + LIVE_MAX_HOURS * 3600;

const clean = (r: Omit<OpenLive, "isAdmin"> & { isAdmin: number }): OpenLive => ({ ...r, isAdmin: !!r.isAdmin });

export function listOpenLives(viewerId: number): OpenLive[] {
  const rows = db().prepare(`SELECT ${COLS} FROM open_lives l JOIN users u ON u.id = l.user_id
    WHERE ${ACTIVE} AND (l.user_id = ? OR l.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = ?))
    ORDER BY l.started_at DESC`).all(viewerId, viewerId) as (Omit<OpenLive, "isAdmin"> & { isAdmin: number })[];
  return rows.map(clean);
}

export function getOpenLive(id: number): OpenLive | null {
  const r = db().prepare(`SELECT ${COLS} FROM open_lives l JOIN users u ON u.id = l.user_id WHERE l.id = ? AND ${ACTIVE}`).get(id) as (Omit<OpenLive, "isAdmin"> & { isAdmin: number }) | undefined;
  return r ? clean(r) : null;
}

type Result = { ok: true; id: number } | { ok: false; error: string; status?: number };

export function startOpenLive(userId: number, titleRaw: string, urlRaw: string): Result {
  const title = titleRaw.replace(/\s+/g, " ").trim();
  if (title.length < 3 || title.length > MAX_TITLE) return { ok: false, error: `Dê um título de 3 a ${MAX_TITLE} caracteres.` };
  const p = parseLiveUrl(urlRaw);
  if (!p) return { ok: false, error: "Cole o link da sua live (YouTube, Instagram, TikTok, Facebook, Twitch, Kick, X, Meet, Zoom ou LinkedIn)." };
  const u = db().prepare("SELECT community_banned b FROM users WHERE id = ?").get(userId) as { b: number } | undefined;
  if (!u) return { ok: false, error: "Faça login.", status: 401 };
  if (u.b === 1) return { ok: false, error: "Você foi suspenso da comunidade pela moderação.", status: 403 };
  db().prepare("UPDATE open_lives SET ended_at = unixepoch() WHERE user_id = ? AND ended_at IS NULL").run(userId);
  const id = Number(db().prepare("INSERT INTO open_lives (user_id, title, url, platform, embed) VALUES (?, ?, ?, ?, ?)").run(userId, title, p.url, p.platform, p.embed).lastInsertRowid);
  return { ok: true, id };
}

export function endOpenLive(id: number, user: { id: number; role: string }): boolean {
  const l = db().prepare("SELECT user_id userId FROM open_lives WHERE id = ? AND ended_at IS NULL").get(id) as { userId: number } | undefined;
  if (!l || (l.userId !== user.id && user.role !== "admin")) return false;
  db().prepare("UPDATE open_lives SET ended_at = unixepoch() WHERE id = ?").run(id);
  return true;
}

export interface LiveMsg { id: number; userId: number; name: string; avatarId: number | null; isAdmin: boolean; body: string; createdAt: number }

export function listLiveChat(liveId: number, viewerId: number, after = 0): LiveMsg[] {
  const rows = db().prepare(`SELECT c.id, c.user_id userId, u.name, u.avatar_id avatarId, (u.role = 'admin') isAdmin, c.body, c.created_at createdAt
    FROM open_live_chat c JOIN users u ON u.id = c.user_id
    WHERE c.live_id = ? AND c.id > ? AND (c.user_id = ? OR c.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = ?))
    ORDER BY c.id DESC LIMIT 150`).all(liveId, after, viewerId, viewerId) as (Omit<LiveMsg, "isAdmin"> & { isAdmin: number })[];
  return rows.reverse().map((r) => ({ ...r, isAdmin: !!r.isAdmin }));
}

export function addLiveChat(liveId: number, userId: number, bodyRaw: string): Result {
  const body = bodyRaw.replace(/\s+/g, " ").trim();
  if (!body || body.length > MAX_CHAT) return { ok: false, error: `Escreva até ${MAX_CHAT} caracteres.` };
  if (!getOpenLive(liveId)) return { ok: false, error: "Esta live já terminou.", status: 404 };
  const u = db().prepare("SELECT community_banned b FROM users WHERE id = ?").get(userId) as { b: number } | undefined;
  if (!u || u.b === 1) return { ok: false, error: "Você não pode comentar agora.", status: 403 };
  return { ok: true, id: Number(db().prepare("INSERT INTO open_live_chat (live_id, user_id, body) VALUES (?, ?, ?)").run(liveId, userId, body).lastInsertRowid) };
}
