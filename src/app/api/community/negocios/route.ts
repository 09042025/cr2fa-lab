import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { createListing, deleteListing, updateListing } from "@/lib/business";

const schema = z.object({
  id: z.number().int().optional(),
  kind: z.string().max(10), category: z.string().max(30), title: z.string().max(100), description: z.string().max(1500),
  city: z.string().max(80).default(""), state: z.string().max(2).default(""), priceNote: z.string().max(100).default(""),
  whatsapp: z.string().max(30).default(""), instagram: z.string().max(80).default(""), website: z.string().max(250).default(""),
  googleRating: z.number().nullable().default(null), googleUrl: z.string().max(350).default(""),
  cases: z.array(z.object({ title: z.string().max(100), text: z.string().max(500), link: z.string().max(350).default("") })).max(3).default([]),
});

async function premium() {
  const u = await getUser();
  return u && (u.plan === "pro" || u.role === "admin") ? u : null;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await premium();
  if (!user) return fail("Exclusivo para membros Premium.", 403);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Confira os campos do anúncio.");
  const { id, ...input } = p.data;
  if (id) {
    const r = updateListing(id, user.id, user.role === "admin", input);
    return r === true ? json({ id }) : fail(r.error);
  }
  const r = createListing(user.id, input);
  return typeof r === "number" ? json({ id: r }, 201) : fail(r.error);
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await premium();
  if (!user) return fail("Exclusivo para membros Premium.", 403);
  const id = Number(new URL(req.url).searchParams.get("id"));
  return Number.isInteger(id) && deleteListing(id, user.id, user.role === "admin") ? json({ ok: true }) : fail("Anúncio não encontrado.", 404);
}
