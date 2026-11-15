import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decryptVault, encryptVault, isValidPhrase, newPhrase, pickChecks } from "../src/lib/irpf-crypto";

test("24 palavras válidas, criptografa e abre; palavras erradas ou arquivo adulterado falham", async () => {
  const p = newPhrase();
  assert.equal(p.split(" ").length, 24);
  assert.equal(isValidPhrase(p), true);
  assert.equal(isValidPhrase(p.split(" ").slice(0, 23).join(" ")), false);
  const data = { cpf: "000", bens: [{ a: 1 }], texto: "ação ✓" };
  const f = await encryptVault(p, data);
  assert.ok(!JSON.stringify(f).includes("ação"));
  assert.deepEqual(await decryptVault(p, f), data);
  await assert.rejects(decryptVault(newPhrase(), f), /palavras erradas/);
  const bad = { ...f, ct: f.ct.slice(0, -4) + (f.ct.endsWith("AAAA") ? "BBBB" : "AAAA") };
  await assert.rejects(decryptVault(p, bad), /palavras erradas ou arquivo alterado/);
  const f2 = await encryptVault(p, data);
  assert.notEqual(f.ct, f2.ct); // sal e IV novos a cada gravação
  assert.equal(pickChecks().length, 3);
});

test("garantia: o código do cofre não faz nenhuma chamada de rede e não usa armazenamento do navegador", () => {
  for (const file of ["src/lib/irpf-crypto.ts", "src/lib/irpf.ts", "src/lib/irpf-device.ts", "src/lib/irpf-dec.ts", "src/lib/irpf-sync.ts", "src/lib/irpf-pdf.ts", "src/components/IrpfApp.tsx"]) {
    let src = "";
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const bad of [...(file.endsWith("irpf-sync.ts") ? [] : [/\bfetch\s*\(/]), /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /localStorage/, /sessionStorage/, ...(file.endsWith("irpf-device.ts") ? [] : [/indexedDB/]), /document\.cookie/, /\bnavigator\.clipboard\.read/]) {
      assert.equal(bad.test(code), false, `${file} usa ${bad}`);
    }
  }
});

import { buildBens, buildProventos, codeFor, emptyWorkspace, parseNum, rollover, snapshotOf, type PortfolioItem } from "../src/lib/irpf";
const item = (o: Partial<PortfolioItem>): PortfolioItem => ({ key: "k", label: "X", ticker: "PETR4", kind: "acao", qty: 100, avg: 30, valueCents: 0, cnpj: "33000167000101", legalName: "PETROLEO BRASILEIRO S.A. PETROBRAS", divs: [], ...o });

test("códigos de bens e direitos", () => {
  assert.deepEqual([codeFor(item({})).grupo, codeFor(item({})).codigo], ["03", "01"]);
  assert.equal(codeFor(item({ kind: "fii", ticker: "KNRI11" })).codigo, "03");
  assert.equal(codeFor(item({ kind: "cripto", ticker: "BTC" })).codigo, "01");
  assert.equal(codeFor(item({ kind: "cripto", ticker: "ETH" })).codigo, "02");
  assert.equal(codeFor(item({ kind: "cripto", ticker: "USDT" })).codigo, "03");
});

test("bens: declara pelo custo, texto com CNPJ e avisos de campos faltando", () => {
  const ws = emptyWorkspace(2026);
  const [b] = buildBens([item({})], ws);
  assert.equal(b.total, 3000);
  assert.match(b.text, /^100 ACOES DA EMPRESA PETROLEO BRASILEIRO S\.A\. PETROBRAS, CODIGO DA BOLSA DE VALORES PETR4, AO PRECO MEDIO DE R\$ 30,00, TOTAL DE R\$ 3\.000,00 E ESTAO CUSTODIADAS NA CORRETORA/);
  assert.ok(b.warnings.some((w) => /corretora/i.test(w)));
  const [c] = buildBens([item({ avg: null })], ws);
  assert.equal(c.total, null);
  assert.ok(c.warnings.some((w) => /preço médio/i.test(w)));
});

test("proventos: soma só o ano-calendário × quantidade; JCP calcula IRRF de 15%", () => {
  const ws = emptyWorkspace(2026);
  const it = item({ divs: [{ date: "2025-12-30", perShare: 9 }, { date: "2026-03-10", perShare: 0.5 }, { date: "2026-09-10", perShare: 0.25 }] });
  const [p] = buildProventos([it], ws);
  assert.equal(p.gross, 75);
  assert.equal(p.type, "dividendos");
  ws.prov.k = { type: "jcp", gross: 200 };
  assert.equal(buildProventos([it], ws)[0].irrf, 30);
  assert.equal(buildProventos([item({ kind: "cripto", ticker: "BTC" })], ws).length, 0);
});

test("novo ano: o fim do ano anterior vira situação anterior e mantém corretora", () => {
  const ws = emptyWorkspace(2026);
  ws.edits.k = { custody: "XP", cnpj: "33.000.167/0001-01", avg: 99 };
  ws.custom.push({ id: "c1", grupo: "01", codigo: "11", discriminacao: "Apartamento", valor: 500000, prev: 480000 });
  ws.snapshot = snapshotOf(buildBens([item({})], ws), ws.custom);
  const n = rollover(ws, 2027);
  assert.equal(n.year, 2027);
  assert.equal(n.previous.length, 2);
  assert.equal(n.edits.k.custody, "XP");
  assert.equal(n.edits.k.avg, undefined);
  assert.equal(n.custom[0].prev, 500000);
  const [b] = buildBens([item({})], n);
  assert.equal(b.prev, 9900);
});

test("parseNum aceita formato brasileiro", () => {
  assert.equal(parseNum("1.234,56"), 1234.56);
  assert.equal(parseNum("R$ 10,5"), 10.5);
  assert.equal(parseNum("12.5"), 12.5);
  assert.equal(parseNum(""), null);
  assert.equal(parseNum("abc"), null);
});

test("sincronização com o Portfólio só envia id e preço médio", () => {
  const src = readFileSync("src/lib/irpf-sync.ts", "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.equal((code.match(/fetch\(/g) ?? []).length, 1);
  assert.match(code, /items: items\.map\(\(x\) => \(\{ id: x\.id, avg: x\.avg \}\)\)/);
  assert.equal(/discriminacao|cnpj|texto|text\b|cpf/i.test(code), false);
});
