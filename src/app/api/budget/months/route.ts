import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { deleteMonth, saveMonth, validYm } from "@/lib/budget";

const money = z.number().min(0).max(1e10);
const schema = z.object({
  ym: z.string().refine(validYm),
  income: money,
  reserve: money.nullable(),
  actual: z.object({ moradia: money, alimentacao: money, transporte: money, saude: money, lazer: money, reserva: money }),
});

/** Registra (ou corrige) os gastos de um mês. Recurso gratuito. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira o mês e os valores informados.");
  return saveMonth(user.id, parsed.data) ? json({ ok: true }) : fail("Mês inválido.");
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = z.object({ ym: z.string().refine(validYm) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Mês inválido.");
  return json({ ok: deleteMonth(user.id, parsed.data.ym) });
}
