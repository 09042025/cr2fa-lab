import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { countCashpills, createCashpill, deleteCashpill, listCashpills, listPhotos } from "../src/lib/cashpills";
import { mediaIsFree } from "../src/lib/community";

const user = (email: string, role = "user") => Number(db().prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, 'x', ?)").run(email, email, role).lastInsertRowid);
const video = (u: number) => Number(db().prepare("INSERT INTO community_videos (user_id, mime, data) VALUES (?, 'video/mp4', x'00')").run(u).lastInsertRowid);
const image = (u: number) => Number(db().prepare("INSERT INTO community_images (user_id, mime, data, private) VALUES (?, 'image/jpeg', x'00', 0)").run(u).lastInsertRowid);

test("Cashpill: cria, lista, conta e só o dono (ou admin) apaga", () => {
  const a = user("cp1@x.com"), b = user("cp2@x.com"), adm = user("cp3@x.com", "admin");
  const v = video(a), p = image(a);
  const r = createCashpill(a, v, p, 29.6, "  Primeiro   Cashpill ");
  assert.ok(r.ok);
  const l = listCashpills(a);
  assert.equal(l.length, 1);
  assert.equal(l[0].duration, 30);
  assert.equal(l[0].caption, "Primeiro Cashpill");
  assert.equal(countCashpills(a), 1);
  assert.equal(mediaIsFree("image", p), true);
  assert.equal(createCashpill(a, v, p, 15, "").ok, false); // vídeo/capa já usados
  assert.equal(createCashpill(b, video(a), image(b), 15, "").ok, false); // vídeo de outra pessoa
  assert.equal(deleteCashpill(l[0].id, { id: b, role: "user" }), false);
  assert.equal(deleteCashpill(l[0].id, { id: adm, role: "admin" }), true);
  assert.equal(countCashpills(a), 0);
});

test("duração é limitada a 60 s e há limite diário", () => {
  const a = user("cp4@x.com");
  const r = createCashpill(a, video(a), image(a), 500, "");
  assert.ok(r.ok);
  assert.equal(listCashpills(a)[0].duration, 60);
  for (let i = 0; i < 9; i++) assert.ok(createCashpill(a, video(a), image(a), 15, "").ok);
  const x = createCashpill(a, video(a), image(a), 15, "");
  assert.equal(x.ok, false);
});

test("aba Fotos lista só publicações com imagem", () => {
  const a = user("cp5@x.com");
  const img = image(a);
  db().prepare("INSERT INTO community_posts (user_id, body, image_id) VALUES (?, 'com foto', ?)").run(a, img);
  db().prepare("INSERT INTO community_posts (user_id, body) VALUES (?, 'sem foto')").run(a);
  assert.deepEqual(listPhotos(a).map((f) => f.imageId), [img]);
});

test("Cashpill vira publicação com curtida/comentário e apagar remove tudo", async () => {
  const { listPosts, toggleLike, deletePost } = await import("../src/lib/feed");
  const a = user("cp9@x.com"), b = user("cp10@x.com");
  const r = createCashpill(a, video(a), image(a), 10, "Oi");
  assert.ok(r.ok);
  const post = listPosts({ viewerId: b, authorId: a }).posts[0];
  assert.ok(post.pillVideoId && post.pillPosterId);
  assert.equal(post.body, "Oi");
  assert.ok(toggleLike(post.id, b));
  assert.equal(listPosts({ viewerId: b, authorId: a }).posts[0].likes, 1);
  assert.ok(deletePost(post.id, { id: a, role: "user" }));
  assert.equal(countCashpills(a), 0);
  assert.equal(listPosts({ viewerId: b, authorId: a }).posts.length, 0);
});

test("Compartilhar: sugestões (quem segue) e Cashpill no story", async () => {
  const { shareSuggestions } = await import("../src/lib/dm");
  const { sharePostToStory, listStoryGroups } = await import("../src/lib/stories");
  const { listPosts } = await import("../src/lib/feed");
  const a = user("sh1@x.com"), b = user("sh2@x.com"), c = user("sh3@x.com");
  db().prepare("INSERT INTO community_follows (follower_id, followed_id) VALUES (?, ?)").run(b, a);
  assert.deepEqual(shareSuggestions(b, 10).map((x) => x.id), [a]);
  assert.ok(!shareSuggestions(b, 10).some((x) => x.id === c));
  assert.ok(createCashpill(a, video(a), image(a), 8, "x").ok);
  const post = listPosts({ viewerId: b, authorId: a }).posts[0];
  const r = sharePostToStory(b, post.id);
  assert.ok(r.ok);
  assert.ok(listStoryGroups(b).some((g) => g.mine && g.stories.length === 1));
  assert.equal(sharePostToStory(b, 999999).ok, false);
});
