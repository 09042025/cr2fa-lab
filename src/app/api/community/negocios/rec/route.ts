import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { addRec, removeRec } from "@/lib/business";

const schema = z.object({ listingId: z.number().int(), hired: z.boolean(), comment: z.string().max(500) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user || (user.plan !== "pro" && user.role !== "admin")) return fail("Exclusivo para membros Premium.", 403);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Confira a indicação.");
  const r = addRec(p.data.listingId, user.id, p.data.hired, p.data.comment);
  return r === true ? json({ ok: true }) : fail(r.error);
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user || (user.plan !== "pro" && user.role !== "admin")) return fail("Exclusivo para membros Premium.", 403);
  const id = Number(new URL(req.url).searchParams.get("id"));
  return Number.isInteger(id) && removeRec(id, user.id, user.role === "admin") ? json({ ok: true }) : fail("Indicação não encontrada.", 404);
}
