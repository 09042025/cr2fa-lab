import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json, sameOrigin } from "@/lib/http";

const addSchema = z.object({
  block: z.enum(["cripto", "fiis", "acoes", "renda_fixa", "oportunidades"]),
  label: z.string().trim().min(1).max(60),
  value: z.number().min(0).max(1_000_000_000),
});

async function pro() {
  const user = await getUser();
  if (!user) return { error: fail("Faça login.", 401) };
  if (user.plan !== "pro") return { error: fail("Recurso do plano Pró.", 403) };
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
    .prepare("INSERT INTO holdings (user_id, block, label, value_cents) VALUES (?, ?, ?, ?)")
    .run(user!.id, parsed.data.block, parsed.data.label, Math.round(parsed.data.value * 100));
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
