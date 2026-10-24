import { cached } from "./market";
import { parseFeed } from "./news";

/** Canal oficial do YouTube: youtube.com/@EMERSON-NIZA */
export const YT_CHANNEL_ID = "UCUSHyyzS1LKDntU9uKYaPGg";
export const YT_CHANNEL_URL = "https://www.youtube.com/@EMERSON-NIZA";

export interface Video { id: string; title: string; at: number }

/** Extrai o id do vídeo de links do YouTube (watch?v=, youtu.be, embed, shorts). */
export function videoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/);
  return m ? m[1] : null;
}

/** Últimos vídeos do canal, pelo RSS público do YouTube. Cache de 10 minutos. */
export function getVideos() {
  return cached<Video[]>(`youtube:videos:${YT_CHANNEL_ID}:v1`, 10 * 60, async () => {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`, { headers: { "user-agent": "Mozilla/5.0 (compatible; NizaInvest/1.0)" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} no YouTube`);
    const items = parseFeed(await res.text(), "YouTube");
    const vids = items.flatMap((i) => { const id = videoId(i.url); return id ? [{ id, title: i.title, at: i.at }] : []; });
    if (!vids.length) throw new Error("sem vídeos no feed");
    return vids.slice(0, 12);
  });
}
