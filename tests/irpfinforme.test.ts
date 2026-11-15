import test from "node:test";
import assert from "node:assert/strict";
import { applyInformes, parseInforme, textToLines } from "../src/lib/irpf-informe";
import { emptyWorkspace, type PortfolioItem } from "../src/lib/irpf";

const TXT = `RENDIMENTOS ISENTOS E NAO TRIBUTAVEIS
09 - Lucros e dividendos recebidos
33.000.167/0001-01 PETROLEO BRASILEIRO S A PETROBRAS 385,71
12.005.956/0001-65 KINEA RENDIMENTOS IMOBILIARIOS FUNDO DE INVESTIMENTO IMOBILIARIO 2.064,00
RENDIMENTOS SUJEITOS A TRIBUTACAO EXCLUSIVA / DEFINITIVA
10 - Juros sobre capital proprio
33.000.167/0001-01
PETROLEO BRASILEIRO S A PETROBRAS 305,76
BENS E DIREITOS
60.872.504/0001-23 ITAU 1.000,00`;
const item = (o: Partial<PortfolioItem>): PortfolioItem => ({ key: "PETR4", label: "PETR4", ticker: "PETR4", kind: "acao", qty: 1, avg: 1, valueCents: 0, cnpj: "33000167000101", legalName: null, divs: [], ...o });

test("lê dividendos, fundos e JCP; ignora outras seções", () => {
  const r = parseInforme(textToLines(TXT), "itau.txt");
  assert.deepEqual(r.lines.map((l) => [l.tipo, l.cnpj, l.valor]), [["dividendos", "33.000.167/0001-01", 385.71], ["fii", "12.005.956/0001-65", 2064], ["jcp", "33.000.167/0001-01", 305.76]]);
  assert.equal(r.warnings.length, 0);
});
test("arquivo sem rendimentos reconhecidos avisa o usuário", () => {
  assert.equal(parseInforme(["texto qualquer"], "x.pdf").warnings.length, 1);
});
test("aplica no ativo pelo CNPJ e deixa o resto como extra", () => {
  const r = parseInforme(textToLines(TXT), "itau.txt");
  const ws = applyInformes(emptyWorkspace(2025), r.lines, [item({})]);
  assert.equal(ws.prov["PETR4"].gross, 385.71);
  assert.deepEqual(ws.extras?.map((e) => [e.tipo, e.cnpj]), [["fii", "12.005.956/0001-65"], ["jcp", "33.000.167/0001-01"]]);
});
