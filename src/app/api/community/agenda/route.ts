import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { addEvent, deleteEvent, listEvents } from "@/lib/agenda";
import { createPresencial } from "@/lib/events";

const isPremium = (u: { plan: string; role: string }) => u.plan === "pro" || u.role === "admin";

const schema = z.object({
  title: z.string().min(1).max(120),
  startsAt: z.number().int(),
  durationMin: z.number().int().min(5).max(1440),
  link: z.string().max(500).default(""),
  notes: z.string().max(600).default(""),
  kind: z.enum(["reuniao", "evento"]).default("reuniao"),
  details: z.object({
    bannerId: z.number().int().nullable().default(null), location: z.string().max(250).default(""), costMode: z.string().max(20).default(""),
    costNote: z.string().max(400).default(""), capacity: z.number().int().nullable().default(null), approval: z.boolean().default(false), audience: z.string().max(10).default("premium"),
  }).optional(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (!isPremium(user)) return fail("Exclusivo do plano Premium.", 403);
  return json({ events: listEvents() });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.role !== "admin") return fail("Só o administrador cadastra eventos.", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira o título, a data e o link.");
  if (parsed.data.kind === "evento") {
    if (!parsed.data.details) return fail("Preencha os dados do evento presencial (endereço e custo).");
    const r = createPresencial(user.id, parsed.data, parsed.data.details);
    return "error" in r ? fail(r.error) : json({ event: r }, 201);
  }
  const ev = addEvent(user.id, parsed.data);
  return ev ? json({ event: ev }, 201) : fail("Não foi possível salvar: confira a data e o link (precisa começar com https://).");
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.role !== "admin") return fail("Só o administrador apaga eventos.", 403);
  const id = Number(new URL(req.url).searchParams.get("id"));
  return Number.isInteger(id) && deleteEvent(id) ? json({ ok: true }) : fail("Evento não encontrado.", 404);
}
