import test from "node:test";
import assert from "node:assert/strict";
import { adaptDecText, buildBens, cnpjFromText, emptyWorkspace, fmtField, matchPrev, programCode, qtyFromText, type PortfolioItem } from "../src/lib/irpf";
import { buildIrpfPdf } from "../src/lib/irpf-pdf";

const item = (o: Partial<PortfolioItem> = {}): PortfolioItem => ({ key: "k1", label: "Petrobras", ticker: "PETR4", kind: "acao", qty: null, avg: null, valueCents: 0, cnpj: null, legalName: "Petróleo Brasileiro S.A.", divs: [], ...o });
const wsWith = (disc: string, valor: number) => ({ ...emptyWorkspace(2025), previous: [{ id: "p1", grupo: "03", codigo: "01", discriminacao: disc, valor }] });
const DEC = "100 ações PETR4 da PETROBRAS, CNPJ 33.000.167/0001-01, mantidas na corretora XP.";

test("lê quantidade e CNPJ do texto do .DEC", () => {
  assert.equal(qtyFromText(DEC)?.qty, 100);
  assert.equal(cnpjFromText(DEC), "33.000.167/0001-01");
  assert.equal(matchPrev(item(), wsWith(DEC, 3000).previous)?.id, "p1");
});
test("adaptDecText troca só a quantidade", () => {
  const a = adaptDecText(DEC, 150);
  assert.ok(a.text.startsWith("150 ações PETR4"));
  assert.deepEqual(a.change, { from: 100, to: 150 });
  assert.equal(adaptDecText(DEC, 100).change, null);
});
test("preço médio vem do .DEC quando o Portfólio não tem", () => {
  const [b] = buildBens([item({ qty: 100 })], wsWith(DEC, 3000));
  assert.equal(b.avg, 30); assert.equal(b.avgFrom, ".DEC"); assert.equal(b.qtyFrom, "portfólio");
  assert.equal(b.total, 3000);
});
test("prioridade: digitado > Portfólio > .DEC", () => {
  const ws = wsWith(DEC, 3000);
  assert.equal(buildBens([item({ qty: 100, avg: 25 })], ws)[0].avgFrom, "portfólio");
  const ws2 = { ...ws, edits: { k1: { avg: 40 } } };
  const b = buildBens([item({ qty: 100, avg: 25 })], ws2)[0];
  assert.equal(b.avg, 40); assert.equal(b.avgFrom, "você");
});
test("discriminação do .DEC tem prioridade sobre o texto automático, com quantidade atualizada", () => {
  const [b] = buildBens([item({ qty: 150, avg: 30 })], wsWith(DEC, 3000));
  assert.equal(b.source, "dec");
  assert.ok(b.text.startsWith("150 ações PETR4"));
  assert.equal(b.cnpj, "33.000.167/0001-01");
  assert.equal(b.qtyChange?.to, 150);
});
test("texto editado vence tudo; sem .DEC usa o automático", () => {
  const ws = { ...wsWith(DEC, 3000), edits: { k1: { text: "meu texto" } } };
  assert.equal(buildBens([item({ qty: 1, avg: 1 })], ws)[0].source, "editado");
  assert.equal(buildBens([item({ qty: 1, avg: 1 })], emptyWorkspace(2025))[0].source, "auto");
});
test("formato do campo e nomes do programa", () => {
  assert.equal(fmtField(1234.5), "1.234,50");
  const pc = programCode("03", "01");
  assert.ok(pc.grupo.startsWith("03") && pc.codigo.startsWith("01"));
});
test("gera PDF válido", async () => {
  const bens = buildBens([item({ qty: 100, avg: 30 })], emptyWorkspace(2025));
  const blob = await buildIrpfPdf({ year: 2025, bens, custom: [], prov: [] });
  const head = Buffer.from(await blob.arrayBuffer()).subarray(0, 5).toString();
  assert.equal(head, "%PDF-");
});
