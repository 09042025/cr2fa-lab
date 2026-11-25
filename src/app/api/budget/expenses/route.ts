import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { addExpense, deleteExpense } from "@/lib/budget";
import { validDay } from "@/lib/budget-calc";

const add = z.object({
  day: z.string().refine(validDay),
  cat: z.enum(["moradia", "alimentacao", "transporte", "saude", "lazer", "reserva"]),
  sub: z.string().trim().min(1).max(40),
  amount: z.number().positive().max(1e8),
  note: z.string().trim().max(80).default(""),
});

/** Lança um gasto em um dia. Recurso gratuito. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = add.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira o dia, a categoria e o valor.");
  const e = addExpense(user.id, parsed.data);
  return e ? json({ expense: e }, 201) : fail("Não foi possível salvar.");
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = z.object({ id: z.number().int().positive() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Lançamento inválido.");
  return json({ ok: deleteExpense(user.id, parsed.data.id) });
}
