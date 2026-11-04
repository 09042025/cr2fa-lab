import { z } from "zod";
import { getUser, rateLimit } from "@/lib/auth";
import { isBanned } from "@/lib/community";
import { createCashpill, deleteCashpill, MAX_CASHPILL_CAPTION } from "@/lib/cashpills";
import { fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({ videoId: z.number().int().positive(), posterId: z.number().int().positive(), duration: z.number().min(1).max(61), caption: z.string().max(MAX_CASHPILL_CAPTION * 2).default("") });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.role !== "admin" && isBanned(user.id)) return fail("Você foi suspenso da comunidade pela moderação.", 403);
  if (!rateLimit(`cashpill:${user.id}`, 20, 60 * 60_000)) return fail("Muitos vídeos seguidos. Tente mais tarde.", 429);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Confira o Cashpill.");
  const r = createCashpill(user.id, p.data.videoId, p.data.posterId, p.data.duration, p.data.caption);
  return r.ok ? json({ id: r.id }, 201) : fail(r.error, r.status ?? 400);
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const id = Number(new URL(req.url).searchParams.get("id"));
  return deleteCashpill(id, user) ? json({ ok: true }) : fail("Não foi possível apagar.", 404);
}
