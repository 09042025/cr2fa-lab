import { db } from "./db";
import { getInvite, hasBlack } from "./black";

/** Área VIP da White Flame (Protocolo, Juramento, Ciclo): só admin, convidados VIP e assinantes do Black Diamond. O Premium não entra. */
export function canAccessVip(user: { id: number; role: string }): boolean {
  return user.role === "admin" || getInvite(user.id) === "invited" || hasBlack(user.id);
}

export interface WfsProgress { weeks: number[]; stage: number; laps: number }

export function getProgress(userId: number): WfsProgress {
  const r = db().prepare("SELECT weeks, stage, laps FROM wfs_progress WHERE user_id = ?").get(userId) as { weeks: string; stage: number; laps: number } | undefined;
  if (!r) return { weeks: [], stage: 1, laps: 0 };
  return { weeks: r.weeks ? r.weeks.split(",").map(Number).filter((n) => n >= 1 && n <= 12) : [], stage: r.stage, laps: r.laps };
}

export function saveProgress(userId: number, p: WfsProgress): void {
  const weeks = [...new Set(p.weeks.filter((n) => Number.isInteger(n) && n >= 1 && n <= 12))].sort((a, b) => a - b).join(",");
  const stage = Math.min(6, Math.max(1, Math.trunc(p.stage) || 1));
  const laps = Math.min(999, Math.max(0, Math.trunc(p.laps) || 0));
  db().prepare("INSERT INTO wfs_progress (user_id, weeks, stage, laps) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET weeks = excluded.weeks, stage = excluded.stage, laps = excluded.laps, updated_at = unixepoch()").run(userId, weeks, stage, laps);
}

export interface RadarEntry { ym: string; scores: number[] }

export function listRadar(userId: number): RadarEntry[] {
  const rows = db().prepare("SELECT ym, scores FROM wfs_radar WHERE user_id = ? ORDER BY ym DESC LIMIT 24").all(userId) as { ym: string; scores: string }[];
  return rows.map((r) => ({ ym: r.ym, scores: r.scores.split(",").map(Number) })).filter((r) => r.scores.length === 10);
}

export function saveRadar(userId: number, ym: string, scores: number[]): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym) || scores.length !== 10 || scores.some((n) => !Number.isInteger(n) || n < 0 || n > 10)) return false;
  db().prepare("INSERT INTO wfs_radar (user_id, ym, scores) VALUES (?, ?, ?) ON CONFLICT(user_id, ym) DO UPDATE SET scores = excluded.scores, updated_at = unixepoch()").run(userId, ym, scores.join(","));
  return true;
}
