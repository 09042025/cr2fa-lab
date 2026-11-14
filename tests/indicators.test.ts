import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeFii, analyzeStock, attentionPoints, ltm, rate, yoyGrowth, type CvmRow } from "../src/lib/indicators";
import { canonAccount, ingestFii, ingestStatement, ingestTickers, parseCsv, unzipAll, companyOf, type CvmData } from "../src/lib/cvm";
import { monthCalendar, nextEstimate, parseYahoo, sumBetween } from "../src/lib/dividends";

const row = (k: string, i: string, f: string, v: number): CvmRow => ({ k, i, f, v });

// Empresa fictícia: ITR do 3º tri de 2026 (acumulado 9 meses), DFP 2025 e 9 meses de 2025
const rows: CvmRow[] = [
  row("ll", "2026-01-01", "2026-09-30", 900), row("ll", "2025-01-01", "2025-09-30", 600), row("ll", "2025-01-01", "2025-12-31", 1000),
  row("rec", "2026-01-01", "2026-09-30", 6000), row("rec", "2025-01-01", "2025-09-30", 5000), row("rec", "2025-01-01", "2025-12-31", 7000),
  row("ebit", "2026-01-01", "2026-09-30", 1500), row("ebit", "2025-01-01", "2025-09-30", 1200), row("ebit", "2025-01-01", "2025-12-31", 1800),
  row("pl", "", "2026-09-30", 5000), row("ativo", "", "2026-09-30", 20000), row("ac", "", "2026-09-30", 3000), row("pc", "", "2026-09-30", 2000),
  row("caixa", "", "2026-09-30", 500), row("div_cp", "", "2026-09-30", 500), row("div_lp", "", "2026-09-30", 3000),
];

test("LTM e crescimento do acumulado", () => {
  assert.equal(ltm(rows, "ll", "2026-09-30"), 900 + 1000 - 600);
  assert.equal(ltm(rows, "ll", "2025-12-31"), 1000);
  assert.equal(yoyGrowth(rows, "ll", "2026-09-30"), 50);
  assert.equal(ltm(rows.filter((r) => r.f !== "2025-09-30"), "ll", "2026-09-30"), null);
});

test("rate classifica nas duas direções", () => {
  assert.equal(rate(20, "higher", 15, 8), "bom");
  assert.equal(rate(10, "higher", 15, 8), "atencao");
  assert.equal(rate(2, "higher", 15, 8), "ruim");
  assert.equal(rate(1, "lower", 2, 3.5), "bom");
  assert.equal(rate(5, "lower", 2, 3.5), "ruim");
  assert.equal(rate(null, "lower", 2, 3.5), "nd");
});

test("ação: indicadores e pontos de atenção", () => {
  const a = analyzeStock({ rows, bank: false, price: 10, marketCap: 25000, dividends12m: 0.2 });
  const by = Object.fromEntries(a.indicators.map((i) => [i.id, i]));
  assert.equal(a.period, "2026-09-30");
  assert.equal(by.roe.value, 1300 / 5000 * 100);
  assert.equal(by.roe.status, "bom");
  assert.equal(by.pl.value, 25000 / 1300);
  assert.equal(by.pl.status, "atencao"); // 19,2: entre 12 e 20
});

test("ação: dívida e margens classificadas, banco não tem dívida", () => {
  const a = analyzeStock({ rows, bank: false, price: 10, marketCap: 25000, dividends12m: 0.2 });
  const by = Object.fromEntries(a.indicators.map((i) => [i.id, i]));
  // dívida líquida = 3500 - 500 = 3000; EBIT LTM = 1500+1800-1200 = 2100 -> 1,43x
  assert.equal(by.dle.status, "bom");
  assert.equal(by.lc.value, 1.5);
  assert.equal(by.gl.status, "bom");
  const bank = analyzeStock({ rows, bank: true, price: 10, marketCap: 25000, dividends12m: 0.2 });
  assert.ok(!bank.indicators.some((i) => i.id === "dle" || i.id === "mebit"));
  const bad = analyzeStock({ rows: rows.map((r) => (r.k === "ll" ? { ...r, v: -r.v } : r)), bank: false, price: 10, marketCap: 25000, dividends12m: 0 });
  const pts = attentionPoints(bad.indicators);
  assert.ok(pts.bad.some((t) => /prejuízo/i.test(t)));
  assert.equal(analyzeStock({ rows: [], bank: false, price: 1, marketCap: 1, dividends12m: 0 }).indicators.length, 0);
});

test("contas canônicas da CVM", () => {
  assert.equal(canonAccount("DRE", "3.01", "Receita de Venda de Bens e/ou Serviços"), "rec");
  assert.equal(canonAccount("DRE", "3.01", "Receitas da Intermediação Financeira"), "rec_banco");
  assert.equal(canonAccount("DRE", "3.11.01", "Atribuído a Sócios da Empresa Controladora"), "ll");
  assert.equal(canonAccount("BPP", "2.03", "Patrimônio Líquido Consolidado"), "pl");
  assert.equal(canonAccount("BPP", "2.08", "Patrimônio Líquido Consolidado"), "pl");
  assert.equal(canonAccount("BPP", "2.01.04", "Empréstimos e Financiamentos"), "div_cp");
  assert.equal(canonAccount("BPA", "1.01.01", "Caixa e Equivalentes de Caixa"), "caixa");
  assert.equal(canonAccount("BPA", "1.02", "Ativo Não Circulante"), null);
});

const H = "CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;ESCALA_MOEDA;ORDEM_EXERC;DT_INI_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA";
const csv = (lines: string[]) => Buffer.from([H, ...lines].join("\r\n"), "latin1");

test("lê CSV de demonstração: escala, versão mais nova e exercício penúltimo", () => {
  const t = parseCsv(csv([
    "00.000.000/0001-91;2026-09-30;1;BANCO X;1;MIL;ÚLTIMO;2026-01-01;2026-09-30;3.11.01;Atribuído a Sócios da Empresa Controladora;100",
    "00.000.000/0001-91;2026-09-30;2;BANCO X;1;MIL;ÚLTIMO;2026-01-01;2026-09-30;3.11.01;Atribuído a Sócios da Empresa Controladora;120",
    "00.000.000/0001-91;2026-09-30;2;BANCO X;1;MIL;PENÚLTIMO;2025-01-01;2025-09-30;3.11.01;Atribuído a Sócios da Empresa Controladora;999",
    "00.000.000/0001-91;2026-09-30;2;BANCO X;1;MIL;ÚLTIMO;2026-01-01;2026-09-30;3.01;Receitas da Intermediação Financeira;500",
  ]));
  const acc = new Map();
  ingestStatement(t, "DRE", acc);
  const c = acc.get("00000000000191");
  assert.equal(c.bank, true);
  assert.deepEqual(c.rows, [{ k: "ll", i: "2026-01-01", f: "2026-09-30", v: 120000 }]);
});

test("FRE: tickers; companyOf cai para a mesma raiz", () => {
  const t = parseCsv(Buffer.from("CNPJ_Companhia;Valor_Mobiliario;Codigo_Negociacao\n00.000.000/0001-91;Ações;BBAS3\n11.111.111/0001-11;Ações;ITUB4, ITUB3", "latin1"));
  const tk: Record<string, string> = {};
  ingestTickers(t, tk);
  assert.equal(tk.BBAS3, "00000000000191");
  assert.equal(tk.ITUB3, "11111111000111");
  const d: CvmData = { loadedAt: 0, year: 2026, tickers: tk, companies: { "00000000000191": { name: "BB", cd: "1", bank: true, rows: [] }, "11111111000111": { name: "Itaú", cd: "2", bank: true, rows: [] } } };
  assert.equal(companyOf(d, "BBAS3")?.company.name, "BB");
  assert.equal(companyOf(d, "ITUB11")?.company.name, "Itaú");
  assert.equal(companyOf(d, "ZZZZ3"), null);
});

test("informe mensal de FII: junta geral e complemento pelo ISIN", () => {
  const geral = parseCsv(Buffer.from("CNPJ_Fundo_Classe;Data_Referencia;Nome_Fundo_Classe;Codigo_ISIN\n11.111.111/0001-11;2026-09-30;FUNDO LOG;BRHGLGCTF000\n11.111.111/0001-11;2026-08-31;FUNDO LOG;BRHGLGCTF000", "latin1"));
  const compl = parseCsv(Buffer.from("CNPJ_Fundo_Classe;Data_Referencia;Valor_Patrimonial_Cotas;Patrimonio_Liquido;Total_Numero_Cotistas;Percentual_Despesas_Taxa_Administracao\n11.111.111/0001-11;2026-09-30;155,5;3000000000;250000;0,08", "latin1"));
  const out = {};
  ingestFii(geral, compl, out);
  const r = (out as Record<string, { vpa: number; cotistas: number; patrimonio: number }>).HGLG;
  assert.equal(r.vpa, 155.5);
  assert.equal(r.cotistas, 250000);
  const a = analyzeFii({ price: 150, dividends12m: 12.6, vpa: r.vpa, patrimonio: r.patrimonio, cotistas: r.cotistas, taxaAdm: 0.08, div12mPrev: 12, monthsPaid: 12, avgDailyVolume: 5e6 });
  const by = Object.fromEntries(a.map((i) => [i.id, i]));
  assert.equal(by.dy.status, "atencao"); // 8,4%: entre 6 e 9
  assert.equal(by.pvp.status, "bom"); // 150/155,5 = 0,96
});

test("zip: lê arquivo comprimido", async () => {
  const { deflateRawSync } = await import("node:zlib");
  const data = Buffer.from("a;b\n1;2");
  const comp = deflateRawSync(data);
  const name = Buffer.from("x.csv");
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(0, 42);
  const local = Buffer.concat([lh, name, comp]);
  const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(46 + name.length, 12); eocd.writeUInt32LE(local.length, 16);
  const zip = Buffer.concat([local, cd, name, eocd]);
  assert.equal(unzipAll(zip, () => true).get("x.csv")?.toString(), "a;b\n1;2");
});

test("proventos: Yahoo, soma, calendário e próxima data estimada", () => {
  const ev: Record<string, { amount: number; date: number }> = {};
  const add = (d: string, v: number) => { ev[d] = { amount: v, date: Date.parse(`${d}T12:00:00Z`) / 1000 }; };
  ["2026-03-15", "2026-06-15", "2026-09-15", "2025-12-15", "2025-09-15"].forEach((d) => add(d, 1));
  const q = parseYahoo({ chart: { result: [{ meta: { regularMarketPrice: 20 }, events: { dividends: ev } }] } });
  assert.equal(q.price, 20);
  assert.equal(q.dividends.length, 5);
  assert.equal(sumBetween(q.dividends, "2025-10-31", "2026-10-31"), 4);
  const cal = monthCalendar(q.dividends, "2026-10-31");
  assert.equal(cal[8].items.length, 1);
  const nx = nextEstimate(q.dividends, "2026-10-31");
  assert.equal(nx?.basis, "pagamento trimestral");
  assert.ok(nx && nx.date > "2026-10-31");
  assert.throws(() => parseYahoo({}));
});
