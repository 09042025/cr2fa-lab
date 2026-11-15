import test from "node:test";
import assert from "node:assert/strict";
import { applyDec, parseDec } from "../src/lib/irpf-dec";
import { emptyWorkspace } from "../src/lib/irpf";

// Monta linhas segundo o leiaute oficial (posições 1-based), com CRLF.
const put = (len: number, fields: [number, string][]) => { const a = Array(len).fill(" "); for (const [pos, v] of fields) for (let i = 0; i < v.length; i++) a[pos - 1 + i] = v[i]; return a.join(""); };
const num = (v: number, w = 13) => String(Math.round(v * 100)).padStart(w, "0");
const header = (ex: number) => put(1023, [[1, "IRPF" + ex], [9, String(ex)], [13, String(ex - 1)], [22, "12345678909"], [40, "NOME QUE DEVE SER IGNORADO"]]);
const bem = (grupo: string, cod: string, texto: string, ant: number, atu: number, ext = "0") => put(1153, [[1, "27"], [3, "12345678909"], [14, cod], [16, ext], [20, texto], [532, num(ant)], [545, num(atu)], [1101, grupo]]);
const iso = (cod: string, v: number) => put(40, [[1, "23"], [3, "12345678909"], [14, cod.padStart(4, "0")], [18, num(v)]]);
const exc = (cod: string, v: number) => put(40, [[1, "24"], [3, "12345678909"], [14, cod.padStart(4, "0")], [18, num(v)]]);
const file = (...l: string[]) => Buffer.from(l.join("\r\n") + "\r\n", "latin1");

test("lê bens, isentos e exclusivos do .DEC e ignora dados pessoais", () => {
  const r = parseDec(file(header(2026), bem("03", "01", "100 ações PETR4 CNPJ 33.000.167/0001-01", 2000, 3000), bem("01", "11", "Apartamento São Paulo", 400000, 410000), iso("9", 1234.56), iso("26", 800), exc("10", 150), "99"));
  assert.equal(r.ok, true);
  assert.equal(r.exercicio, 2026); assert.equal(r.anoBase, 2025);
  assert.equal(r.bens.length, 2);
  assert.deepEqual([r.bens[0].grupo, r.bens[0].codigo, r.bens[0].anterior, r.bens[0].atual], ["03", "01", 2000, 3000]);
  assert.match(r.bens[1].texto, /Apartamento São Paulo/);
  assert.deepEqual(r.isentos, { "09": 1234.56, "26": 800 });
  assert.deepEqual(r.exclusivos, { "10": 150 });
  assert.ok(!JSON.stringify(r).includes("12345678909") && !JSON.stringify(r).includes("IGNORADO"));
});

test("arquivo inválido ou sem registros úteis dá erro claro", () => {
  assert.equal(parseDec(file("isto nao e um dec")).ok, false);
  assert.equal(parseDec(new Uint8Array()).ok, false);
  const r = parseDec(file(header(2026), "27curta"));
  assert.equal(r.ok, false);
});

test("aplicar: carteira recalcula; imóvel é mantido; ação que saiu da carteira vem zerada para revisar", () => {
  const r = parseDec(file(header(2026), bem("03", "01", "100 ações PETR4", 2000, 3000), bem("03", "01", "50 ações VALE3", 1000, 1500), bem("01", "11", "Apartamento", 400000, 410000)));
  const ws = applyDec(emptyWorkspace(2026), r, ["PETR4"]);
  assert.equal(ws.previous.length, 3);
  assert.equal(ws.custom.length, 2);
  const vale = ws.custom.find((c) => /VALE3/.test(c.discriminacao))!;
  assert.equal(vale.valor, 0); assert.equal(vale.prev, 1500); assert.ok(vale.review);
  const ap = ws.custom.find((c) => /Apartamento/.test(c.discriminacao))!;
  assert.equal(ap.valor, 410000); assert.equal(ap.prev, 410000);
  // reimportar não duplica
  assert.equal(applyDec(ws, r, ["PETR4"]).custom.length, 2);
});
