import { z } from "zod";
import { getUser, rateLimit } from "@/lib/auth";
import { addMessage, canPost, deleteMessage, findChannel, MAX_BODY } from "@/lib/community";
import { fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({ channel: z.string().max(60), body: z.string().trim().min(1).max(MAX_BODY) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("A Comunidade é exclusiva do plano Pró.", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(`Escreva uma mensagem de até ${MAX_BODY} caracteres.`);
  const ch = findChannel(parsed.data.channel, user.role === "admin");
  if (ch.slug !== parsed.data.channel) return fail("Canal inválido.");
  if (!canPost(ch, user)) return fail("Só a equipe pode escrever neste canal.", 403);
  if (!rateLimit(`community:${user.id}`, 20, 60_000)) return fail("Calma! Muitas mensagens seguidas. Tente em instantes.", 429);
  addMessage(ch.slug, user.id, parsed.data.body);
  return json({ ok: true }, 201);
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return fail("Mensagem inválida.");
  return deleteMessage(id, user) ? json({ ok: true }) : fail("Não foi possível apagar.", 404);
}
