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
