import test from "node:test";
import assert from "node:assert/strict";
import { db, now } from "../src/lib/db";
import { dueReminders, runReminders } from "../src/lib/reminders";

const DAY = 86400;
function proUser(email: string, expiresIn: number, role = "user"): number {
  return Number(
    db().prepare("INSERT INTO users (email, name, password_hash, role, plan, plan_expires_at) VALUES (?, 'Ana Souza', 'x', ?, 'pro', ?)").run(email, role, now() + expiresIn).lastInsertRowid,
  );
}
const mine = (id: number) => dueReminders().filter((d) => d.user.id === id);

test("avisa a 7 dias, e de novo a 1 dia, uma vez cada", async () => {
  const id = proUser("l1@t.com", 6 * DAY);
  assert.equal(mine(id)[0].stage, 1);
  const sent: string[] = [];
  const send = async (to: string, m: { subject: string }) => void sent.push(`${to}|${m.subject}`);
  await runReminders(send);
  assert.equal(sent.filter((s) => s.startsWith("l1@t.com")).length, 1);
  assert.equal(mine(id).length, 0); // não repete a etapa 1

  db().prepare("UPDATE users SET plan_expires_at = ? WHERE id = ?").run(now() + DAY / 2, id);
  assert.equal(mine(id)[0].stage, 2);
  await runReminders(send);
  assert.equal(sent.filter((s) => s.startsWith("l1@t.com")).length, 2);
  assert.equal(mine(id).length, 0);
});

test("não avisa quem vence depois de 7 dias, já venceu, é admin ou é grátis", () => {
  const far = proUser("l2@t.com", 20 * DAY);
  const expired = proUser("l3@t.com", -DAY);
  const admin = proUser("l4@t.com", 3 * DAY, "admin");
  assert.equal(mine(far).length + mine(expired).length + mine(admin).length, 0);
  const free = Number(db().prepare("INSERT INTO users (email, name, password_hash) VALUES ('l5@t.com', 'F', 'x')").run().lastInsertRowid);
  assert.equal(mine(free).length, 0);
});

test("renovar zera o ciclo e o aviso volta no novo vencimento", async () => {
  const id = proUser("l6@t.com", 5 * DAY);
  await runReminders(async () => {});
  assert.equal(mine(id).length, 0);
  db().prepare("UPDATE users SET plan_expires_at = ? WHERE id = ?").run(now() + 36 * DAY, id); // renovou
  assert.equal(mine(id).length, 0);
  db().prepare("UPDATE users SET plan_expires_at = ? WHERE id = ?").run(now() + 4 * DAY, id); // outro mês, perto de vencer de novo
  assert.equal(mine(id)[0].stage, 1);
});

test("se o e-mail falhar, tenta de novo depois", async () => {
  const id = proUser("l7@t.com", 4 * DAY);
  await runReminders(async () => { throw new Error("falhou"); });
  assert.equal(mine(id).length, 1);
  await runReminders(async () => {});
  assert.equal(mine(id).length, 0);
});
