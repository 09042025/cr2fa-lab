import test from "node:test";
import assert from "node:assert/strict";
import { LINK_CATEGORIES } from "../src/lib/links";

test("Links Essenciais: endereços válidos, sem repetição e sem rastreadores", () => {
  const slugs = new Set<string>();
  for (const c of LINK_CATEGORIES) {
    assert.ok(!slugs.has(c.slug)); slugs.add(c.slug);
    const urls = new Set<string>();
    for (const l of c.links) {
      const u = new URL(l.url);
      assert.equal(u.protocol, "https:", l.url);
      assert.ok(!/fbclid|utm_|rc_by/.test(l.url), l.url);
      assert.ok(l.name.length > 2 && l.use.length > 5, l.name);
      assert.ok(!urls.has(l.url), `repetido em ${c.slug}: ${l.url}`); urls.add(l.url);
    }
  }
});
