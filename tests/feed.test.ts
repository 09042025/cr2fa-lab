import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { addMessage, listMessages, saveAudio, sniffAudio } from "../src/lib/community";
import { listFollows, pinnedPostId, setPinned, addComment, addPost, cleanWebsite, defaultHandle, deletePost, getMember, listPosts, reportPost, saveCommunityProfile, setFollow, toggleLike } from "../src/lib/feed";
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
  const base = { bio: "Investidor de dividendos", avatarId: foto, bannerId: null, handle: "@Bia_Invest", location: "São Paulo", website: "bia.com.br" };
  assert.equal(saveCommunityProfile(a, base), null);
  assert.match(saveCommunityProfile(b, { ...base, handle: "outra" })!, /sua/); // foto de outra pessoa
  assert.match(saveCommunityProfile(b, { ...base, avatarId: null, handle: "bia_invest" })!, /em uso/);
  assert.match(saveCommunityProfile(a, { ...base, bio: "x".repeat(161) })!, /160/);
  assert.match(saveCommunityProfile(a, { ...base, handle: "a b" })!, /usuário/);
  assert.match(saveCommunityProfile(a, { ...base, website: "javascript:alert(1)" })!, /link/);
  const m = getMember(a)!;
  assert.equal(m.bio, "Investidor de dividendos");
  assert.equal(m.handle, "bia_invest");
  assert.equal(m.website, "https://bia.com.br/");
  assert.equal(m.avatarId, foto);
  assert.equal(saveCommunityProfile(a, { ...base, avatarId: null, handle: "", website: "" }), null);
  assert.equal(getMember(a)!.avatarId, null);
  assert.equal(getMember(a)!.handle, defaultHandle("Bia", a));
});

test("seguir: contagens e filtro do feed", () => {
  const a = mk("f10@t.com"), b = mk("f11@t.com");
  addPost(a, "geral", "post do A");
  addPost(b, "geral", "post do B");
  assert.equal(setFollow(a, a, true), false);
  assert.equal(setFollow(b, a, true), true);
  assert.equal(getMember(a, b)!.followers, 1);
  assert.equal(getMember(a, b)!.iFollow, true);
  assert.equal(getMember(b, b)!.following, 1);
  assert.deepEqual(listPosts({ viewerId: b, following: true }).posts.map((p) => p.author), ["Bia"]);
  setFollow(b, a, false);
  assert.equal(listPosts({ viewerId: b, following: true }).posts.length, 0);
  assert.equal(cleanWebsite("https://x.com/a"), "https://x.com/a");
  assert.equal(cleanWebsite("ftp://x.com"), null);
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

test("fixar publicação no perfil e listas de seguidores", () => {
  const a = mk("f12@t.com", "Ana"), b = mk("f13@t.com", "Beto");
  const p1 = addPost(a, "geral", "primeiro")!, p2 = addPost(a, "geral", "segundo")!;
  const pb = addPost(b, "geral", "do Beto")!;
  assert.equal(setPinned(a, pb, true), false); // só post próprio
  assert.equal(setPinned(a, p1, true), true);
  assert.equal(setPinned(a, p2, true), true); // só um fixado: troca
  assert.equal(pinnedPostId(a), p2);
  assert.equal(listPosts({ viewerId: b, authorId: a, onlyId: p2 }).posts[0].pinned, true);
  assert.deepEqual(listPosts({ viewerId: b, authorId: a, excludeId: p2 }).posts.map((p) => p.id), [p1]);
  deletePost(p2, { id: a, role: "user" });
  assert.equal(pinnedPostId(a), null); // apagou o fixado: solta
  setPinned(a, p1, true);
  assert.equal(setPinned(a, p1, false), true);
  assert.equal(pinnedPostId(a), null);
  setFollow(b, a, true);
  assert.deepEqual(listFollows(a, "followers", a).map((f) => f.name), ["Beto"]);
  assert.deepEqual(listFollows(b, "following", b).map((f) => f.name), ["Ana"]);
  assert.equal(listFollows(b, "following", b)[0].iFollow, true);
});
