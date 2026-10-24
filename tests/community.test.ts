import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { addMessage, canPost, deleteMessage, findChannel, listMessages, visibleCategories } from "../src/lib/community";

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
  assert.equal(canPost(findChannel("anuncios", false), pro), false);
  assert.equal(canPost(findChannel("anuncios", true), adm), true);
});

test("mensagens: listar em ordem e apagar só as próprias (admin apaga todas)", () => {
  const a = mk("c1@t.com"), b = mk("c2@t.com"), adm = mk("c3@t.com", "admin");
  const m1 = addMessage("geral", a, "oi");
  addMessage("geral", b, "olá");
  assert.deepEqual(listMessages("geral").map((m) => m.body), ["oi", "olá"]);
  assert.equal(deleteMessage(m1, { id: b, role: "user" }), false);
  assert.equal(deleteMessage(m1, { id: a, role: "user" }), true);
  const [rest] = listMessages("geral");
  assert.equal(deleteMessage(rest.id, { id: adm, role: "admin" }), true);
  assert.equal(listMessages("geral").length, 0);
});
