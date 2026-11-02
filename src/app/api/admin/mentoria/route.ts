import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { setSessions } from "@/lib/mentoria";

const schema = z.object({ id: z.number().int(), done: z.number().int().min(0).max(12) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user || user.role !== "admin") return fail("Acesso restrito.", 403);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Dados inválidos.");
  return setSessions(p.data.id, p.data.done) ? json({ ok: true }) : fail("Mentoria não encontrada.", 404);
}
