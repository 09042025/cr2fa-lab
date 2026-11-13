import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser, rateLimit } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { videoIdOfEmbed, youtubeChat, ytMessage } from "@/lib/ytchat";
import { addLiveChat, endOpenLive, getOpenLive, getSpotlight, listLiveChat, listOpenLives, setSpotlight, startOpenLive } from "@/lib/openlives";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), title: z.string().max(200), url: z.string().max(500) }),
  z.object({ action: z.literal("end"), id: z.number().int().positive() }),
  z.object({ action: z.literal("spotlight"), id: z.number().int().positive(), msgId: z.number().int().positive().nullable().optional(), ytId: z.string().min(1).max(200).optional() }),
  z.object({ action: z.literal("chat"), id: z.number().int().positive(), body: z.string().max(1000) }),
]);

/** GET: lives ativas, ou (?id=N&after=M) a live e as mensagens novas do chat. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  // Overlay do OBS: sem login, protegido pela chave secreta do link. Só devolve o comentário em destaque.
  if (sp.get("overlay") === "1") {
    const key = sp.get("k") ?? "";
    return NextResponse.json({ spotlight: key ? getSpotlight(Number(sp.get("id")), key) : null }, { headers: { "cache-control": "no-store" } });
  }
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (sp.get("id") === null) return json({ lives: listOpenLives(user.id) });
  const live = getOpenLive(Number(sp.get("id")));
  if (!live) return json({ live: null, messages: [] });
  const host = live.userId === user.id || user.role === "admin";
  const vid = host ? videoIdOfEmbed(live.embed) : null;
  const yt = vid ? await youtubeChat(live.id, vid, Math.max(0, Number(sp.get("yt")) || 0)) : null;
  return json({ live, me: user.id, spotlight: live.spotlightId, spotlightYt: live.spotlightYtId, yt, messages: listLiveChat(live.id, user.id, Math.max(0, Number(sp.get("after")) || 0)) });
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
  if (d.action === "spotlight") {
    let target: Parameters<typeof setSpotlight>[2] = d.msgId ?? null;
    if (d.ytId) {
      const m = ytMessage(d.id, d.ytId);
      if (!m) return fail("Esse comentário do YouTube já saiu da lista.", 404);
      target = { yt: { id: m.id, name: m.name, body: m.body } };
    }
    return setSpotlight(d.id, user, target) ? json({ ok: true }) : fail("Só quem transmite pode destacar.", 403);
  }
  if (d.action === "end") return endOpenLive(d.id, user) ? json({ ok: true }) : fail("Não foi possível encerrar.", 404);
  if (!rateLimit(`live-chat:${user.id}`, 30, 60_000)) return fail("Calma! Muitas mensagens seguidas.", 429);
  const r = addLiveChat(d.id, user.id, d.body);
  return r.ok ? json({ id: r.id }, 201) : fail(r.error, r.status ?? 400);
}
