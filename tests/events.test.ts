import test from "node:test";
import assert from "node:assert/strict";
import { db, now } from "../src/lib/db";
import { cancel, checkIn, cleanDetails, counts, createPresencial, decide, getRsvp, getRsvpByCode, register, type EventInput } from "../src/lib/events";
import { roomMeetings } from "../src/lib/agenda";

const mk = (email: string, role = "user", plan = "pro") =>
  ({ id: Number(db().prepare("INSERT INTO users (email, name, password_hash, role, plan) VALUES (?, ?, 'x', ?, ?)").run(email, email.split("@")[0], role, plan).lastInsertRowid), role, plan });
const base = (o: Partial<EventInput> = {}): EventInput => ({ bannerId: null, location: "Bar do Zé, Rua A 100, São Paulo", costMode: "each", costNote: "", capacity: null, approval: false, audience: "premium", ...o });
const ev = (admin: { id: number }, d: EventInput) => {
  const r = createPresencial(admin.id, { title: "Encontro", startsAt: now() + 86400, durationMin: 120, notes: "" }, d);
  assert.ok(!("error" in r), "error" in r ? r.error : "");
  return (r as { id: number }).id;
};

test("regras de cadastro: endereço e custo obrigatórios (exceto VIP com aprovação)", () => {
  assert.ok("error" in cleanDetails(base({ location: "bar" })));
  assert.ok("error" in cleanDetails(base({ costMode: "" })));
  assert.ok("error" in cleanDetails(base({ costMode: "ticket", costNote: "" })));
  assert.ok("data" in cleanDetails(base({ costMode: "ticket", costNote: "R$ 50 por pessoa" })));
  assert.ok("data" in cleanDetails(base({ costMode: "", approval: true, audience: "diamond" })));
});

test("inscrição aberta confirma; lotado vai para espera; cancelar promove", () => {
  const admin = mk("ea@x.com", "admin"), u1 = mk("e1@x.com"), u2 = mk("e2@x.com");
  const id = ev(admin, base({ capacity: 1 }));
  assert.deepEqual(register(id, u1), { status: "confirmed" });
  assert.deepEqual(register(id, u2), { status: "waitlist" });
  assert.equal(counts(id).confirmed, 1);
  assert.equal(cancel(id, u1.id), true);
  assert.equal(getRsvp(id, u2.id)?.status, "confirmed");
});

test("Free não se inscreve; VIP exige aprovação do admin; Diamond restringe público", () => {
  const admin = mk("eb@x.com", "admin"), free = mk("f@x.com", "user", "free"), p = mk("p@x.com");
  const open = ev(admin, base());
  assert.ok("error" in register(open, free));
  const vip = ev(admin, base({ costMode: "", approval: true, capacity: 10 }));
  assert.deepEqual(register(vip, p), { status: "pending" });
  const r = getRsvp(vip, p.id)!;
  assert.equal(checkIn(r.code).ok, false);
  assert.equal(decide(r.id, "confirmed"), true);
  const dia = ev(admin, base({ audience: "diamond", approval: true }));
  assert.ok("error" in register(dia, p));
});

test("check-in: só confirmado e só uma vez", () => {
  const admin = mk("ec@x.com", "admin"), u = mk("c@x.com");
  const id = ev(admin, base());
  register(id, u);
  const code = getRsvp(id, u.id)!.code;
  assert.equal(checkIn(code).ok, true);
  assert.equal(checkIn(code).ok, false);
  assert.equal(checkIn("naoexiste").ok, false);
  assert.ok(getRsvpByCode(code)?.checkedInAt);
});

test("eventos presenciais não entram na Sala de Reuniões", () => {
  const admin = mk("ed@x.com", "admin");
  ev(admin, base());
  assert.ok(roomMeetings(now()).every((m) => m.kind !== "evento"));
});
