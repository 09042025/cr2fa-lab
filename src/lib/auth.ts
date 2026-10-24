import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, effectivePlan, type PlanName, type UserRow } from "./db";
import { onTrial, trialAvailable } from "./trial";

const COOKIE = "cr2fa_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 dias

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET ausente ou curto demais (mínimo 16 caracteres).");
    }
    return new TextEncoder().encode("dev-only-secret-change-me-please");
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "A senha precisa ter pelo menos 10 caracteres.";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Use letras e números na senha.";
  return null;
}

export async function createSession(userId: number): Promise<void> {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRow["role"];
  plan: PlanName;
  planExpiresAt: number | null;
  mustChangePassword: boolean;
  trialAvailable: boolean;
  onTrial: boolean;
}

export async function getUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const row = db().prepare("SELECT * FROM users WHERE id = ?").get(Number(payload.uid)) as UserRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      plan: effectivePlan(row),
      planExpiresAt: row.plan_expires_at,
      mustChangePassword: row.must_change_password === 1,
      trialAvailable: trialAvailable(row),
      onTrial: onTrial(row),
    };
  } catch {
    return null;
  }
}

/** Exige login. Redireciona para /entrar, ou para /trocar-senha se a troca for obrigatória. */
export async function requireUser(opts: { allowPasswordChange?: boolean } = {}): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/entrar");
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/trocar-senha");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/painel");
  return user;
}

/** Limitador simples em memória (por IP/e-mail) para tentativas de login. */
const attempts = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, limit = 8, windowMs = 15 * 60 * 1000): boolean {
  const t = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < t) {
    attempts.set(key, { count: 1, resetAt: t + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
export function rateLimitReset(key: string) {
  attempts.delete(key);
}
