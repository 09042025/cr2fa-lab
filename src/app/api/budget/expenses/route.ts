import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { addExpense, deleteExpense } from "@/lib/budget";
import { MAX_REPEAT_MONTHS, validDay } from "@/lib/budget-calc";

const add = z.object({
  day: z.string().refine(validDay),
  cat: z.enum(["moradia", "alimentacao", "transporte", "saude", "lazer", "reserva"]),
  sub: z.string().trim().min(1).max(40),
  amount: z.number().positive().max(1e8),
  note: z.string().trim().max(80).default(""),
  receiptId: z.number().int().positive().nullable().optional(),
  /** Gasto fixo: repete no mesmo dia de cada mês, por este número de meses. */
  /** Reembolso da empresa: abate o valor dos gastos do mês. */
  reimb: z.boolean().optional(),
  repeatMonths: z.number().int().min(1).max(MAX_REPEAT_MONTHS).optional(),
});

/** Lança um gasto em um dia. Recurso gratuito. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = add.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira o dia, a categoria e o valor.");
  const list = addExpense(user.id, parsed.data);
  return list ? json({ expense: list[0], expenses: list }, 201) : fail("Não foi possível salvar.");
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = z.object({ id: z.number().int().positive(), series: z.boolean().optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Lançamento inválido.");
  const ids = deleteExpense(user.id, parsed.data.id, parsed.data.series);
  return json({ ok: ids.length > 0, ids });
}
