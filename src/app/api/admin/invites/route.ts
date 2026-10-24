import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createInvite, getInvite, markEmailed, revokeInvite } from "@/lib/invites";
import { inviteEmail, mailEnabled, sendMail } from "@/lib/mail";
import { fail, json, sameOrigin } from "@/lib/http";

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120).or(z.literal("")).optional(),
  note: z.string().max(200).optional(),
  days: z.number().int().min(1).max(3660),
  validDays: z.number().int().min(1).max(90),
  send: z.boolean().optional(),
});

const base = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

async function emailInvite(id: number): Promise<string | null> {
  const inv = getInvite(id);
  if (!inv?.email) return "Este convite não tem e-mail.";
  if (!mailEnabled()) return "E-mail não configurado no servidor. Copie o link e envie por WhatsApp.";
  try {
    await sendMail({ to: inv.email, ...inviteEmail("", inv.days, `${base()}/convite/${inv.code}`, inv.note) });
    markEmailed(id);
    return null;
  } catch {
    return "Não consegui enviar o e-mail. Copie o link e envie por WhatsApp.";
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const admin = await getUser();
  if (!admin || admin.role !== "admin") return fail("Acesso restrito.", 403);
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira o e-mail, a duração e a validade do convite.");
  const d = parsed.data;
  if (d.send && !d.email) return fail("Para enviar por e-mail, informe o e-mail do convidado.");
  const inv = createInvite(admin.id, { email: d.email || null, note: d.note, days: d.days, validDays: d.validDays });
  const mailError = d.send ? await emailInvite(inv.id) : null;
  return json({ ok: true, code: inv.code, emailed: d.send && !mailError, mailError }, 201);
}

/** Cancelar um convite pendente ou reenviar o e-mail. */
export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const admin = await getUser();
  if (!admin || admin.role !== "admin") return fail("Acesso restrito.", 403);
  const parsed = z.object({ id: z.number().int().positive(), action: z.enum(["revoke", "resend"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Dados inválidos.");
  if (parsed.data.action === "revoke") return revokeInvite(parsed.data.id) ? json({ ok: true }) : fail("Só convites pendentes podem ser cancelados.");
  const inv = getInvite(parsed.data.id);
  if (!inv || inv.revokedAt || inv.redeemedAt) return fail("Convite indisponível.");
  const err = await emailInvite(parsed.data.id);
  return err ? fail(err) : json({ ok: true });
}
