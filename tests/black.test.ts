import test from "node:test";
import assert from "node:assert/strict";
import { db, now } from "../src/lib/db";
import { createOrder, hasBlack, hasDiamond, markPaid } from "../src/lib/orders";
import { blackPriceCents } from "../src/lib/plans";
import { canBuyBlack, getInvite, inviteByEmail, requestInvite, setInvite } from "../src/lib/black";
import { createPresencial, register } from "../src/lib/events";

const mk = (email: string, role = "user") => Number(db().prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, 'x', ?)").run(email, email.split("@")[0], role).lastInsertRowid);

test("preço padrão do Diamond Black VIP é R$ 10.000,00", () => assert.equal(blackPriceCents(), 1_000_000));

test("convite: pedir, aprovar por e-mail e só então poder comprar", () => {
  const u = mk("bk1@x.com");
  assert.equal(canBuyBlack({ id: u, role: "user" }), false);
  requestInvite(u);
  assert.equal(getInvite(u), "requested");
  assert.equal(canBuyBlack({ id: u, role: "user" }), false);
  assert.equal(inviteByEmail("BK1@x.com"), true);
  assert.equal(canBuyBlack({ id: u, role: "user" }), true);
  assert.equal(setInvite(u, "declined"), true);
  assert.equal(canBuyBlack({ id: u, role: "user" }), false);
  assert.equal(inviteByEmail("naoexiste@x.com"), false);
  assert.equal(canBuyBlack({ id: 999, role: "admin" }), true);
});

test("pagamento Black: Premium por 12 meses, inclui Diamond e mentoria, idempotente", () => {
  const u = mk("bk2@x.com");
  const o = createOrder({ userId: u, period: "yearly", product: "black", method: "mercadopago" });
  assert.equal(o.amount_cents, 1_000_000);
  assert.equal(hasBlack(u), false);
  assert.equal(markPaid(o.id), true);
  assert.equal(markPaid(o.id), false);
  const row = db().prepare("SELECT plan, plan_expires_at FROM users WHERE id = ?").get(u) as { plan: string; plan_expires_at: number };
  assert.equal(row.plan, "pro");
  assert.ok(row.plan_expires_at > now() + 360 * 86400);
  assert.equal(hasBlack(u), true);
  assert.equal(hasDiamond(u), true);
  assert.equal((db().prepare("SELECT COUNT(*) c FROM mentorships WHERE user_id = ? AND kind = 'diamond'").get(u) as { c: number }).c, 1);
});

test("Black não encurta o Diamond vitalício", () => {
  const u = mk("bk3@x.com");
  markPaid(createOrder({ userId: u, period: "yearly", product: "diamond", method: "mercadopago" }).id);
  markPaid(createOrder({ userId: u, period: "yearly", product: "black", method: "mercadopago" }).id);
  const row = db().prepare("SELECT plan_expires_at FROM users WHERE id = ?").get(u) as { plan_expires_at: number | null };
  assert.equal(row.plan_expires_at, null);
  assert.equal((db().prepare("SELECT COUNT(*) c FROM mentorships WHERE user_id = ?").get(u) as { c: number }).c, 1);
});

test("Evento Diamond Black VIP: só Black (ou admin) se inscreve", () => {
  const admin = mk("bka@x.com", "admin"), pro = mk("bk4@x.com"), blk = mk("bk5@x.com");
  db().prepare("UPDATE users SET plan = 'pro' WHERE id = ?").run(pro);
  markPaid(createOrder({ userId: blk, period: "yearly", product: "black", method: "mercadopago" }).id);
  const ev = createPresencial(admin, { title: "Jantar Black", startsAt: now() + 86400, durationMin: 180, notes: "" }, { bannerId: null, location: "Restaurante X, São Paulo", costMode: "", costNote: "", capacity: null, approval: true, audience: "black" }) as { id: number };
  assert.ok(ev.id);
  assert.ok("error" in register(ev.id, { id: pro, role: "user", plan: "pro" }));
  assert.deepEqual(register(ev.id, { id: blk, role: "user", plan: "pro" }), { status: "pending" });
});
