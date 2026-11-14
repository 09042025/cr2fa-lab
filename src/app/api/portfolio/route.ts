import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json, sameOrigin } from "@/lib/http";
import { applyBuy, applySell } from "@/lib/portfolio-calc";

const addSchema = z.object({
  block: z.enum(["cripto", "fiis", "acoes", "renda_fixa", "oportunidades"]),
  label: z.string().trim().min(1).max(60),
  value: z.number().min(0).max(1_000_000_000),
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z]{4}\d{1,2}$/).optional(),
  qty: z.number().positive().max(1_000_000_000).optional(),
  avgPrice: z.number().positive().max(1_000_000).optional(),
});

const patchSchema = z.object({
  id: z.number().int(),
  action: z.enum(["buy", "sell", "set"]),
  qty: z.number().positive().max(1_000_000_000),
  price: z.number().positive().max(1_000_000).optional(),
});

async function pro() {
  const user = await getUser();
  if (!user) return { error: fail("Faça login.", 401) };
  if (user.plan !== "pro") return { error: fail("Recurso do plano Premium.", 403) };
  return { user };
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const { user, error } = await pro();
  if (error) return error;
  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira bloco, nome e valor.");
  const count = (db().prepare("SELECT COUNT(*) c FROM holdings WHERE user_id = ?").get(user!.id) as { c: number }).c;
  if (count >= 500) return fail("Limite de 500 posições atingido.");
  db()
    .prepare("INSERT INTO holdings (user_id, block, label, value_cents, ticker, qty, avg_price) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(user!.id, parsed.data.block, parsed.data.label, Math.round(parsed.data.value * 100), parsed.data.ticker ?? null, parsed.data.qty ?? null, parsed.data.avgPrice ?? null);
  return json({ ok: true }, 201);
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const { user, error } = await pro();
  if (error) return error;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return fail("Posição inválida.");
  db().prepare("DELETE FROM holdings WHERE id = ? AND user_id = ?").run(id, user!.id);
  return json({ ok: true });
}

/** Compra, venda ou ajuste de quantidade/preço médio de uma posição (método da B3: venda não muda o preço médio). */
export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const { user, error } = await pro();
  if (error) return error;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira quantidade e preço.");
  const { id, action, qty, price } = parsed.data;
  const h = db().prepare("SELECT qty, avg_price FROM holdings WHERE id = ? AND user_id = ?").get(id, user!.id) as { qty: number | null; avg_price: number | null } | undefined;
  if (!h) return fail("Posição não encontrada.", 404);
  let next: { qty: number; avg: number | null };
  if (action === "buy") {
    if (!price) return fail("Informe o preço pago.");
    next = applyBuy(h.qty ?? 0, h.avg_price, qty, price);
  } else if (action === "sell") {
    next = applySell(h.qty ?? 0, h.avg_price, qty);
  } else {
    if (!price) return fail("Informe o preço médio.");
    next = { qty, avg: price };
  }
  if (next.qty <= 0) db().prepare("DELETE FROM holdings WHERE id = ? AND user_id = ?").run(id, user!.id);
  else db().prepare("UPDATE holdings SET qty = ?, avg_price = ? WHERE id = ? AND user_id = ?").run(next.qty, next.avg, id, user!.id);
  return json({ ok: true });
}
