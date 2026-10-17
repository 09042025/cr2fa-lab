import test from "node:test";
import assert from "node:assert/strict";
import { db, effectivePlan, now, type UserRow } from "../src/lib/db";
import { createOrder, markPaid, getOrder } from "../src/lib/orders";
import { periodSeconds, priceCents } from "../src/lib/plans";

function newUser(email: string): number {
  return Number(db().prepare("INSERT INTO users (email, name, password_hash) VALUES (?, 'T', 'x')").run(email).lastInsertRowid);
}
const user = (id: number) => db().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;

test("pagar libera o Pró e é idempotente", () => {
  const id = newUser("a@t.com");
  const order = createOrder({ userId: id, period: "monthly", method: "mercadopago" });
  assert.equal(order.amount_cents, priceCents("monthly"));
  assert.equal(effectivePlan(user(id)), "free");

  assert.equal(markPaid(order.id, { providerRef: "pay-1" }), true);
  assert.equal(markPaid(order.id, { providerRef: "pay-1" }), false); // webhook repetido não estende de novo
  const u = user(id);
  assert.equal(effectivePlan(u), "pro");
  const expected = now() + periodSeconds("monthly");
  assert.ok(Math.abs(u.plan_expires_at! - expected) < 5);
  assert.equal(getOrder(order.id)!.status, "paid");
});

test("renovar antes de vencer soma ao tempo restante", () => {
  const id = newUser("b@t.com");
  const o1 = createOrder({ userId: id, period: "monthly", method: "mercadopago" });
  markPaid(o1.id);
  const first = user(id).plan_expires_at!;
  const o2 = createOrder({ userId: id, period: "yearly", method: "mercadopago" });
  markPaid(o2.id);
  assert.equal(user(id).plan_expires_at, first + periodSeconds("yearly"));
});

test("o mesmo hash de transação não vale para dois pedidos", () => {
  const id = newUser("c@t.com");
  const o1 = createOrder({ userId: id, period: "monthly", method: "crypto", expiresInSec: 1800 });
  const o2 = createOrder({ userId: id, period: "monthly", method: "crypto", expiresInSec: 1800 });
  markPaid(o1.id, { txHash: "0xabc" });
  assert.throws(() => markPaid(o2.id, { txHash: "0xabc" }));
  assert.equal(getOrder(o2.id)!.status, "pending"); // transação desfeita
});

test("Pró expirado volta a ser grátis; admin é sempre Pró", () => {
  assert.equal(effectivePlan({ plan: "pro", plan_expires_at: now() - 10, role: "user" }), "free");
  assert.equal(effectivePlan({ plan: "free", plan_expires_at: null, role: "admin" }), "pro");
});
