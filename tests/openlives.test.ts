import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { addLiveChat, endOpenLive, getOpenLive, listLiveChat, listOpenLives, parseLiveUrl, startOpenLive } from "../src/lib/openlives";

const user = (n: string) => Number(db().prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, 'x')").run(`${n}@l.com`, n).lastInsertRowid);

test("parseLiveUrl: só https de plataformas conhecidas; YouTube vira player", () => {
  assert.equal(parseLiveUrl("http://youtube.com/watch?v=abcdefghijk"), null);
  assert.equal(parseLiveUrl("https://evil.com/youtube.com"), null);
  assert.equal(parseLiveUrl("https://youtube.com.evil.com/watch?v=abcdefghijk"), null);
  assert.equal(parseLiveUrl("javascript:alert(1)"), null);
  assert.equal(parseLiveUrl("https://user:pw@youtube.com/watch?v=abcdefghijk"), null);
  assert.equal(parseLiveUrl("https://www.youtube.com/watch?v=abcdefghijk")?.embed, "https://www.youtube.com/embed/abcdefghijk?autoplay=1&rel=0");
  assert.equal(parseLiveUrl("https://youtu.be/abcdefghijk")?.embed?.includes("abcdefghijk"), true);
  assert.equal(parseLiveUrl("https://www.youtube.com/live/abcdefghijk?feature=share")?.platform, "YouTube");
  const ig = parseLiveUrl("https://www.instagram.com/someone/live/");
  assert.equal(ig?.platform, "Instagram");
  assert.equal(ig?.embed, null);
});

test("lives: iniciar, trocar, chat, encerrar, bloqueio", () => {
  const a = user("lia"), b = user("lucas"), c = user("luna");
  assert.equal(startOpenLive(a, "ab", "https://youtu.be/abcdefghijk").ok, false);
  assert.equal(startOpenLive(a, "Minha live", "https://exemplo.com/x").ok, false);
  const r1 = startOpenLive(a, "Análise do dia", "https://youtu.be/abcdefghijk");
  assert.ok(r1.ok);
  const r2 = startOpenLive(a, "Segunda", "https://www.tiktok.com/@lia/live");
  assert.ok(r2.ok);
  assert.equal(getOpenLive((r1 as { id: number }).id), null, "a anterior foi encerrada");
  const id = (r2 as { id: number }).id;
  assert.equal(listOpenLives(b).length >= 1, true);
  assert.ok(addLiveChat(id, b, "  olá  ").ok);
  assert.equal(addLiveChat(id, b, "").ok, false);
  assert.equal(listLiveChat(id, c)[0].body, "olá");
  db().prepare("INSERT INTO community_blocks (blocker_id, blocked_id) VALUES (?, ?)").run(c, b);
  assert.equal(listLiveChat(id, c).length, 0);
  assert.equal(endOpenLive(id, { id: b, role: "user" }), false);
  assert.ok(endOpenLive(id, { id: b, role: "admin" }));
  assert.equal(addLiveChat(id, b, "tarde").ok, false);
});

test("overlay: destaque só pelo apresentador/admin; chave protege a leitura", async () => {
  const { getSpotlight, overlayKey, setSpotlight } = await import("../src/lib/openlives");
  const host = user("host"), other = user("outro");
  const r = startOpenLive(host, "Live com overlay", "https://youtu.be/abcdefghijk");
  assert.ok(r.ok);
  const id = (r as { id: number }).id;
  const m = addLiveChat(id, other, "Ótima análise!");
  assert.ok(m.ok);
  const mid = (m as { id: number }).id;
  const key = overlayKey(id, { id: host, role: "user" })!;
  assert.equal(key.length, 32);
  assert.equal(overlayKey(id, { id: other, role: "user" }), null);
  assert.equal(setSpotlight(id, { id: other, role: "user" }, mid), false);
  assert.equal(setSpotlight(id, { id: host, role: "user" }, 999999), false);
  assert.equal(getSpotlight(id, key), null, "sem destaque ainda");
  assert.ok(setSpotlight(id, { id: host, role: "user" }, mid));
  assert.equal(getSpotlight(id, "chave-errada"), null);
  assert.equal(getSpotlight(id, key)?.body, "Ótima análise!");
  assert.ok(setSpotlight(id, { id: host, role: "user" }, null));
  assert.equal(getSpotlight(id, key), null);
  setSpotlight(id, { id: host, role: "user" }, mid);
  endOpenLive(id, { id: host, role: "user" });
  assert.equal(getSpotlight(id, key), null, "live encerrada");
});

test("chat do YouTube: lê mensagens, respeita intervalo, destaca e traduz erros", async () => {
  const { youtubeChat, ytMessage, ytErrorText } = await import("../src/lib/ytchat");
  const { setSetting } = await import("../src/lib/settings");
  const { getSpotlight, overlayKey, setSpotlight } = await import("../src/lib/openlives");
  setSetting("youtube_api_key", "AIzaFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE123");
  const calls: string[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (u: string | URL | Request) => {
    const url = String(u); calls.push(url);
    if (url.includes("/videos?")) return new Response(JSON.stringify({ items: [{ liveStreamingDetails: { activeLiveChatId: "CHAT1" } }] }));
    return new Response(JSON.stringify({ nextPageToken: "T2", pollingIntervalMillis: 5000, items: [
      { id: "m1", snippet: { type: "textMessageEvent", displayMessage: " Oi  Niza ", publishedAt: "2026-11-13T15:00:00Z" }, authorDetails: { displayName: "Ana", isChatModerator: true } },
      { id: "m2", snippet: { type: "superChatEvent", displayMessage: "x" }, authorDetails: { displayName: "Bia" } },
    ] }));
  }) as typeof fetch;
  try {
    const host = user("hostyt");
    const r = startOpenLive(host, "Live YT", "https://youtu.be/abcdefghijk");
    const id = (r as { id: number }).id;
    const a = await youtubeChat(id, "abcdefghijk", 0);
    assert.equal(a.enabled, true);
    assert.equal(a.messages.length, 1, "só mensagens de texto");
    assert.equal(a.messages[0].body, "Oi Niza");
    assert.equal(a.messages[0].mod, true);
    const n = calls.length;
    const b = await youtubeChat(id, "abcdefghijk", a.messages[0].n);
    assert.equal(calls.length, n, "dentro do intervalo mínimo não consulta de novo");
    assert.equal(b.messages.length, 0);
    assert.ok(ytMessage(id, "m1"));
    assert.ok(setSpotlight(id, { id: host, role: "user" }, { yt: { id: "m1", name: "Ana", body: "Oi Niza" } }));
    const key = overlayKey(id, { id: host, role: "user" })!;
    const sp = getSpotlight(id, key);
    assert.equal(sp?.body, "Oi Niza");
    assert.equal(sp?.youtube, true);
    assert.ok(setSpotlight(id, { id: host, role: "user" }, null));
    assert.equal(getSpotlight(id, key), null);
    assert.match(ytErrorText(403, { error: { errors: [{ reason: "quotaExceeded" }] } }), /limite diário/);
    assert.match(ytErrorText(403, { error: { errors: [{ reason: "liveChatDisabled" }] } }), /desligado/);
  } finally { globalThis.fetch = real; setSetting("youtube_api_key", null); }
});
