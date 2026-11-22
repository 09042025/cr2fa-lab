import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { getBudget, saveBudget } from "@/lib/budget";

const money = z.number().min(0).max(1e10);

export async function GET() {
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  return json({ budget: getBudget(user.id) });
}

/** Salva o orçamento do usuário (recurso gratuito, para todos os planos). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = z.object({
    income: money,
    reserveNow: money,
    actual: z.object({ moradia: money, alimentacao: money, transporte: money, saude: money, lazer: money, reserva: money }),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira os valores informados.");
  saveBudget(user.id, parsed.data);
  return json({ ok: true }, 201);
}
