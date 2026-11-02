import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { addGuest, openNewTurma, setSessions } from "@/lib/mentoria";

const schema = z.union([z.object({ id: z.number().int(), done: z.number().int().min(0).max(12) }), z.object({ action: z.literal("new-turma") }), z.object({ action: z.literal("add-guest"), email: z.string().email().max(200) })]);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user || user.role !== "admin") return fail("Acesso restrito.", 403);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Dados inválidos.");
  if ("action" in p.data) {
    if (p.data.action === "add-guest") { const r = addGuest(p.data.email); return "error" in r ? fail(r.error, 409) : json({ ok: true }); }
    return json({ turma: openNewTurma() });
  }
  return setSessions(p.data.id, p.data.done) ? json({ ok: true }) : fail("Mentoria não encontrada.", 404);
}
