import { randomBytes, timingSafeEqual } from "node:crypto";
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
  title: string; url: string; platform: string; embed: string | null; startedAt: number; spotlightId: number | null; spotlightYtId: string | null; viewers?: number;
}
const COLS = `l.id, l.user_id userId, u.name, u.avatar_id avatarId, (u.role = 'admin') isAdmin, l.title, l.url, l.platform, l.embed, l.started_at startedAt, l.spotlight_id spotlightId, l.spotlight_yt_id spotlightYtId`;
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
  const id = Number(db().prepare("INSERT INTO open_lives (user_id, title, url, platform, embed, overlay_key) VALUES (?, ?, ?, ?, ?, ?)").run(userId, title, p.url, p.platform, p.embed, newKey()).lastInsertRowid);
  return { ok: true, id };
}

const newKey = () => randomBytes(16).toString("hex");

const canHost = (liveId: number, user: { id: number; role: string }) => {
  const l = db().prepare("SELECT user_id userId FROM open_lives WHERE id = ? AND ended_at IS NULL").get(liveId) as { userId: number } | undefined;
  return !!l && (l.userId === user.id || user.role === "admin");
};

/** Chave secreta do link do overlay (para o OBS, que não tem login). Só quem transmite (ou admin) a recebe; lives antigas ganham uma na hora. */
export function overlayKey(liveId: number, user: { id: number; role: string }): string | null {
  if (!canHost(liveId, user)) return null;
  const r = db().prepare("SELECT overlay_key k FROM open_lives WHERE id = ?").get(liveId) as { k: string | null };
  if (r.k) return r.k;
  const k = newKey();
  db().prepare("UPDATE open_lives SET overlay_key = ? WHERE id = ?").run(k, liveId);
  return k;
}

/** Destaca um comentário na tela da transmissão: do chat do site (id), do YouTube ({ yt }) ou nenhum (null). */
export function setSpotlight(liveId: number, user: { id: number; role: string }, target: number | null | { yt: { id: string; name: string; body: string } }): boolean {
  if (!canHost(liveId, user)) return false;
  if (typeof target === "number") {
    if (!db().prepare("SELECT 1 FROM open_live_chat WHERE id = ? AND live_id = ?").get(target, liveId)) return false;
    db().prepare("UPDATE open_lives SET spotlight_id = ?, spotlight_yt_id = NULL, spotlight_yt_name = NULL, spotlight_yt_body = NULL WHERE id = ?").run(target, liveId);
  } else if (target === null) {
    db().prepare("UPDATE open_lives SET spotlight_id = NULL, spotlight_yt_id = NULL, spotlight_yt_name = NULL, spotlight_yt_body = NULL WHERE id = ?").run(liveId);
  } else {
    db().prepare("UPDATE open_lives SET spotlight_id = NULL, spotlight_yt_id = ?, spotlight_yt_name = ?, spotlight_yt_body = ? WHERE id = ?").run(target.yt.id, target.yt.name.slice(0, 60), target.yt.body.slice(0, 400), liveId);
  }
  return true;
}

export interface Spotlight { id: string; name: string; body: string; isAdmin: boolean; youtube?: boolean }

/** O que o overlay mostra: o comentário em destaque. `null` se a chave estiver errada, a live acabou ou não há destaque. */
export function getSpotlight(liveId: number, key: string): Spotlight | null {
  const l = db().prepare("SELECT overlay_key k, spotlight_id s, spotlight_yt_id yid, spotlight_yt_name yn, spotlight_yt_body yb FROM open_lives l WHERE l.id = ? AND " + ACTIVE).get(liveId) as { k: string | null; s: number | null; yid: string | null; yn: string | null; yb: string | null } | undefined;
  if (!l?.k) return null;
  const a = Buffer.from(l.k), b = Buffer.from(key);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (l.yid && l.yb) return { id: `y${l.yid}`, name: l.yn ?? "YouTube", body: l.yb, isAdmin: false, youtube: true };
  if (!l.s) return null;
  const m = db().prepare("SELECT c.id, u.name, c.body, (u.role = 'admin') isAdmin FROM open_live_chat c JOIN users u ON u.id = c.user_id WHERE c.id = ? AND c.live_id = ?").get(l.s, liveId) as { id: number; name: string; body: string; isAdmin: number } | undefined;
  return m ? { id: `s${m.id}`, name: m.name, body: m.body, isAdmin: !!m.isAdmin } : null;
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
