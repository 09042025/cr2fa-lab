import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { createStory, deleteStory, listStoryGroups, markViewed, purgeExpired, shareStoryToFeed, STORY_TTL } from "../src/lib/stories";
import { saveImage } from "../src/lib/community";

const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082", "hex");
function user(n: string) {
  return Number(db().prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, 'x')").run(`${n}@t.com`, n).lastInsertRowid);
}

test("story: criar, listar, visto, expirar", () => {
  const a = user("ana"), b = user("beto");
  const img = saveImage(a, png)!;
  const r = createStory(a, img, "  olá  ");
  assert.ok(r.ok);
  assert.equal(createStory(a, img, "").ok, false);
  assert.equal(createStory(b, img, "").ok, false);
  let g = listStoryGroups(b);
  assert.equal(g.length, 1);
  assert.equal(g[0].allSeen, false);
  assert.equal(g[0].stories[0].caption, "olá");
  assert.equal(g[0].stories[0].views, undefined);
  assert.ok(markViewed((r as { id: number }).id, b));
  g = listStoryGroups(b);
  assert.equal(g[0].allSeen, true);
  assert.equal(listStoryGroups(a)[0].stories[0].views, 1);
  db().prepare("UPDATE stories SET created_at = unixepoch() - ?").run(STORY_TTL + 5);
  assert.equal(listStoryGroups(b).length, 0);
  assert.equal(db().prepare("SELECT 1 FROM community_images WHERE id = ?").get(img), undefined);
});

test("story: apagar só o dono/admin e virar publicação", () => {
  const a = user("carla"), b = user("davi");
  const img = saveImage(a, png)!;
  const id = (createStory(a, img, "x") as { id: number }).id;
  assert.equal(deleteStory(id, { id: b, role: "user" }), false);
  assert.ok(shareStoryToFeed(id, a));
  assert.equal(shareStoryToFeed(id, a), false);
  assert.equal(shareStoryToFeed(id, b), false);
  purgeExpired(Math.floor(Date.now() / 1000) + STORY_TTL + 10);
  assert.ok(db().prepare("SELECT 1 FROM community_images WHERE id = ?").get(img), "foto do post permanece");
  assert.equal(deleteStory(id, { id: b, role: "admin" }), false);
});
