import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { listMentions, markMentionsRead, unreadMentions } from "@/lib/mentions";

/** GET: marcações (@) que recebi e quantas ainda não vi (?count=1 devolve só o total). POST {read:true}: marca como vistas. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (new URL(req.url).searchParams.get("count")) return json({ unread: unreadMentions(user.id) });
  return json({ unread: unreadMentions(user.id), items: listMentions(user.id) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  markMentionsRead(user.id);
  return json({ ok: true });
}
