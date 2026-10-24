import test from "node:test";
import assert from "node:assert/strict";
import { db, now, type UserRow } from "../src/lib/db";
import { verifyPassword } from "../src/lib/auth";
import { consumeResetToken, createResetToken, isResetTokenValid, RESET_TTL_SECONDS } from "../src/lib/reset";
import { resetEmail } from "../src/lib/mail";

function newUser(email: string): number {
  return Number(db().prepare("INSERT INTO users (email, name, password_hash, must_change_password) VALUES (?, 'Maria Silva', 'x', 1)").run(email).lastInsertRowid);
}
const user = (id: number) => db().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;

test("o token troca a senha uma única vez", async () => {
  const id = newUser("r1@t.com");
  const token = createResetToken(id);
  assert.equal(isResetTokenValid(token), true);
  assert.equal(await consumeResetToken(token, "NovaSenha123"), true);
  assert.equal(await verifyPassword("NovaSenha123", user(id).password_hash), true);
  assert.equal(user(id).must_change_password, 0);
  assert.equal(await consumeResetToken(token, "OutraSenha456"), false); // não reaproveita
  assert.equal(await verifyPassword("NovaSenha123", user(id).password_hash), true);
});

test("link novo invalida o anterior", async () => {
  const id = newUser("r2@t.com");
  const first = createResetToken(id);
  const second = createResetToken(id);
  assert.equal(isResetTokenValid(first), false);
  assert.equal(isResetTokenValid(second), true);
});

test("token expirado ou inventado não funciona", async () => {
  const id = newUser("r3@t.com");
  const token = createResetToken(id);
  db().prepare("UPDATE password_resets SET expires_at = ? WHERE user_id = ?").run(now() - 1, id);
  assert.equal(isResetTokenValid(token), false);
  assert.equal(await consumeResetToken(token, "NovaSenha123"), false);
  assert.equal(isResetTokenValid("abc"), false);
  assert.equal(isResetTokenValid("a".repeat(64)), false);
  assert.ok(RESET_TTL_SECONDS === 3600);
});

test("o banco guarda só o hash do token", () => {
  const id = newUser("r4@t.com");
  const token = createResetToken(id);
  const rows = db().prepare("SELECT token_hash FROM password_resets WHERE user_id = ?").all(id) as { token_hash: string }[];
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].token_hash, token);
});

test("o e-mail leva o link e escapa o conteúdo", () => {
  const mail = resetEmail("<b>Maria</b> Silva", "https://x.com.br/redefinir-senha?token=abc");
  assert.ok(mail.text.includes("https://x.com.br/redefinir-senha?token=abc"));
  assert.ok(!mail.html.includes("<b>Maria</b>"));
});
