import test from "node:test";
import assert from "node:assert/strict";
import { db, type UserRow } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { profileSchema, updateProfile } from "../src/lib/account";

async function newUser(email: string): Promise<number> {
  return Number(db().prepare("INSERT INTO users (email, name, password_hash) VALUES (?, 'Ana', ?)").run(email, await hashPassword("SenhaBoa12345")).lastInsertRowid);
}
const row = (id: number) => db().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
const input = (o: Partial<{ name: string; email: string; currentPassword: string }>) => profileSchema.parse({ name: "Ana Souza", email: "a1@t.com", ...o });

test("trocar só o nome não pede senha", async () => {
  const id = await newUser("a1@t.com");
  const r = await updateProfile(id, input({ name: "Ana Maria" }));
  assert.ok(r.ok && !r.emailChanged);
  assert.equal(row(id).name, "Ana Maria");
});

test("trocar o e-mail exige a senha atual correta", async () => {
  const id = await newUser("b1@t.com");
  const novo = "b2@t.com";
  const semSenha = await updateProfile(id, input({ email: novo }));
  assert.ok(!semSenha.ok && semSenha.status === 400);
  const errada = await updateProfile(id, input({ email: novo, currentPassword: "SenhaErrada999" }));
  assert.ok(!errada.ok && errada.status === 401);
  assert.equal(row(id).email, "b1@t.com");
  const certa = await updateProfile(id, input({ email: novo, currentPassword: "SenhaBoa12345" }));
  assert.ok(certa.ok && certa.emailChanged);
  assert.equal(row(id).email, novo);
});

test("não deixa usar o e-mail de outra conta", async () => {
  await newUser("c1@t.com");
  const id = await newUser("c2@t.com");
  const r = await updateProfile(id, input({ email: "C1@T.com", currentPassword: "SenhaBoa12345" }));
  assert.ok(!r.ok && r.status === 409);
  assert.equal(row(id).email, "c2@t.com");
});

test("valida nome e e-mail", () => {
  assert.equal(profileSchema.safeParse({ name: "A", email: "x@t.com" }).success, false);
  assert.equal(profileSchema.safeParse({ name: "Ana", email: "invalido" }).success, false);
});

import { createOrder, markPaid } from "../src/lib/orders";
import { deleteUserAccount } from "../src/lib/account";

test("administrador exclui uma conta comum com o e-mail certo, e os dados dela vão junto", async () => {
  const id = await newUser("d1@t.com");
  markPaid(createOrder({ userId: id, period: "monthly", method: "mercadopago" }).id);
  db().prepare("INSERT INTO holdings (user_id, block, label, value_cents) VALUES (?, 'acoes', 'X', 100)").run(id);

  const errado = deleteUserAccount(id, "outro@t.com");
  assert.ok(!errado.ok && errado.status === 400);
  assert.ok(row(id)); // nada foi apagado

  const ok = deleteUserAccount(id, "D1@T.com");
  assert.ok(ok.ok && ok.paidOrders === 1);
  assert.equal(row(id), undefined);
  assert.equal((db().prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?").get(id) as { n: number }).n, 0);
  assert.equal((db().prepare("SELECT COUNT(*) AS n FROM holdings WHERE user_id = ?").get(id) as { n: number }).n, 0);
});

test("não exclui administrador nem usuário inexistente", async () => {
  const admin = Number(db().prepare("INSERT INTO users (email, name, password_hash, role) VALUES ('d2@t.com', 'Adm', 'x', 'admin')").run().lastInsertRowid);
  const r = deleteUserAccount(admin, "d2@t.com");
  assert.ok(!r.ok && r.status === 403);
  assert.ok(row(admin));
  const nada = deleteUserAccount(999999, "x@t.com");
  assert.ok(!nada.ok && nada.status === 404);
});
