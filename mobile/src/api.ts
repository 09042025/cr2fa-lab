import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** Endereço do site. O app conversa com o mesmo servidor do nizainvest.com.br. */
export const API = process.env.EXPO_PUBLIC_API || "https://nizainvest.com.br";
const KEY = "niza_token";

export type Plan = "free" | "pro";
export interface User { id: number; name: string; email: string; role: "user" | "admin"; plan: Plan; planExpiresAt: number | null; onTrial: boolean }

// No celular o token fica no cofre do aparelho. O cofre não existe no navegador (só usado para testes no computador).
const web = Platform.OS === "web";
export const getToken = async () => (web ? localStorage.getItem(KEY) : SecureStore.getItemAsync(KEY));
export const saveToken = async (t: string) => { if (web) localStorage.setItem(KEY, t); else await SecureStore.setItemAsync(KEY, t); };
export const clearToken = async () => { if (web) localStorage.removeItem(KEY); else await SecureStore.deleteItemAsync(KEY); };

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

/** GET autenticado. Devolve os dados, ou um texto de erro simples para mostrar na tela. */
export async function get<T>(path: string): Promise<{ data: T } | { error: string; expired?: boolean }> {
  const token = await getToken();
  try {
    const r = await call(path, { headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (r.status === 401) return { error: "Sessão expirada. Entre de novo.", expired: true };
    if (!r.ok) return { error: r.body.error || "Não foi possível carregar agora." };
    return { data: r.body as unknown as T };
  } catch {
    return { error: "Sem conexão com o servidor. Confira a internet." };
  }
}

/** Envia uma ação (publicar, curtir, comentar, mandar mensagem...). Devolve null se deu certo, ou o texto do erro. */
export async function send(path: string, body: unknown, method: "POST" | "PATCH" | "DELETE" = "POST"): Promise<string | null> {
  const token = await getToken();
  try {
    const r = await call(path, { method, body: JSON.stringify(body), headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (r.ok) return null;
    return r.status === 401 ? "Sessão expirada. Entre de novo." : r.body.error || "Não foi possível concluir.";
  } catch {
    return "Sem conexão com o servidor. Confira a internet.";
  }
}

/** Endereço de uma imagem da comunidade (fotos e anexos). Precisa do token no cabeçalho. */
export const imageUri = (id: number) => `${API}/api/community/image?id=${id}`;
