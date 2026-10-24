import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { db, type UserRow } from "../src/lib/db";
import { ensureAdmin } from "../src/lib/bootstrap";

const admins = () => db().prepare("SELECT * FROM users WHERE role = 'admin'").all() as UserRow[];

test("cria o admin uma única vez, com troca de senha obrigatória", () => {
  process.env.ADMIN_EMAIL = "Dono@Exemplo.com";
  process.env.ADMIN_INITIAL_PASSWORD = "SenhaInicial2026";
  const logs: string[] = [];
  const first = ensureAdmin((m) => logs.push(m));
  assert.equal(first.created, true);
  assert.equal(admins().length, 1);
  const a = admins()[0];
  assert.equal(a.email, "dono@exemplo.com");
  assert.equal(a.must_change_password, 1);
  assert.equal(bcrypt.compareSync("SenhaInicial2026", a.password_hash), true);
  assert.equal(logs.some((l) => l.includes("SenhaInicial2026")), false); // senha informada nunca vai para o log

  assert.equal(ensureAdmin(() => {}).created, false); // reinício do servidor não cria outro
  assert.equal(admins().length, 1);
});

test("senha curta é recusada e sem senha gera uma aleatória no log", () => {
  db().prepare("DELETE FROM users WHERE role = 'admin'").run();
  process.env.ADMIN_INITIAL_PASSWORD = "curta";
  assert.equal(ensureAdmin(() => {}).created, false);
  assert.equal(admins().length, 0);

  process.env.ADMIN_INITIAL_PASSWORD = "";
  const logs: string[] = [];
  assert.equal(ensureAdmin((m) => logs.push(m)).created, true);
  assert.ok(logs.some((l) => l.includes("Senha inicial")));
  assert.equal(admins()[0].must_change_password, 1);
});

test("e-mail do admin com < > é limpo", () => {
  db().prepare("DELETE FROM users WHERE role = 'admin'").run();
  process.env.ADMIN_EMAIL = " <Dono2@Exemplo.com> ";
  process.env.ADMIN_INITIAL_PASSWORD = "SenhaInicial2026";
  assert.equal(ensureAdmin(() => {}).email, "dono2@exemplo.com");
  assert.equal(admins()[0].email, "dono2@exemplo.com");
});
