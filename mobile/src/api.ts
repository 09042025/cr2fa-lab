import * as SecureStore from "expo-secure-store";

/** Endereço do site. O app conversa com o mesmo servidor do nizainvest.com.br. */
export const API = "https://nizainvest.com.br";
const KEY = "niza_token";

export type Plan = "free" | "pro";
export interface User { id: number; name: string; email: string; role: "user" | "admin"; plan: Plan; planExpiresAt: number | null; onTrial: boolean }

export const getToken = () => SecureStore.getItemAsync(KEY);
export const saveToken = (t: string) => SecureStore.setItemAsync(KEY, t);
export const clearToken = () => SecureStore.deleteItemAsync(KEY);

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(API + path, { ...init, headers: { "content-type": "application/json", ...(init.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body: body as { error?: string } & Record<string, unknown> };
}

export async function login(email: string, password: string): Promise<{ user: User } | { error: string }> {
  try {
    const r = await call("/api/mobile/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if (!r.ok) return { error: r.body.error || "Não foi possível entrar." };
    await saveToken(r.body.token as string);
    return { user: r.body.user as User };
  } catch {
    return { error: "Sem conexão com o servidor. Confira a internet e tente de novo." };
  }
}

/** Confere o token guardado. "offline" = sem internet (mantém o app fechado até voltar, sem apagar o login). */
export async function me(): Promise<{ user: User } | "expired" | "offline" | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    const r = await call("/api/mobile/me", { headers: { authorization: `Bearer ${token}` } });
    if (r.status === 401) { await clearToken(); return "expired"; }
    return r.ok ? { user: r.body.user as User } : "offline";
  } catch {
    return "offline";
  }
}
