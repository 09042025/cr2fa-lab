import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { createOrder, markPaid } from "../src/lib/orders";
import { listAll, listMine, setSessions } from "../src/lib/mentoria";
import { mentoriaPriceCents } from "../src/lib/plans";

test("mentoria: R$ 1.500 à parte, não muda o plano e vira mentoria ativa", () => {
  const uid = Number(db().prepare("INSERT INTO users (email, name, password_hash, role, plan) VALUES ('ment@x.com', 'Aluno', 'x', 'user', 'free')").run().lastInsertRowid);
  assert.equal(mentoriaPriceCents(), 150000);
  const o = createOrder({ userId: uid, period: "monthly", product: "mentoria", method: "mercadopago" });
  assert.equal(o.amount_cents, 150000);
  assert.equal(o.product, "mentoria");
  assert.equal(markPaid(o.id, { providerRef: "pay-1" }), true);
  assert.equal(markPaid(o.id), false); // idempotente
  const u = db().prepare("SELECT plan FROM users WHERE id = ?").get(uid) as { plan: string };
  assert.equal(u.plan, "free"); // continua Grátis
  assert.equal(listMine(uid).length, 1);
  assert.equal(listAll().length >= 1, true);
  const m = listMine(uid)[0];
  assert.equal(setSessions(m.id, 99), true);
  assert.equal(listMine(uid)[0].sessionsDone, 12);
  assert.equal(setSessions(m.id, -5), true);
  assert.equal(listMine(uid)[0].sessionsDone, 0);
});

test("plano Premium continua estendendo o plano normalmente", () => {
  const uid = Number(db().prepare("INSERT INTO users (email, name, password_hash, role, plan) VALUES ('prem@x.com', 'P', 'x', 'user', 'free')").run().lastInsertRowid);
  const o = createOrder({ userId: uid, period: "monthly", method: "crypto" });
  assert.equal(o.product, "premium");
  assert.equal(markPaid(o.id, { txHash: "0xabc" }), true);
  assert.equal((db().prepare("SELECT plan FROM users WHERE id = ?").get(uid) as { plan: string }).plan, "pro");
  assert.equal(listMine(uid).length, 0);
});

test("Plano Diamond: R$ 3.000, Premium vitalício + uma mentoria", async () => {
  const { diamondPriceCents } = await import("../src/lib/plans");
  const { hasDiamond } = await import("../src/lib/orders");
  const { effectivePlan } = await import("../src/lib/db");
  const uid = Number(db().prepare("INSERT INTO users (email, name, password_hash, role, plan, plan_expires_at) VALUES ('dia@x.com', 'D', 'x', 'user', 'pro', 1000)").run().lastInsertRowid);
  assert.equal(diamondPriceCents(), 300000);
  const o = createOrder({ userId: uid, period: "monthly", product: "diamond", method: "mercadopago" });
  assert.equal(o.amount_cents, 300000);
  assert.equal(hasDiamond(uid), false);
  assert.equal(markPaid(o.id, { providerRef: "pay-d" }), true);
  assert.equal(markPaid(o.id), false);
  const u = db().prepare("SELECT * FROM users WHERE id = ?").get(uid) as Parameters<typeof effectivePlan>[0] & { plan_expires_at: number | null };
  assert.equal(u.plan_expires_at, null); // vitalício
  assert.equal(effectivePlan(u), "pro");
  assert.equal(hasDiamond(uid), true);
  assert.equal(listMine(uid).length, 1); // uma mentoria, uma vez só
});
