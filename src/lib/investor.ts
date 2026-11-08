import { db } from "./db";
import type { Profile, Result } from "./investor-data";
import { scoreAnswers } from "./investor-data";

export * from "./investor-data";

export interface Saved extends Result { updatedAt: number }

export function getProfile(userId: number): Saved | null {
  const r = db().prepare("SELECT profile, score, reserve_warning rw, updated_at updatedAt FROM investor_profiles WHERE user_id = ?").get(userId) as { profile: Profile; score: number; rw: number; updatedAt: number } | undefined;
  return r ? { profile: r.profile, score: r.score, reserveWarning: !!r.rw, updatedAt: r.updatedAt } : null;
}

export function saveProfile(userId: number, answers: number[]): Result | null {
  const res = scoreAnswers(answers);
  if (!res) return null;
  db().prepare(`INSERT INTO investor_profiles (user_id, profile, score, reserve_warning, answers, updated_at) VALUES (?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(user_id) DO UPDATE SET profile = excluded.profile, score = excluded.score, reserve_warning = excluded.reserve_warning, answers = excluded.answers, updated_at = unixepoch()`)
    .run(userId, res.profile, res.score, res.reserveWarning ? 1 : 0, JSON.stringify(answers));
  return res;
}
