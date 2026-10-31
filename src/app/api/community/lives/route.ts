import { z } from "zod";
import { getUser, rateLimit } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { addLiveChat, endOpenLive, getOpenLive, listLiveChat, listOpenLives, startOpenLive } from "@/lib/openlives";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), title: z.string().max(200), url: z.string().max(500) }),
  z.object({ action: z.literal("end"), id: z.number().int().positive() }),
  z.object({ action: z.literal("chat"), id: z.number().int().positive(), body: z.string().max(1000) }),
]);

/** GET: lives ativas, ou (?id=N&after=M) a live e as mensagens novas do chat. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const sp = new URL(req.url).searchParams;
  if (sp.get("id") === null) return json({ lives: listOpenLives(user.id) });
  const live = getOpenLive(Number(sp.get("id")));
  if (!live) return json({ live: null, messages: [] });
  return json({ live, me: user.id, messages: listLiveChat(live.id, user.id, Math.max(0, Number(sp.get("after")) || 0)) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira os dados.");
  const d = parsed.data;
  if (d.action === "start") {
    if (!rateLimit(`live-start:${user.id}`, 5, 60 * 60_000)) return fail("Muitas lives iniciadas. Tente mais tarde.", 429);
    const r = startOpenLive(user.id, d.title, d.url);
    return r.ok ? json({ id: r.id }, 201) : fail(r.error, r.status ?? 400);
  }
  if (d.action === "end") return endOpenLive(d.id, user) ? json({ ok: true }) : fail("Não foi possível encerrar.", 404);
  if (!rateLimit(`live-chat:${user.id}`, 30, 60_000)) return fail("Calma! Muitas mensagens seguidas.", 429);
  const r = addLiveChat(d.id, user.id, d.body);
  return r.ok ? json({ id: r.id }, 201) : fail(r.error, r.status ?? 400);
}
