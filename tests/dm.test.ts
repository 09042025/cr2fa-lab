import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { saveImage, setBlocked } from "../src/lib/community";
import { deleteDm, listConversation, listConversations, privateMediaAllowed, searchMembers, sendDm, unreadCount } from "../src/lib/dm";

const user = (email: string, name: string, role = "user") =>
  Number(db().prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, 'x', ?)").run(email, name, role).lastInsertRowid);
// PNG mínimo válido para o teste
const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082", "hex");

test("mensagens diretas: envio, leitura, não lidas e lista de conversas", () => {
  const a = user("dm-a@t.com", "Ana Souza"), b = user("dm-b@t.com", "Bruno Lima");
  assert.equal(sendDm(a, a, "oi").ok, false);
  assert.equal(sendDm(a, b, "   ").ok, false);
  assert.equal(sendDm(a, 999999, "oi").ok, false);
  assert.ok(sendDm(a, b, "Oi Bruno").ok);
  assert.ok(sendDm(a, b, "Viu o Bitcoin?").ok);
  assert.equal(unreadCount(b), 2);
  assert.equal(listConversations(b)[0].unread, 2);
  assert.equal(listConversations(b)[0].name, "Ana Souza");
  const msgs = listConversation(b, a);
  assert.deepEqual(msgs.map((m) => m.body), ["Oi Bruno", "Viu o Bitcoin?"]);
  assert.equal(unreadCount(b), 0);
  assert.equal(listConversations(a)[0].lastMine, true);
});

test("mensagens diretas: bloqueio, banimento e exclusão", () => {
  const a = user("dm-c@t.com", "Carla"), b = user("dm-d@t.com", "Davi"), adm = user("dm-e@t.com", "Admin", "admin");
  assert.ok(setBlocked(b, a, true));
  assert.equal(sendDm(a, b, "oi").ok, false);
  assert.equal(sendDm(b, a, "oi").ok, false);
  assert.ok(sendDm(a, adm, "preciso de ajuda").ok); // administrador sempre pode receber
  db().prepare("UPDATE users SET community_banned = 1 WHERE id = ?").run(a);
  assert.equal(sendDm(a, adm, "oi").ok, false);
  const r = sendDm(adm, b, "aviso");
  assert.ok(r.ok);
  assert.equal(deleteDm(r.ok ? r.id : 0, a), false); // só o autor apaga
  assert.equal(deleteDm(r.ok ? r.id : 0, adm), true);
});

test("mensagens diretas: imagem é privada e só abre para quem conversa", () => {
  const a = user("dm-f@t.com", "Eva"), b = user("dm-g@t.com", "Fábio"), c = user("dm-h@t.com", "Gil");
  const pub = saveImage(a, PNG)!;
  assert.equal(sendDm(a, b, "", { imageId: pub }).ok, false); // imagem pública não vale
  const img = saveImage(a, PNG, true)!;
  assert.equal(sendDm(b, a, "", { imageId: img }).ok, false); // não é do remetente
  assert.equal(privateMediaAllowed("image", img, c), false);
  assert.ok(sendDm(a, b, "", { imageId: img }).ok);
  assert.equal(sendDm(a, b, "", { imageId: img }).ok, false); // não reaproveita
  assert.equal(privateMediaAllowed("image", img, a), true);
  assert.equal(privateMediaAllowed("image", img, b), true);
  assert.equal(privateMediaAllowed("image", img, c), false);
  assert.equal(privateMediaAllowed("image", pub, c), null); // pública: regra normal
});

test("busca de membros ignora o próprio usuário e termos curtos", () => {
  const a = user("dm-i@t.com", "Helena Prado"), b = user("dm-j@t.com", "Helio Prado");
  assert.deepEqual(searchMembers(a, "h"), []);
  assert.ok(searchMembers(a, "Prado").some((m) => m.id === b));
  assert.ok(!searchMembers(a, "Prado").some((m) => m.id === a));
});
