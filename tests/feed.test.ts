import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { addMessage, listMessages, saveAudio, sniffAudio } from "../src/lib/community";
import { addComment, addPost, deletePost, getMember, listPosts, reportPost, saveCommunityProfile, toggleLike } from "../src/lib/feed";
import { setBlocked } from "../src/lib/community";

const mk = (email: string, name = "Bia", role = "user") => Number(db().prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, 'x', ?)").run(email, name, role).lastInsertRowid);
const png = Buffer.concat([Buffer.from([0x89]), Buffer.from("PNG\r\n\x1a\n"), Buffer.alloc(20)]);
const img = (uid: number) => Number(db().prepare("INSERT INTO community_images (user_id, mime, data) VALUES (?, 'image/png', ?)").run(uid, png).lastInsertRowid);

test("feed: publicar, curtir, comentar, filtrar por assunto e apagar", () => {
  const a = mk("f1@t.com"), b = mk("f2@t.com", "Caio"), adm = mk("f3@t.com", "Adm", "admin");
  assert.equal(addPost(a, "cripto", "   "), null);
  const p1 = addPost(a, "cripto", "BTC subindo")!;
  const p2 = addPost(b, "inexistente", "Olá")!; // assunto inválido vira "geral"
  assert.equal(listPosts({ viewerId: a }).posts.find((p) => p.id === p2)!.topic, "geral");
  assert.deepEqual(listPosts({ viewerId: a, topic: "cripto" }).posts.map((p) => p.id), [p1]);
  assert.equal(toggleLike(p1, b), true);
  assert.equal(addComment(p1, b, "Concordo"), true);
  assert.equal(addComment(p1, b, "  "), false);
  const post = listPosts({ viewerId: b }).posts.find((p) => p.id === p1)!;
  assert.equal(post.likes, 1);
  assert.equal(post.liked, true);
  assert.equal(post.comments[0].author, "Caio");
  assert.equal(deletePost(p1, { id: b, role: "user" }), false);
  assert.equal(deletePost(p1, { id: adm, role: "admin" }), true);
});

test("feed: bloqueio esconde posts, imagem só do próprio autor, paginação", () => {
  const a = mk("f4@t.com"), b = mk("f5@t.com");
  const ia = img(a);
  assert.equal(addPost(b, "geral", "", ia), null); // imagem alheia e sem texto: não publica
  const stolen = addPost(b, "geral", "texto", ia)!; // imagem alheia é ignorada
  assert.equal(listPosts({ viewerId: b }).posts.find((x) => x.id === stolen)!.imageId, null);
  const p = addPost(a, "geral", "com imagem", ia)!;
  assert.equal(listPosts({ viewerId: b }).posts.find((x) => x.id === p)!.imageId, ia);
  setBlocked(b, a, true);
  assert.equal(listPosts({ viewerId: b }).posts.some((x) => x.id === p), false);
  for (let i = 0; i < 20; i++) addPost(a, "geral", `p${i}`);
  const pg = listPosts({ viewerId: a, limit: 5 });
  assert.equal(pg.posts.length, 5);
  assert.equal(pg.more, true);
  const next = listPosts({ viewerId: a, limit: 5, before: pg.posts[4].id });
  assert.ok(next.posts[0].id < pg.posts[4].id);
});

test("denúncia de post e perfil (bio e foto)", () => {
  const a = mk("f6@t.com"), b = mk("f7@t.com");
  const p = addPost(a, "geral", "spam")!;
  const R = ["Spam ou divulgação"];
  assert.equal(reportPost(p, a, R[0], R), false);
  assert.equal(reportPost(p, b, "outro", R), false);
  assert.equal(reportPost(p, b, R[0], R), true);
  assert.equal(reportPost(p, b, R[0], R), false);
  const foto = img(a);
  assert.equal(saveCommunityProfile(a, "Investidor de dividendos", foto), true);
  assert.equal(saveCommunityProfile(b, "x", foto), false); // foto de outra pessoa
  assert.equal(saveCommunityProfile(a, "x".repeat(201), null), false);
  const m = getMember(a)!;
  assert.equal(m.bio, "Investidor de dividendos");
  assert.equal(m.avatarId, foto);
  assert.equal(saveCommunityProfile(a, "", null), true);
  assert.equal(getMember(a)!.avatarId, null);
});

test("áudio: só formatos reais, anexado só ao dono", () => {
  const a = mk("f8@t.com"), b = mk("f9@t.com");
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(30)]);
  assert.equal(sniffAudio(webm), "audio/webm");
  assert.equal(sniffAudio(Buffer.from("<script>alert(1)</script>")), null);
  assert.equal(saveAudio(a, Buffer.from("não é áudio de verdade")), null);
  const id = saveAudio(a, webm)!;
  assert.ok(id);
  const stolen = addMessage("geral", b, "oi", { audioId: id });
  assert.equal(listMessages("geral", b).find((m) => m.id === stolen)!.audioId, null);
  const ok = addMessage("geral", a, "", { audioId: id });
  assert.equal(listMessages("geral", a).find((m) => m.id === ok)!.audioId, id);
});
