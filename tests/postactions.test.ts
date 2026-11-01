import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { addPost, listPosts, recordViews, setFollow, toggleBookmark, toggleLike, toggleRepost } from "../src/lib/feed";
import { compact, shareTargets, shareText } from "../src/lib/share";

const user = (n: string) => Number(db().prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, 'x')").run(`${n}@p.com`, n).lastInsertRowid);

test("repost, salvar e visualizações", () => {
  const a = user("ana2"), b = user("bia2"), c = user("cris2");
  const id = addPost(a, "geral", "olá mundo")!;
  assert.equal(toggleRepost(id, a), false, "não reposta a própria");
  assert.ok(toggleRepost(id, b));
  assert.ok(toggleBookmark(id, b));
  assert.equal(recordViews([id, id], a), 0, "autor não conta");
  assert.equal(recordViews([id], b), 1);
  assert.equal(recordViews([id], b), 0, "só uma vez por membro");
  recordViews([id], c);
  toggleLike(id, c);
  const pb = listPosts({ viewerId: b }).posts.find((p) => p.id === id)!;
  assert.deepEqual([pb.reposts, pb.reposted, pb.bookmarked, pb.views, pb.likes, pb.liked], [1, true, true, 2, 1, false]);
  const pc = listPosts({ viewerId: c }).posts.find((p) => p.id === id)!;
  assert.deepEqual([pc.reposted, pc.bookmarked, pc.liked], [false, false, true]);
  assert.equal(listPosts({ viewerId: b, saved: true }).posts.length >= 1, true);
  assert.equal(listPosts({ viewerId: c, saved: true }).posts.length, 0);
  assert.ok(toggleRepost(id, b));
  assert.equal(listPosts({ viewerId: c }).posts.find((p) => p.id === id)!.reposts, 0, "desfeito");
  assert.equal(toggleRepost(999999, b), false);
});

test("seguindo mostra o que quem você segue repostou", () => {
  const a = user("dani2"), b = user("edu2"), c = user("fe2");
  const id = addPost(a, "geral", "post da dani")!;
  setFollow(c, b, true);
  assert.equal(listPosts({ viewerId: c, following: true }).posts.some((p) => p.id === id), false);
  toggleRepost(id, b);
  const p = listPosts({ viewerId: c, following: true }).posts.find((x) => x.id === id)!;
  assert.equal(p.repostedBy, "edu2");
});

test("compartilhamento: links e contadores", () => {
  const t = shareTargets("https://x.com/p?a=1&b=2", "Olá & tchau");
  assert.ok(t.find((x) => x.id === "whatsapp")!.href.includes(encodeURIComponent("Olá & tchau https://x.com/p?a=1&b=2")));
  assert.ok(t.every((x) => /^(https:\/\/|mailto:|sms:)/.test(x.href)));
  assert.ok(shareText("a".repeat(300), "Ana").length < 200);
  assert.deepEqual([compact(999), compact(1234), compact(25000), compact(1_500_000)], ["999", "1,2 mil", "25 mil", "1,5 mi"]);
});

test("busca de membros para seguir", async () => {
  const { searchPeople } = await import("../src/lib/feed");
  const a = user("zeca3"), b = user("zuleica3"), c = user("zoe3"), d = user("paulo3");
  db().prepare("UPDATE users SET handle = 'zu_trader' WHERE id = ?").run(b);
  setFollow(c, b, true); setFollow(d, b, true);
  const byName = searchPeople(a, "zul");
  assert.deepEqual(byName.map((p) => p.name), ["zuleica3"]);
  assert.equal(byName[0].followers, 2);
  assert.equal(byName[0].handle, "zu_trader");
  assert.equal(searchPeople(a, "@zu_tr")[0]?.id, b);
  assert.equal(searchPeople(a, "z").length, 0, "1 letra não busca");
  assert.equal(searchPeople(a, "%").length, 0, "curinga é removido");
  assert.ok(!searchPeople(a, "zeca").some((p) => p.id === a), "não lista você");
  db().prepare("INSERT INTO community_blocks (blocker_id, blocked_id) VALUES (?, ?)").run(a, b);
  assert.equal(searchPeople(a, "zul").length, 0, "bloqueado some");
  setFollow(a, c, true);
  const sug = searchPeople(a, "");
  assert.ok(!sug.some((p) => p.id === c || p.id === a || p.id === b), "sugestões ignoram quem já segue, você e bloqueados");
});
