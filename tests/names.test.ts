import test from "node:test";
import assert from "node:assert/strict";
import { shortName } from "../src/lib/names";

test("shortName encurta nomes oficiais de FIIs", () => {
  assert.equal(shortName("MAXI RENDA FUNDO DE INVESTIMENTO IMOBILIÁRIO - FII - RESPONSABILIDADE LIMITADA"), "MAXI RENDA");
  assert.equal(shortName("ZAGROS RENDA IMOBILIÁRIA FUNDO DE INVESTIMENTO IMOBILIÁRIO RESPONSABILIDADE LIMITADA"), "ZAGROS RENDA IMOBILIÁRIA");
  assert.equal(shortName("PETROBRAS PN"), "PETROBRAS PN");
  assert.equal(shortName("FUNDO DE INVESTIMENTO IMOBILIÁRIO"), "FUNDO DE INVESTIMENTO IMOBILIÁRIO");
});
