import test from "node:test";
import assert from "node:assert/strict";
import { LANGS, langByCode, langFromCookie } from "../src/lib/languages";

test("idiomas: sem duplicados, com bandeira e muitos idiomas", () => {
  assert.equal(new Set(LANGS.map((l) => l.code)).size, LANGS.length);
  assert.ok(LANGS.length >= 90);
  for (const l of LANGS) assert.match(l.flag, /^[a-z]{2}(-[a-z]{2,3})?$/, l.code);
  assert.equal(LANGS[0].code, "pt");
});

test("langFromCookie lê o cookie do Google Tradutor", () => {
  assert.equal(langFromCookie(""), "pt");
  assert.equal(langFromCookie("a=1; googtrans=/pt/en; b=2"), "en");
  assert.equal(langFromCookie("googtrans=/pt/zh-CN"), "zh-CN");
  assert.equal(langFromCookie("googtrans=/pt/xx"), "pt");
  assert.equal(langByCode("EN").code, "en");
  assert.equal(langByCode("nada").code, "pt");
});
