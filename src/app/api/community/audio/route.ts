import { getUser, rateLimit } from "@/lib/auth";
import { mediaIsFree, getAudio, isBanned, MAX_AUDIO_BYTES, saveAudio } from "@/lib/community";
import { fail, json, sameOrigin } from "@/lib/http";

/** Envio de áudio gravado no navegador (até 3 MB, cerca de 2 minutos). Devolve o id para anexar à mensagem. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (isBanned(user.id)) return fail("Você foi suspenso da comunidade pela moderação.", 403);
  if (!rateLimit(`community-audio:${user.id}`, 15, 10 * 60_000)) return fail("Muitos áudios seguidos. Tente em alguns minutos.", 429);
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return fail("Grave um áudio.");
  if (file.size > MAX_AUDIO_BYTES) return fail("O áudio deve ter até 2 minutos.");
  const id = saveAudio(user.id, Buffer.from(await file.arrayBuffer()));
  return id ? json({ id }, 201) : fail("Formato de áudio não aceito.");
}

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (user.plan !== "pro" && user.role !== "admin" && !mediaIsFree("audio", id)) return new Response("Exclusivo do plano Pró", { status: 403 });
  const a = getAudio(id);
  if (!a) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(a.data), {
    headers: { "content-type": a.mime, "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox", "cache-control": "private, max-age=86400", "accept-ranges": "none" },
  });
}
