import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { cancel, checkIn, decide, register } from "@/lib/events";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("register"), eventId: z.number().int() }),
  z.object({ action: z.literal("cancel"), eventId: z.number().int() }),
  z.object({ action: z.literal("decide"), rsvpId: z.number().int(), status: z.enum(["confirmed", "declined"]) }),
  z.object({ action: z.literal("checkin"), code: z.string().min(8).max(40) }),
]);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Dados inválidos.");
  const d = p.data;
  if (d.action === "register") {
    const r = register(d.eventId, user);
    return "error" in r ? fail(r.error, 403) : json(r);
  }
  if (d.action === "cancel") return cancel(d.eventId, user.id) ? json({ ok: true }) : fail("Nada a cancelar.");
  if (user.role !== "admin") return fail("Acesso restrito à organização.", 403);
  if (d.action === "decide") return decide(d.rsvpId, d.status) ? json({ ok: true }) : fail("Inscrição não encontrada.", 404);
  const r = checkIn(d.code);
  return r.ok ? json({ ok: true, name: r.rsvp.name }) : json({ ok: false, reason: r.reason, name: r.rsvp?.name }, 200);
}
