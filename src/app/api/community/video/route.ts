import { getUser, rateLimit } from "@/lib/auth";
import { isBanned, MAX_VIDEO_BYTES, saveVideo } from "@/lib/community";
import { db } from "@/lib/db";
import { fail, json, sameOrigin } from "@/lib/http";

/** Envio de vídeo de story (até 14 MB, WebM ou MP4). Devolve o id para anexar ao story. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.role !== "admin" && isBanned(user.id)) return fail("Você foi suspenso da comunidade pela moderação.", 403);
  if (!rateLimit(`community-video:${user.id}`, 10, 60 * 60_000)) return fail("Muitos vídeos seguidos. Tente mais tarde.", 429);
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return fail("Escolha um vídeo.");
  if (file.size > MAX_VIDEO_BYTES) return fail("O vídeo é grande demais (máximo 14 MB). Grave direto pela câmera do app.");
  const id = saveVideo(user.id, Buffer.from(await file.arrayBuffer()));
  return id ? json({ id }, 201) : fail("Formato de vídeo não aceito. Use MP4 ou WebM.");
}

/** Reprodução com suporte a Range (necessário para o vídeo tocar no iPhone). Só vídeos de stories ativos ou do próprio dono. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  const row = db().prepare("SELECT mime, data, user_id userId FROM community_videos WHERE id = ?").get(id) as { mime: string; data: Buffer; userId: number } | undefined;
  if (!row) return new Response("Não encontrado", { status: 404 });
  const active = db().prepare("SELECT 1 FROM stories WHERE video_id = ? AND created_at > unixepoch() - 86400").get(id);
  if (!active && row.userId !== user.id) return new Response("Não autorizado", { status: 403 });
  const total = row.data.length;
  const headers: Record<string, string> = { "content-type": row.mime, "accept-ranges": "bytes", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox", "cache-control": "private, max-age=3600" };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : total - Number(m[2]);
    let end = m[1] && m[2] ? Number(m[2]) : total - 1;
    start = Math.max(0, start);
    end = Math.min(total - 1, end);
    if (start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${total}` } });
    return new Response(new Uint8Array(row.data.subarray(start, end + 1)), { status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${total}`, "content-length": String(end - start + 1) } });
  }
  return new Response(new Uint8Array(row.data), { headers: { ...headers, "content-length": String(total) } });
}
