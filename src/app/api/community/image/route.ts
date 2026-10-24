import { getUser, rateLimit } from "@/lib/auth";
import { getImage, isBanned, MAX_IMAGE_BYTES, saveImage } from "@/lib/community";
import { fail, json, sameOrigin } from "@/lib/http";

/** Envio de imagem (PNG, JPG, GIF ou WebP até 2 MB). Devolve o id para anexar à mensagem. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("A Comunidade é exclusiva do plano Pró.", 403);
  if (isBanned(user.id)) return fail("Você foi suspenso da comunidade pela moderação.", 403);
  if (!rateLimit(`community-img:${user.id}`, 10, 10 * 60_000)) return fail("Muitas imagens seguidas. Tente em alguns minutos.", 429);
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return fail("Escolha uma imagem.");
  if (file.size > MAX_IMAGE_BYTES) return fail("A imagem deve ter até 2 MB.");
  const id = saveImage(user.id, Buffer.from(await file.arrayBuffer()));
  return id ? json({ id }, 201) : fail("Formato não aceito. Use PNG, JPG, GIF ou WebP.");
}

export async function GET(req: Request) {
  const user = await getUser();
  if (!user || user.plan !== "pro") return new Response("Não autorizado", { status: 401 });
  const img = getImage(Number(new URL(req.url).searchParams.get("id")));
  if (!img) return new Response("Não encontrada", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { "content-type": img.mime, "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox", "cache-control": "private, max-age=86400" },
  });
}
