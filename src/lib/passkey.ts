import { randomBytes } from "node:crypto";
import { db } from "./db";

/** Domínio e origem do site (atrás do proxy da Railway vale o cabeçalho x-forwarded-*). */
export function rpInfo(req: Request): { rpID: string; origin: string; rpName: string } {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost";
  const rpID = host.replace(/:\d+$/, "");
  const local = rpID === "localhost" || rpID === "127.0.0.1";
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || (local ? "http" : "https");
  return { rpID, origin: `${proto}://${host}`, rpName: "NIZA HUB" };
}

const TTL = 5 * 60;

/** Guarda o desafio (uso único, vale 5 minutos) e devolve o código para o aparelho devolver na verificação. */
export function saveChallenge(challenge: string, kind: "register" | "login", userId: number | null): string {
  const id = randomBytes(18).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  db().prepare("DELETE FROM webauthn_challenges WHERE expires_at < ?").run(now);
  db().prepare("INSERT INTO webauthn_challenges (id, challenge, user_id, kind, expires_at) VALUES (?, ?, ?, ?, ?)").run(id, challenge, userId, kind, now + TTL);
  return id;
}

export function takeChallenge(id: string, kind: "register" | "login"): { challenge: string; userId: number | null } | null {
  const row = db().prepare("SELECT challenge, user_id userId, kind, expires_at exp FROM webauthn_challenges WHERE id = ?").get(id) as { challenge: string; userId: number | null; kind: string; exp: number } | undefined;
  db().prepare("DELETE FROM webauthn_challenges WHERE id = ?").run(id);
  if (!row || row.kind !== kind || row.exp < Math.floor(Date.now() / 1000)) return null;
  return { challenge: row.challenge, userId: row.userId };
}

export interface PasskeyRow { id: number; user_id: number; credential_id: string; public_key: Buffer; counter: number; transports: string | null; name: string; created_at: number }

export const listPasskeys = (userId: number) => db().prepare("SELECT * FROM passkeys WHERE user_id = ? ORDER BY id").all(userId) as PasskeyRow[];
