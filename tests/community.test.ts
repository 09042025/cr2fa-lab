import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { addMessage, editMessage, listBlocked, listReports, reportMessage, setBlocked, canPost, deleteMessage, findChannel, isBanned, listMessages, saveImage, setBanned, sniffImage, splitMentions, toggleReaction, visibleCategories } from "../src/lib/community";

const mk = (email: string, role = "user") => Number(db().prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, 'Ana', 'x', ?)").run(email, role).lastInsertRowid);

test("canal de moderação só aparece para admin", () => {
  assert.ok(!visibleCategories(false).some((c) => c.channels.some((x) => x.slug === "moderador")));
  assert.ok(visibleCategories(true).some((c) => c.channels.some((x) => x.slug === "moderador")));
  assert.equal(findChannel("moderador", false).slug, "chat-geral");
});

test("permissões de escrita", () => {
  const pro = { role: "user", plan: "pro" }, free = { role: "user", plan: "free" }, adm = { role: "admin", plan: "pro" };
  assert.equal(canPost(findChannel("chat-geral", false), pro), true);
  assert.equal(canPost(findChannel("chat-geral", false), free), false);
  assert.equal(canPost(findChannel("geral", false), free), false);
  assert.equal(canView(findChannel("geral", false), free), false);
  assert.equal(canView(findChannel("chat-geral", false), free), false);
  assert.equal(canView(findChannel("geral", false), pro), true);
  assert.equal(canPost(findChannel("anuncios", false), pro), false);
  assert.equal(canPost(findChannel("anuncios", true), adm), true);
});

test("mensagens: listar em ordem e apagar só as próprias (admin apaga todas)", () => {
  const a = mk("c1@t.com"), b = mk("c2@t.com"), adm = mk("c3@t.com", "admin");
  const m1 = addMessage("geral", a, "oi");
  addMessage("geral", b, "olá");
  assert.deepEqual(listMessages("geral", 0).map((m) => m.body), ["oi", "olá"]);
  assert.equal(deleteMessage(m1, { id: b, role: "user" }), false);
  assert.equal(deleteMessage(m1, { id: a, role: "user" }), true);
  const [rest] = listMessages("geral", 0);
  assert.equal(deleteMessage(rest.id, { id: adm, role: "admin" }), true);
  assert.equal(listMessages("geral", 0).length, 0);
});

test("resposta, imagem e reações", () => {
  const a = mk("c4@t.com"), b = mk("c5@t.com");
  const m1 = addMessage("geral", a, "pergunta");
  const png = Buffer.concat([Buffer.from([0x89]), Buffer.from("PNG\r\n\x1a\n"), Buffer.alloc(20)]);
  const img = saveImage(b, png)!;
  assert.ok(img);
  assert.equal(saveImage(b, Buffer.from("<script>alert(1)</script>")), null);
  const m2 = addMessage("geral", b, "resposta", { replyTo: m1, imageId: img });
  assert.equal(addMessage("geral", a, "roubo", { imageId: img }) > 0, true); // imagem de outro não é anexada
  const list = listMessages("geral", b);
  const r = list.find((m) => m.id === m2)!;
  assert.equal(r.reply?.author, "Ana");
  assert.equal(r.imageId, img);
  assert.equal(list.find((m) => m.body === "roubo")!.imageId, null);
  assert.equal(addMessage("chat-geral", a, "x", { replyTo: m1 }) > 0, true);
  assert.equal(listMessages("chat-geral", a).find((m) => m.body === "x")!.reply, null); // resposta só no mesmo canal
  assert.equal(toggleReaction(m2, a, "🔥"), true);
  assert.equal(toggleReaction(m2, a, "💣"), false);
  assert.deepEqual(listMessages("geral", a).find((m) => m.id === m2)!.reactions, [{ emoji: "🔥", count: 1, mine: true }]);
  toggleReaction(m2, a, "🔥");
  assert.equal(listMessages("geral", a).find((m) => m.id === m2)!.reactions.length, 0);
  assert.equal(sniffImage(png), "image/png");
});

test("banir: só admin, não bane admin nem a si mesmo", () => {
  const u = mk("c6@t.com"), adm = mk("c7@t.com", "admin"), adm2 = mk("c8@t.com", "admin");
  assert.equal(setBanned({ id: u, role: "user" }, adm, true), false);
  assert.equal(setBanned({ id: adm, role: "admin" }, adm2, true), false);
  assert.equal(setBanned({ id: adm, role: "admin" }, adm, true), false);
  assert.equal(setBanned({ id: adm, role: "admin" }, u, true), true);
  assert.equal(isBanned(u), true);
  setBanned({ id: adm, role: "admin" }, u, false);
  assert.equal(isBanned(u), false);
});

test("menções são destacadas", () => {
  assert.deepEqual(splitMentions("oi @Ana, tudo?").map((t) => t.mention), [false, true, false]);
});

test("editar: só o autor", () => {
  const a = mk("c9@t.com"), b = mk("c10@t.com");
  const m = addMessage("geral", a, "texto");
  assert.equal(editMessage(m, b, "hack"), false);
  assert.equal(editMessage(m, a, "novo"), true);
  const row = listMessages("geral", a).find((x) => x.id === m)!;
  assert.equal(row.body, "novo");
  assert.equal(row.edited, true);
  assert.equal(editMessage(m, a, "   "), false);
});

test("denunciar e bloquear", () => {
  const a = mk("c11@t.com"), b = mk("c12@t.com"), adm = mk("c13@t.com", "admin");
  const m = addMessage("geral", a, "spam aqui");
  assert.equal(reportMessage(m, a, "Spam ou divulgação"), false); // não denuncia a si mesmo
  assert.equal(reportMessage(m, b, "motivo inventado"), false);
  assert.equal(reportMessage(m, b, "Spam ou divulgação"), true);
  assert.equal(reportMessage(m, b, "Spam ou divulgação"), false); // uma por pessoa
  assert.ok(listReports().some((r) => r.messageId === m && r.reporter === "Ana"));
  assert.equal(listMessages("geral", b).some((x) => x.id === m), true);
  assert.equal(setBlocked(b, a, true), true);
  assert.equal(listMessages("geral", b).some((x) => x.id === m), false); // some só para quem bloqueou
  assert.equal(listMessages("geral", adm).some((x) => x.id === m), true);
  assert.equal(listBlocked(b).length, 1);
  assert.equal(setBlocked(b, adm, true), false); // admin não é bloqueável
  assert.equal(setBlocked(b, b, true), false);
  setBlocked(b, a, false);
  assert.equal(listMessages("geral", b).some((x) => x.id === m), true);
});

import { canView, shortUrl, splitRich } from "../src/lib/community";
test("links no texto: clicáveis, sem a pontuação final e só http(s)", () => {
  const t = splitRich("veja https://www.youtube.com/channel/UCUSH?sub=1, e @Ana javascript:alert(1) http://x.com).");
  const links = t.filter((x) => x.type === "link");
  assert.deepEqual(links.map((l) => (l as { href: string }).href), ["https://www.youtube.com/channel/UCUSH?sub=1", "http://x.com/"]);
  assert.ok(t.some((x) => x.type === "mention" && x.text === "@Ana"));
  assert.ok(!t.some((x) => x.type === "link" && /javascript/i.test(x.text)));
  assert.equal(shortUrl("https://www.youtube.com/channel/UCUSHyyzS1LKDntU9uKYaPGg?sub_confirmation=1", 30).length, 30);
});
