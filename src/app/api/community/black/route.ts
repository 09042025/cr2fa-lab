import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { inviteByEmail, requestInvite, setInvite } from "@/lib/black";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request") }),
  z.object({ action: z.literal("set"), userId: z.number().int().positive(), status: z.enum(["invited", "declined"]) }),
  z.object({ action: z.literal("invite-email"), email: z.string().email().max(200) }),
]);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Dados inválidos.");
  if (p.data.action === "request") {
    if (user.plan !== "pro" && user.role !== "admin") return fail("Disponível para membros Premium.", 403);
    requestInvite(user.id);
    return json({ ok: true });
  }
  if (user.role !== "admin") return fail("Apenas o administrador.", 403);
  if (p.data.action === "set") return setInvite(p.data.userId, p.data.status) ? json({ ok: true }) : fail("Membro não encontrado.", 404);
  return inviteByEmail(p.data.email) ? json({ ok: true }) : fail("Não existe conta com esse e-mail.", 404);
}
