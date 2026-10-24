import test from "node:test";
import assert from "node:assert/strict";
import { db, effectivePlan, now, type UserRow } from "../src/lib/db";
import { createInvite, getInviteByCode, inviteStatus, redeemInvite, revokeInvite } from "../src/lib/invites";
import { inviteEmail } from "../src/lib/mail";

const mk = (email: string, role = "user") => Number(db().prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, 'Lia', 'x', ?)").run(email, role).lastInsertRowid);
const row = (id: number) => db().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;

test("convite VIP libera o Pró por N dias e só vale uma vez", () => {
  const adm = mk("i1@t.com", "admin"), u = mk("i2@t.com"), v = mk("i3@t.com");
  const inv = createInvite(adm, { days: 90, validDays: 7, note: "Boas-vindas" });
  assert.equal(inviteStatus(inv), "pendente");
  assert.ok(inv.code.length >= 20);
  const r = redeemInvite(inv.code, u);
  assert.ok(r.ok);
  assert.equal(effectivePlan(row(u)), "pro");
  assert.ok(Math.abs(row(u).plan_expires_at! - (now() + 90 * 86400)) < 5);
  assert.equal(inviteStatus(getInviteByCode(inv.code)!), "usado");
  assert.equal(getInviteByCode(inv.code)!.redeemedByName, "Lia");
  assert.equal(redeemInvite(inv.code, v).ok, false); // uso único
});

test("convite nominal só vale para o e-mail certo; admin não usa; soma ao tempo restante", () => {
  const adm = mk("i4@t.com", "admin"), alvo = mk("i5@t.com"), outro = mk("i6@t.com");
  const inv = createInvite(adm, { email: "I5@T.com", days: 30, validDays: 7 });
  const bad = redeemInvite(inv.code, outro);
  assert.equal(bad.ok, false);
  assert.equal(effectivePlan(row(outro)), "free");
  assert.equal(redeemInvite(inv.code, adm).ok, false);
  // já tinha 10 dias de Pró: soma
  db().prepare("UPDATE users SET plan = 'pro', plan_expires_at = ? WHERE id = ?").run(now() + 10 * 86400, alvo);
  const ok = redeemInvite(inv.code, alvo);
  assert.ok(ok.ok);
  assert.ok(Math.abs(row(alvo).plan_expires_at! - (now() + 40 * 86400)) < 5);
});

test("convite cancelado, expirado ou inválido não funciona", () => {
  const adm = mk("i7@t.com", "admin"), u = mk("i8@t.com");
  const a = createInvite(adm, { days: 30, validDays: 7 });
  assert.equal(revokeInvite(a.id), true);
  assert.equal(inviteStatus(getInviteByCode(a.code)!), "revogado");
  assert.equal(redeemInvite(a.code, u).ok, false);
  const b = createInvite(adm, { days: 30, validDays: 7 });
  db().prepare("UPDATE vip_invites SET expires_at = ? WHERE id = ?").run(now() - 5, b.id);
  assert.equal(inviteStatus(getInviteByCode(b.code)!), "expirado");
  assert.equal(redeemInvite(b.code, u).ok, false);
  assert.equal(redeemInvite("codigo-que-nao-existe-123456", u).ok, false);
  assert.equal(getInviteByCode("curto"), null);
  assert.equal(effectivePlan(row(u)), "free");
});

test("e-mail do convite mostra a duração e o link", () => {
  const m = inviteEmail("Lia Souza", 365, "https://x.com/convite/abc", "Oi <b>");
  assert.match(m.text, /1 ano/);
  assert.match(m.html, /https:\/\/x\.com\/convite\/abc/);
  assert.ok(!m.html.includes("<b>")); // recado escapado
});
