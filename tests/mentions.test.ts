import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { mentionedUserIds, recordMentions, listMentions, unreadMentions, markMentionsRead } from "../src/lib/mentions";
import { addPost } from "../src/lib/feed";

function user(email: string, name: string, handle?: string): number {
  return Number(db().prepare("INSERT INTO users (email, name, password_hash, handle) VALUES (?, ?, 'x', ?)").run(email, name, handle ?? null).lastInsertRowid);
}

test("@usuario notifica só aquela pessoa; primeiro nome só vale se for único", () => {
  const autor = user("m-a@t.com", "Autor Teste", "autor_teste");
  const bia = user("m-b@t.com", "Beatriz Unica", "bia_unica");
  const j1 = user("m-j1@t.com", "Joaquim Repetido");
  const j2 = user("m-j2@t.com", "Joaquim Outro");
  const cle = user("m-c@t.com", "Clementina Rara");
  assert.deepEqual(mentionedUserIds("oi @bia_unica e @Clementina", autor).sort(), [bia, cle].sort());
  assert.deepEqual(mentionedUserIds("@Joaquim vem ver", autor), []); // ambíguo: ninguém é notificado
  assert.ok(!mentionedUserIds("@autor_teste", autor).length); // não notifica a si mesmo
  assert.ok(j1 && j2);
});

test("post com menção cria o aviso, que pode ser marcado como visto", () => {
  const autor = user("m-p1@t.com", "Paulo Autor", "paulo_autor");
  const alvo = user("m-p2@t.com", "Marcelo Alvo", "marcelo_alvo");
  const post = addPost(autor, "geral", "Olha isso @marcelo_alvo!");
  assert.ok(post);
  assert.equal(unreadMentions(alvo), 1);
  const [m] = listMentions(alvo);
  assert.equal(m.postId, post);
  assert.equal(m.kind, "post");
  markMentionsRead(alvo);
  assert.equal(unreadMentions(alvo), 0);
  recordMentions("sem marcação", autor, "comment", post!);
  assert.equal(unreadMentions(alvo), 0);
});
