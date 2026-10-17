import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeCsvBytes, guessBlock, parseB3, parseCsv, parseNumberBR, sheetFromCsv } from "../src/lib/b3import";
import { readXlsx } from "../src/lib/xlsx-lite";
import { DEFLATED, STORED } from "./b3fixture";

const bytes = (b64: string) => new Uint8Array(Buffer.from(b64, "base64"));

test("lê todas as abas de um .xlsx, comprimido ou não", async () => {
  for (const b64 of [DEFLATED, STORED]) {
    const sheets = await readXlsx(bytes(b64));
    assert.deepEqual(sheets.map((s) => s.name), ["Acoes", "Fundo de Investimento", "Tesouro Direto", "Renda Fixa", "Aba sem dados"]);
    assert.equal(sheets[0].rows[0][3], "Código de Negociação"); // acentos preservados
    assert.equal(sheets[0].rows[1][13], 4809); // número fica número
    assert.equal(sheets[0].rows[3][12], "-");
  }
});

test("rejeita arquivo que não é xlsx", async () => {
  await assert.rejects(() => readXlsx(new Uint8Array(40)));
  await assert.rejects(() => readXlsx(new Uint8Array(10)));
});

test("importa a posição da B3: blocos, valores e soma de posições repetidas", async () => {
  const res = parseB3(await readXlsx(bytes(DEFLATED)));
  const by = Object.fromEntries(res.items.map((i) => [i.label, i]));
  assert.equal(res.sheetsRead, 4);
  // ITUB4 em duas corretoras (uma como fracionário ITUB4F) vira uma linha só
  assert.equal(by.ITUB4.value, 5289.9);
  assert.equal(by.ITUB4.qty, 110);
  assert.equal(by.ITUB4.block, "acoes");
  // sem valor atualizado, usa preço de fechamento x quantidade
  assert.equal(by.PETR4.value, 1155);
  // FIIs vêm da aba de fundos; a linha "Total" é ignorada
  assert.equal(by.HGLG11.block, "fiis");
  assert.equal(by.BTLG11.value, 1000);
  assert.equal(res.items.some((i) => /total/i.test(i.label)), false);
  // linha sem preço nem valor (TAEE11 com "-") é ignorada
  assert.equal(by.TAEE11, undefined);
  // renda fixa usa o nome do produto e aceita texto em reais
  assert.equal(by["Tesouro Selic 2029"].block, "renda_fixa");
  assert.equal(by["Tesouro Selic 2029"].value, 21234.56);
  assert.equal(by["CDB - BANCO INTER S.A. - CDB123"].value, 5500);
  assert.ok(res.skipped >= 2);
});

test("número em formato brasileiro", () => {
  assert.equal(parseNumberBR("R$ 1.234,56"), 1234.56);
  assert.equal(parseNumberBR("1.234"), 1234);
  assert.equal(parseNumberBR("12,5"), 12.5);
  assert.equal(parseNumberBR("1,234.56"), 1234.56);
  assert.equal(parseNumberBR("-"), null);
  assert.equal(parseNumberBR(""), null);
  assert.equal(parseNumberBR(42.5), 42.5);
  assert.equal(parseNumberBR("abc"), null);
});

test("CSV com ponto e vírgula, aspas e codificação Windows-1252", () => {
  const text = 'Produto;Código de Negociação;Quantidade;Valor Atualizado\r\n"HGLG11 - FII ""X""";HGLG11;10;"1.555,00"\r\n';
  const rows = parseCsv(text);
  assert.equal(rows[1][0], 'HGLG11 - FII "X"');
  const res = parseB3([sheetFromCsv("posicao", text)]);
  assert.equal(res.items[0].value, 1555);
  assert.equal(res.items[0].block, "fiis");
  const latin1 = new Uint8Array([0x43, 0xf3, 0x64]); // "Có" com o ó em Windows-1252 (inválido em UTF-8)
  assert.equal(decodeCsvBytes(latin1.buffer), "Cód");
});

test("palpite de bloco", () => {
  assert.deepEqual(guessBlock("Acoes", "ITUB4 - ITAU", "ITUB4"), { block: "acoes", review: false });
  assert.equal(guessBlock("", "", "KNRI11").block, "fiis");
  assert.equal(guessBlock("", "", "KNRI11").review, true); // final 11 sem pista: pede conferência
  assert.equal(guessBlock("", "IVVB11 - ISHARES S&P 500 ETF", "IVVB11").block, "acoes");
  assert.equal(guessBlock("", "Tesouro IPCA+ 2035", "").block, "renda_fixa");
  assert.equal(guessBlock("BDR", "AAPL34", "AAPL34").block, "acoes");
  assert.equal(guessBlock("???", "Coisa estranha", "").review, true);
});

test("arquivo sem colunas reconhecíveis não gera linhas", () => {
  const res = parseB3([{ name: "x", rows: [["a", "b"], [1, 2]] }]);
  assert.equal(res.items.length, 0);
  assert.equal(res.sheetsRead, 0);
});
