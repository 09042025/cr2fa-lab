import test from "node:test";
import assert from "node:assert/strict";
import { runAgendaMail, addEvent, cleanLink, deleteEvent, listEvents, plataforma } from "../src/lib/agenda";
import { db, now } from "../src/lib/db";

test("links: só http(s), completa https e rejeita o resto", () => {
  assert.equal(cleanLink("meet.google.com/abc-defg-hij"), "https://meet.google.com/abc-defg-hij");
  assert.equal(cleanLink("  https://zoom.us/j/123  "), "https://zoom.us/j/123");
  assert.equal(cleanLink("javascript:alert(1)"), "");
  assert.equal(cleanLink(""), "");
  assert.equal(plataforma("https://teams.microsoft.com/l/meetup-join/x"), "Microsoft Teams");
  assert.equal(plataforma("https://meet.google.com/a"), "Google Meet");
});

test("eventos: cria, lista em ordem e apaga", () => {
  const uid = Number(db().prepare("INSERT INTO users (email, name, password_hash, role) VALUES ('ag@x.com', 'Adm', 'x', 'admin')").run().lastInsertRowid);
  const t = now() + 3 * 86400;
  const b = addEvent(uid, { title: "Live B", startsAt: t + 3600, durationMin: 60, link: "zoom.us/j/9", notes: "" });
  const a = addEvent(uid, { title: "Live A", startsAt: t, durationMin: 90, link: "", notes: "tema" });
  assert.ok(a && b);
  assert.equal(a!.endsAt - a!.startsAt, 90 * 60);
  const l = listEvents(t - 10).map((e) => e.title);
  assert.deepEqual(l.slice(0, 2), ["Live A", "Live B"]);
  assert.equal(addEvent(uid, { title: "x", startsAt: t, durationMin: 60, link: "ftp://x", notes: "" }), null);
  assert.equal(addEvent(uid, { title: " ", startsAt: t, durationMin: 60, link: "", notes: "" }), null);
  assert.equal(deleteEvent(a!.id), true);
  assert.equal(deleteEvent(a!.id), false);
});

test("aviso diário: 08:00, só Premium, 1x/dia, para após o evento", async () => {
  const mk = (e: string, plan: string, role = "user") => Number(db().prepare("INSERT INTO users (email, name, password_hash, role, plan) VALUES (?, 'U', 'x', ?, ?)").run(e, role, plan).lastInsertRowid);
  const adm = mk("adm2@x.com", "pro", "admin");
  mk("pro1@x.com", "pro"); mk("free1@x.com", "free");
  db().prepare("DELETE FROM meeting_events").run();
  // evento daqui a 2 dias às 20:00 de Brasília
  const day0 = Math.floor((now() - 3 * 3600) / 86400) * 86400 + 3 * 3600; // 00:00 Brasília de hoje
  const evStart = day0 + 2 * 86400 + 20 * 3600;
  addEvent(adm, { title: "Live X", startsAt: evStart, durationMin: 60, link: "meet.google.com/x", notes: "" });
  const got: string[] = [];
  const send = async (to: string) => { got.push(to); };
  assert.equal(await runAgendaMail(send, day0 + 7 * 3600, 0), 0); // antes das 08:00
  const r1 = await runAgendaMail(send, day0 + 8 * 3600, 0);
  assert.ok(got.includes("pro1@x.com") && !got.includes("free1@x.com") && !got.includes("adm2@x.com"));
  assert.equal(await runAgendaMail(send, day0 + 9 * 3600, 0), 0); // mesmo dia: não repete
  assert.ok(r1 >= 1);
  assert.ok((await runAgendaMail(send, day0 + 86400 + 8 * 3600, 0)) >= 1); // dia seguinte envia
  assert.ok((await runAgendaMail(send, day0 + 2 * 86400 + 8 * 3600, 0)) >= 1); // dia da reunião envia
  assert.equal(await runAgendaMail(send, evStart + 3 * 3600, 0), 0); // após a reunião: nada
  assert.equal(await runAgendaMail(send, day0 + 3 * 86400 + 8 * 3600, 0), 0);
});

test("sala de reuniões: só reuniões (não eventos) ainda não terminadas", async () => {
  const { roomMeetings } = await import("../src/lib/agenda");
  const uid = Number(db().prepare("INSERT INTO users (email, name, password_hash, role, plan) VALUES ('room@x.com', 'Adm', 'x', 'admin', 'pro')").run().lastInsertRowid);
  db().prepare("DELETE FROM meeting_events").run();
  const t = now();
  addEvent(uid, { title: "Reunião mensal", startsAt: t + 3600, durationMin: 60, link: "meet.google.com/a", notes: "" });
  addEvent(uid, { title: "Evento especial", startsAt: t + 7200, durationMin: 60, link: "zoom.us/j/1", notes: "", kind: "evento" });
  addEvent(uid, { title: "Passada", startsAt: t - 7200, durationMin: 30, link: "", notes: "" });
  const titles = roomMeetings(t).map((m) => m.title);
  assert.deepEqual(titles, ["Reunião mensal"]);
});
