import test from "node:test";
import assert from "node:assert/strict";
import { addLesson, createPlaylist, embedUrl, listLessons, move, parseYoutube } from "../src/lib/courses";

test("aceita links do YouTube e recusa o resto", () => {
  assert.deepEqual(parseYoutube("https://youtu.be/dQw4w9WgXcQ?si=abc"), { video: "dQw4w9WgXcQ", list: null });
  assert.deepEqual(parseYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabcdefghijk1234"), { video: "dQw4w9WgXcQ", list: "PLabcdefghijk1234" });
  assert.deepEqual(parseYoutube("https://www.youtube.com/playlist?list=PLabcdefghijk1234"), { video: null, list: "PLabcdefghijk1234" });
  assert.equal(parseYoutube("http://youtu.be/dQw4w9WgXcQ"), null);
  assert.equal(parseYoutube("https://evil.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(parseYoutube("https://youtube.com/watch?v=curto"), null);
  assert.match(embedUrl("dQw4w9WgXcQ", null)!, /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
});

test("aula bloqueada não entrega o link a quem não é Premium; Grátis vê só as liberadas", () => {
  const pl = createPlaylist("Ações", "")!;
  const a = addLesson(pl, { title: "Intro", description: "", url: "https://youtu.be/dQw4w9WgXcQ", minutes: 25, free: true });
  const b = addLesson(pl, { title: "Avançada", description: "", url: "https://youtu.be/9bZkp7q19f0", minutes: 30, free: false });
  assert.ok(a.ok && b.ok);
  const free = listLessons(pl, false);
  assert.equal(free[0].locked, false);
  assert.ok(free[0].embed);
  assert.equal(free[1].locked, true);
  assert.equal(free[1].embed, null);
  assert.ok(listLessons(pl, true).every((l) => l.embed));
  assert.ok(!addLesson(pl, { title: "x", description: "", url: "https://exemplo.com", minutes: null, free: false }).ok);
  if (b.ok) { move("lesson", b.id, "up"); assert.equal(listLessons(pl, true)[0].title, "Avançada"); }
});
