import { z } from "zod";
import { getUser, rateLimit } from "@/lib/auth";
import { dismissReport, messageIsFree, reportMessage } from "@/lib/community";
import { dismissPostReport } from "@/lib/feed";
import { fail, json, sameOrigin } from "@/lib/http";

/** Membro Pró denuncia uma mensagem. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (!rateLimit(`community-report:${user.id}`, 10, 10 * 60_000)) return fail("Muitas denúncias seguidas. Tente em alguns minutos.", 429);
  const parsed = z.object({ messageId: z.number().int().positive(), reason: z.string().max(60) }).safeParse(await req.json().catch(() => null));
  if (parsed.success && user.plan !== "pro" && user.role !== "admin" && !messageIsFree(parsed.data.messageId)) return fail("Este canal é exclusivo do plano Pró.", 403);
  if (!parsed.success || !reportMessage(parsed.data.messageId, user.id, parsed.data.reason)) return fail("Não foi possível denunciar (você já denunciou esta mensagem ou ela é sua).");
  return json({ ok: true }, 201);
}

/** Administrador dispensa a denúncia (a mensagem fica). */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user || user.role !== "admin") return fail("Somente administradores.", 403);
  const q = new URL(req.url).searchParams;
  const id = Number(q.get("id"));
  const ok = q.get("kind") === "post" ? dismissPostReport(id) : dismissReport(id);
  return Number.isInteger(id) && ok ? json({ ok: true }) : fail("Denúncia não encontrada.", 404);
}
