import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { reportListing } from "@/lib/business";

const schema = z.object({ listingId: z.number().int(), reason: z.string().max(200) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user || (user.plan !== "pro" && user.role !== "admin")) return fail("Exclusivo para membros Premium.", 403);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Informe o motivo.");
  return reportListing(p.data.listingId, user.id, p.data.reason) ? json({ ok: true }) : fail("Anúncio não encontrado.", 404);
}
