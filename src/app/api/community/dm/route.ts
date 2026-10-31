import { z } from "zod";
import { getUser, rateLimit } from "@/lib/auth";
import { deleteDm, listConversation, listConversations, searchMembers, sendDm, unreadCount } from "@/lib/dm";
import { fail, json, sameOrigin } from "@/lib/http";
import { isBanned } from "@/lib/community";
import { db } from "@/lib/db";

const sendSchema = z.object({
  to: z.number().int().positive(),
  body: z.string().max(1000).default(""),
  imageId: z.number().int().positive().nullish(),
  audioId: z.number().int().positive().nullish(),
});

/**
 * GET /api/community/dm                → conversas + total de não lidas
 * GET /api/community/dm?with=ID&after=N → mensagens com um membro (marca como lidas)
 * GET /api/community/dm?q=nome          → busca de membros para começar uma conversa
 * GET /api/community/dm?unread=1        → só o total de não lidas (ícone do menu)
 */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const sp = new URL(req.url).searchParams;
  if (sp.get("unread")) return json({ unread: unreadCount(user.id) });
  const q = sp.get("q");
  if (q !== null) return json({ members: searchMembers(user.id, q) });
  const withId = Number(sp.get("with"));
  if (sp.get("with") !== null) {
    if (!Number.isInteger(withId) || withId <= 0) return fail("Membro inválido.");
    const other = db().prepare("SELECT id, name, avatar_id avatarId, role FROM users WHERE id = ?").get(withId) as { id: number; name: string; avatarId: number | null; role: string } | undefined;
    if (!other) return fail("Membro não encontrado.", 404);
    const after = Math.max(0, Number(sp.get("after")) || 0);
    const blocked = !!db().prepare("SELECT 1 FROM community_blocks WHERE blocker_id = ? AND blocked_id = ?").get(user.id, withId);
    return json({
      me: user.id,
      other: { id: other.id, name: other.name, avatarId: other.avatarId, isAdmin: other.role === "admin" },
      blocked,
      banned: isBanned(user.id),
      messages: listConversation(user.id, withId, after),
    });
  }
  return json({ me: user.id, unread: unreadCount(user.id), conversations: listConversations(user.id) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (!rateLimit(`dm:${user.id}`, 40, 60_000)) return fail("Muitas mensagens seguidas. Espere um instante.", 429);
  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira a mensagem.");
  const r = sendDm(user.id, parsed.data.to, parsed.data.body, { imageId: parsed.data.imageId, audioId: parsed.data.audioId });
  return r.ok ? json({ id: r.id }, 201) : fail(r.error, r.status ?? 400);
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || !deleteDm(id, user.id)) return fail("Não foi possível apagar.");
  return json({ ok: true });
}
