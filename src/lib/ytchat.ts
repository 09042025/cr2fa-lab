import { getSetting } from "./settings";

/**
 * Chat da live do YouTube (API oficial, YouTube Data API v3), só leitura, para o apresentador ver e destacar
 * os comentários de quem assiste no YouTube. O servidor consulta no máximo a cada 10 s por live e só enquanto
 * a página do apresentador estiver aberta (a cota grátis da Google é de 10.000 unidades por dia; cada consulta custa ~5).
 */
const API = "https://www.googleapis.com/youtube/v3";
const MIN_POLL_MS = 10_000;
const KEEP = 150;

export const youtubeKey = () => getSetting("youtube_api_key") || process.env.YOUTUBE_API_KEY || null;

export interface YtMsg { n: number; id: string; name: string; body: string; owner: boolean; mod: boolean; at: number }
interface State { videoId: string; chatId: string | null; token: string | null; msgs: YtMsg[]; n: number; nextAt: number; error: string | null; busy: Promise<void> | null }
const g = globalThis as unknown as { __nizaYt?: Map<number, State> };
const states = (g.__nizaYt ??= new Map<number, State>());

interface ApiErr { error?: { code?: number; errors?: { reason?: string; message?: string }[]; message?: string } }

/** Traduz o erro da Google para uma frase que o Emerson entende. */
export function ytErrorText(status: number, body: ApiErr | null): string {
  const reason = body?.error?.errors?.[0]?.reason ?? "";
  if (reason === "quotaExceeded" || reason === "rateLimitExceeded") return "O limite diário do YouTube acabou. O chat do YouTube volta amanhã.";
  if (reason === "liveChatDisabled") return "O chat desta live está desligado no YouTube.";
  if (reason === "liveChatEnded" || reason === "liveChatNotFound") return "A live do YouTube terminou.";
  if (reason === "accessNotConfigured" || reason === "forbidden" || /has not been used|disabled/i.test(body?.error?.message ?? "")) return "A YouTube Data API v3 não está ativada no projeto desta chave (ative em console.cloud.google.com).";
  if (reason === "keyInvalid" || reason === "badRequest" || status === 400) return "A chave do YouTube não foi aceita pelo Google.";
  return `O YouTube não respondeu (erro ${status}).`;
}

async function call(path: string, params: Record<string, string>, key: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key })}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
  } catch { return { ok: false, status: 0, json: null }; }
}

/** Testa uma chave (1 unidade de cota). */
export async function testYoutubeKey(key: string): Promise<string | null> {
  const r = await call("videos", { part: "id", id: "dQw4w9WgXcQ" }, key);
  return r.ok ? null : r.status === 0 ? "Sem conexão com o YouTube agora. Tente de novo." : ytErrorText(r.status, r.json as ApiErr | null);
}

async function refresh(st: State, key: string): Promise<void> {
  const now = Date.now();
  if (!st.chatId) {
    const r = await call("videos", { part: "liveStreamingDetails", id: st.videoId }, key);
    if (!r.ok) { st.error = ytErrorText(r.status, r.json as ApiErr | null); st.nextAt = now + (/limite diário/.test(st.error) ? 600_000 : 30_000); return; }
    const id = (r.json as { items?: { liveStreamingDetails?: { activeLiveChatId?: string } }[] })?.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
    if (!id) { st.error = "A live ainda não começou no YouTube (ou já terminou). Assim que entrar no ar, os comentários aparecem aqui."; st.nextAt = now + 20_000; return; }
    st.chatId = id;
  }
  const params: Record<string, string> = { liveChatId: st.chatId, part: "snippet,authorDetails", maxResults: "200" };
  if (st.token) params.pageToken = st.token;
  const r = await call("liveChat/messages", params, key);
  if (!r.ok) {
    st.error = ytErrorText(r.status, r.json as ApiErr | null);
    if (/terminou/.test(st.error)) st.chatId = null;
    st.nextAt = now + (/limite diário/.test(st.error) ? 600_000 : 30_000);
    return;
  }
  const j = r.json as { nextPageToken?: string; pollingIntervalMillis?: number; items?: { id: string; snippet?: { type?: string; displayMessage?: string; publishedAt?: string }; authorDetails?: { displayName?: string; isChatOwner?: boolean; isChatModerator?: boolean } }[] };
  st.token = j.nextPageToken ?? st.token;
  for (const it of j.items ?? []) {
    const body = (it.snippet?.displayMessage ?? "").replace(/\s+/g, " ").trim();
    if (it.snippet?.type !== "textMessageEvent" || !body || st.msgs.some((m) => m.id === it.id)) continue;
    st.msgs.push({ n: ++st.n, id: it.id, name: (it.authorDetails?.displayName ?? "YouTube").slice(0, 60), body: body.slice(0, 400), owner: !!it.authorDetails?.isChatOwner, mod: !!it.authorDetails?.isChatModerator, at: Date.parse(it.snippet?.publishedAt ?? "") || now });
  }
  if (st.msgs.length > KEEP) st.msgs.splice(0, st.msgs.length - KEEP);
  st.error = null;
  st.nextAt = now + Math.max(MIN_POLL_MS, j.pollingIntervalMillis ?? 0);
}

/** Mensagens novas (n > after) do chat do YouTube desta live. Consulta o YouTube só se já passou o intervalo mínimo. */
export async function youtubeChat(liveId: number, videoId: string, after: number): Promise<{ enabled: boolean; error: string | null; messages: YtMsg[] }> {
  const key = youtubeKey();
  if (!key) return { enabled: false, error: null, messages: [] };
  let st = states.get(liveId);
  if (!st || st.videoId !== videoId) { st = { videoId, chatId: null, token: null, msgs: [], n: 0, nextAt: 0, error: null, busy: null }; states.set(liveId, st); }
  if (states.size > 50) for (const [k, s] of states) if (Date.now() - s.nextAt > 3_600_000) states.delete(k);
  if (Date.now() >= st.nextAt) {
    st.busy ??= refresh(st, key).finally(() => { if (st) st.busy = null; });
    await st.busy;
  }
  return { enabled: true, error: st.error, messages: st.msgs.filter((m) => m.n > after) };
}

export const ytMessage = (liveId: number, ytId: string): YtMsg | null => states.get(liveId)?.msgs.find((m) => m.id === ytId) ?? null;

/** Id do vídeo a partir do player embutido (…/embed/ID?...). */
export const videoIdOfEmbed = (embed: string | null): string | null => embed?.match(/\/embed\/([\w-]{11})/)?.[1] ?? null;
