import test from "node:test";
import assert from "node:assert/strict";
import { db, effectivePlan, now, type UserRow } from "../src/lib/db";
import { createOrder, markPaid } from "../src/lib/orders";
import { onTrial, startTrial, trialAvailable, trialDays } from "../src/lib/trial";
import { runReminders } from "../src/lib/reminders";
import { renewalEmail } from "../src/lib/mail";

const DAY = 86400;
function newUser(email: string, role = "user"): number {
  return Number(db().prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, 'Joana Lima', 'x', ?)").run(email, role).lastInsertRowid);
}
const row = (id: number) => db().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;

test("o teste libera o Pró por 30 dias, uma vez só", () => {
  const id = newUser("t1@t.com");
  assert.equal(trialAvailable(row(id)), true);
  const r = startTrial(id);
  assert.ok(r.ok);
  assert.equal(trialDays(), 30);
  assert.ok(Math.abs(row(id).plan_expires_at! - (now() + 30 * DAY)) < 5);
  assert.equal(effectivePlan(row(id)), "pro");
  assert.equal(onTrial(row(id)), true);
  assert.equal(trialAvailable(row(id)), false);
  assert.equal(startTrial(id).ok, false); // segunda vez não vale
});

test("acabou o teste: volta ao Grátis e não ganha outro", () => {
  const id = newUser("t2@t.com");
  startTrial(id);
  db().prepare("UPDATE users SET plan_expires_at = ?, trial_ends_at = ? WHERE id = ?").run(now() - 10, now() - 10, id);
  assert.equal(effectivePlan(row(id)), "free");
  assert.equal(onTrial(row(id)), false);
  assert.equal(trialAvailable(row(id)), false);
  assert.equal(startTrial(id).ok, false);
});

test("quem já pagou ou é administrador não tem teste", () => {
  const paid = newUser("t3@t.com");
  markPaid(createOrder({ userId: paid, period: "monthly", method: "mercadopago" }).id);
  db().prepare("UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE id = ?").run(paid); // assinatura antiga venceu
  assert.equal(trialAvailable(row(paid)), false);
  assert.equal(startTrial(paid).ok, false);
  const admin = newUser("t4@t.com", "admin");
  assert.equal(trialAvailable(row(admin)), false);
});

test("pagar durante o teste soma ao tempo que resta e deixa de ser teste", () => {
  const id = newUser("t5@t.com");
  startTrial(id);
  const trialEnd = row(id).trial_ends_at!;
  markPaid(createOrder({ userId: id, period: "monthly", method: "mercadopago" }).id);
  assert.ok(row(id).plan_expires_at! > trialEnd + 30 * DAY);
  assert.equal(onTrial(row(id)), false);
});

test("o lembrete do teste usa o texto do teste", async () => {
  const id = newUser("t6@t.com");
  startTrial(id);
  db().prepare("UPDATE users SET plan_expires_at = ?, trial_ends_at = ? WHERE id = ?").run(now() + 5 * DAY, now() + 5 * DAY, id);
  const subjects: string[] = [];
  await runReminders(async (to, m) => { if (to === "t6@t.com") subjects.push(m.subject); });
  assert.equal(subjects.length, 1);
  assert.ok(subjects[0].includes("teste grátis"));
  const normal = renewalEmail("Joana", 5, new Date(), "https://x.com.br/planos", false);
  assert.ok(!normal.subject.includes("teste"));
});
