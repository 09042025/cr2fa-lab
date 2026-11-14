import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({
  /** "merge" atualiza as já importadas (mesmo nome e bloco) e acrescenta as novas, sem apagar nada; "replace" apaga as importadas antes; "add" só acrescenta. */
  mode: z.enum(["merge", "replace", "add"]),
  items: z
    .array(
      z.object({
        block: z.enum(["cripto", "fiis", "acoes", "renda_fixa", "oportunidades"]),
        label: z.string().trim().min(1).max(60),
        value: z.number().min(0).max(1_000_000_000),
        ticker: z.string().trim().toUpperCase().regex(/^[A-Z]{4}\d{1,2}$/).optional(),
        qty: z.number().positive().max(1_000_000_000).optional(),
        avgPrice: z.number().positive().max(1_000_000).optional(),
      }),
    )
    .min(1)
    .max(300),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("Recurso do plano Premium.", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira as linhas selecionadas.");

  const d = db();
  const run = d.transaction(() => {
    let removed = 0;
    if (parsed.data.mode === "replace") removed = d.prepare("DELETE FROM holdings WHERE user_id = ? AND source = 'b3'").run(user.id).changes;
    const count = (d.prepare("SELECT COUNT(*) c FROM holdings WHERE user_id = ?").get(user.id) as { c: number }).c;
    if (count + parsed.data.items.length > 500) throw new Error("LIMIT");
    const ins = d.prepare("INSERT INTO holdings (user_id, block, label, value_cents, source, ticker, qty, avg_price) VALUES (?, ?, ?, ?, 'b3', ?, ?, ?)");
    const find = d.prepare("SELECT id FROM holdings WHERE user_id = ? AND block = ? AND lower(label) = lower(?) AND source = 'b3' LIMIT 1");
    const upd = d.prepare("UPDATE holdings SET value_cents = ?, ticker = COALESCE(?, ticker), qty = COALESCE(?, qty) WHERE id = ?");
    for (const i of parsed.data.items) {
      const cents = Math.round(i.value * 100);
      const hit = parsed.data.mode === "merge" ? (find.get(user.id, i.block, i.label) as { id: number } | undefined) : undefined;
      if (hit) upd.run(cents, i.ticker ?? null, i.qty ?? null, hit.id);
      else ins.run(user.id, i.block, i.label, cents, i.ticker ?? null, i.qty ?? null, i.avgPrice ?? null);
    }
    return removed;
  });
  try {
    const removed = run();
    return json({ ok: true, imported: parsed.data.items.length, replaced: removed }, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "LIMIT") return fail("Limite de 500 posições atingido. Apague posições antigas e tente de novo.");
    throw e;
  }
}
