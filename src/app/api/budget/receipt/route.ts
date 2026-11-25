import { getUser, rateLimit } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { MAX_RECEIPT_BYTES, getReceipt, saveReceipt } from "@/lib/budget";

/** Envia um comprovante (foto ou PDF até 3 MB). Devolve o id para anexar ao lançamento. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (!rateLimit(`budget-receipt:${user.id}`, 30, 10 * 60_000)) return fail("Muitos envios seguidos. Tente em alguns minutos.", 429);
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return fail("Escolha uma foto ou um PDF.");
  if (file.size > MAX_RECEIPT_BYTES) return fail("O comprovante deve ter até 3 MB.");
  const id = saveReceipt(user.id, Buffer.from(await file.arrayBuffer()));
  return id ? json({ id }, 201) : fail("Formato não aceito. Use foto (JPG, PNG, WebP) ou PDF.");
}

/** Abre o comprovante: só o dono consegue ver. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  const r = Number.isInteger(id) && id > 0 ? getReceipt(user.id, id) : null;
  if (!r) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(r.data), {
    headers: { "content-type": r.mime, "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox", "cache-control": "private, max-age=3600", "content-disposition": "inline" },
  });
}
