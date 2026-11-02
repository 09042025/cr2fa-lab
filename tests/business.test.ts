import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { addRec, cleanListing, createListing, deleteListing, getListing, listRecs, reportListing, searchListings, updateListing, MAX_LISTINGS } from "../src/lib/business";

const mk = (e: string) => Number(db().prepare("INSERT INTO users (email, name, password_hash, role, plan) VALUES (?, 'Membro', 'x', 'user', 'pro')").run(e).lastInsertRowid);
const base = { kind: "service", category: "reformas", title: "Pintura residencial", description: "Pintura de casas e apartamentos com acabamento e garantia de 1 ano.", city: "Campinas", state: "SP", priceNote: "", whatsapp: "(19) 99999-8888", instagram: "@pintor.sp", website: "", googleRating: null as number | null, googleUrl: "", cases: [] as { title: string; text: string; link: string }[] };

test("validação do anúncio", () => {
  assert.ok("data" in cleanListing(base));
  const d = (cleanListing(base) as { data: typeof base }).data;
  assert.equal(d.whatsapp, "19999998888");
  assert.equal(d.instagram, "pintor.sp");
  assert.ok("error" in cleanListing({ ...base, whatsapp: "", instagram: "" })); // sem contato
  assert.ok("error" in cleanListing({ ...base, googleRating: 4.8 })); // nota sem link
  assert.ok("error" in cleanListing({ ...base, googleRating: 7, googleUrl: "https://g.page/x" }));
  assert.ok("data" in cleanListing({ ...base, googleRating: 4.8, googleUrl: "g.page/x" }));
  assert.ok("error" in cleanListing({ ...base, website: "javascript:alert(1)" }));
  assert.ok("error" in cleanListing({ ...base, cases: [{ title: "x", text: "", link: "" }] }));
  assert.ok("error" in cleanListing({ ...base, title: "ab" }));
});

test("anúncios: limite, busca, edição e exclusão com permissão", () => {
  const a = mk("biz-a@x.com"), b = mk("biz-b@x.com");
  const ids: number[] = [];
  for (let i = 0; i < MAX_LISTINGS; i++) { const r = createListing(a, { ...base, title: `Pintura ${i}` }); assert.equal(typeof r, "number"); ids.push(r as number); }
  assert.ok(typeof createListing(a, base) === "object"); // passou do limite
  assert.equal(searchListings({ q: "Pintura 1" }).length, 1);
  assert.equal(searchListings({ category: "reformas", state: "SP" }).length >= MAX_LISTINGS, true);
  assert.equal(searchListings({ category: "aulas" }).length, 0);
  assert.equal(searchListings({ q: "%" }).length, 0); // curinga escapado
  assert.deepEqual(updateListing(ids[0], b, false, base), { error: "Você só pode editar os seus anúncios." });
  assert.equal(updateListing(ids[0], a, false, { ...base, title: "Novo título" }), true);
  assert.equal(getListing(ids[0])!.title, "Novo título");
  assert.equal(deleteListing(ids[0], b, false), false);
  assert.equal(deleteListing(ids[0], a, false), true);
});

test("indicações: uma por membro, não indica o próprio, denúncia", () => {
  const a = mk("biz-c@x.com"), b = mk("biz-d@x.com");
  const id = createListing(a, base) as number;
  assert.ok(typeof addRec(id, a, true, "Excelente trabalho, recomendo!") === "object");
  assert.equal(addRec(id, b, true, "Fiz a reforma com ele, ótimo."), true);
  assert.equal(addRec(id, b, false, "Atualizando: continua bom."), true);
  assert.ok(typeof addRec(id, b, true, "curto") === "object");
  const l = getListing(id)!;
  assert.equal(l.recs, 1);
  assert.equal(l.hired, 0);
  assert.equal(listRecs(id).length, 1);
  assert.equal(reportListing(id, b, "golpe"), true);
  assert.equal(getListing(id)!.reports, 1);
  assert.equal(reportListing(99999, b, "x"), false);
});
