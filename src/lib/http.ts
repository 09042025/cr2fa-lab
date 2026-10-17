import { NextResponse } from "next/server";

/** Bloqueia requisições de outra origem em rotas que alteram estado (defesa extra além do SameSite=Lax). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // chamadas sem Origin (curl, server-to-server) não carregam o cookie do navegador
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
}
