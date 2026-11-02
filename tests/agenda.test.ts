import test from "node:test";
import assert from "node:assert/strict";
import { addEvent, cleanLink, deleteEvent, listEvents, plataforma } from "../src/lib/agenda";
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
