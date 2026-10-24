import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db, now } from "@/lib/db";
import { fail, json, sameOrigin } from "@/lib/http";
import { deleteUserAccount } from "@/lib/account";

const schema = z.object({ plan: z.enum(["free", "pro"]), days: z.number().int().min(1).max(3660).optional() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const admin = await getUser();
  if (!admin || admin.role !== "admin") return fail("Acesso restrito.", 403);

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return fail("Usuário inválido.");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Dados inválidos.");

  const exists = db().prepare("SELECT 1 FROM users WHERE id = ?").get(userId);
  if (!exists) return fail("Usuário não encontrado.", 404);

  if (parsed.data.plan === "free") {
    db().prepare("UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE id = ?").run(userId);
  } else {
    const expires = now() + (parsed.data.days ?? 31) * 86400;
    db().prepare("UPDATE users SET plan = 'pro', plan_expires_at = ? WHERE id = ?").run(expires, userId);
  }
  return json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const admin = await getUser();
  if (!admin || admin.role !== "admin") return fail("Acesso restrito.", 403);

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return fail("Usuário inválido.");
  if (userId === admin.id) return fail("Você não pode excluir a sua própria conta.", 403);
  const body = (await req.json().catch(() => null)) as { confirmEmail?: unknown } | null;
  if (typeof body?.confirmEmail !== "string") return fail("Digite o e-mail da conta para confirmar.");

  const result = deleteUserAccount(userId, body.confirmEmail, admin.id);
  if (!result.ok) return fail(result.error, result.status);
  return json({ ok: true, paidOrders: result.paidOrders });
}
