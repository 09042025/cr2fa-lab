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

test("empresa por nome quando o ticker não está no FRE", async () => {
  const { companyByName, normName } = await import("../src/lib/cvm");
  assert.equal(normName("Banco do Brasil S.A."), normName("BANCO DO BRASIL SA"));
  const d: CvmData = { loadedAt: 0, year: 2026, tickers: {}, companies: { "1": { name: "BANCO DO BRASIL S.A.", cd: "1", bank: true, rows: [] } } };
  assert.equal(companyByName(d, "Banco do Brasil S.A.")?.cnpj, "1");
  assert.equal(companyByName(d, "Outra Empresa"), null);
  const d2: CvmData = { loadedAt: 0, year: 2026, tickers: {}, companies: { a: { name: "BCO BRASIL S.A.", cd: "1", bank: true, rows: [] }, b: { name: "PETROLEO BRASILEIRO S.A. PETROBRAS", cd: "2", bank: false, rows: [] }, c: { name: "BCO BRADESCO S.A.", cd: "3", bank: true, rows: [] }, e: { name: "BCO BRADESCO FINANCIAMENTOS S.A.", cd: "4", bank: true, rows: [] } } };
  assert.equal(companyByName(d2, "Banco do Brasil S.A.")?.cnpj, "a");
  assert.equal(companyByName(d2, "Petróleo Brasileiro S.A. - Petrobras")?.cnpj, "b");
  assert.equal(companyByName(d2, "Banco Bradesco S.A.")?.cnpj, "c");
});

import { propertyIndicator } from "../src/lib/indicators";
test("número de imóveis: até 5 ruim, 6-9 atenção, 10+ bom, sem dado = nd", () => {
  assert.equal(propertyIndicator(3).status, "ruim");
  assert.equal(propertyIndicator(5).status, "ruim");
  assert.equal(propertyIndicator(6).status, "atencao");
  assert.equal(propertyIndicator(9).status, "atencao");
  assert.equal(propertyIndicator(10).status, "bom");
  assert.equal(propertyIndicator(30, "shoppings").display.includes("shoppings"), true);
  assert.equal(propertyIndicator(null).status, "nd");
});
test("FII sempre traz o indicador de imóveis", () => {
  const a = analyzeFii({ price: 100, dividends12m: 10, vpa: 100, patrimonio: 1e9, cotistas: 1000, taxaAdm: 0.1, div12mPrev: 9, monthsPaid: 12, avgDailyVolume: 1e6, imoveis: 4 });
  assert.equal(a.find((x) => x.id === "imoveis")?.status, "ruim");
});

test("FII: dois fundos com o mesmo prefixo de ISIN — vale o maior, e o VP é conferido com patrimônio ÷ cotas", () => {
  const geral = parseCsv(Buffer.from("CNPJ_Fundo_Classe;Data_Referencia;Nome_Fundo_Classe;Codigo_ISIN\n11.111.111/0001-11;2026-09-30;SUNO RECEBIVEIS;BRSNCICTF001\n22.222.222/0001-22;2026-09-30;FUNDO NOVO;BRSNCICTF002\n33.333.333/0001-33;2026-09-30;OUTRO;BRXPTOCTF000", "latin1"));
  const compl = parseCsv(Buffer.from("CNPJ_Fundo_Classe;Data_Referencia;Versao;Valor_Patrimonial_Cotas;Patrimonio_Liquido;Cotas_Emitidas;Total_Numero_Cotistas\n11.111.111/0001-11;2026-09-30;1;95,75;6000000000;62660000;90000\n22.222.222/0001-22;2026-09-30;1;0,75;750;1000;1\n33.333.333/0001-33;2026-09-30;1;10;1000;300;5", "latin1"));
  const out: Record<string, { cnpj?: string; vpa: number | null; cotistas: number | null }> = {};
  ingestFii(geral, compl, out as never);
  assert.equal(out.SNCI.cnpj, "11111111000111");
  assert.equal(out.SNCI.cotistas, 90000);
  assert.ok(Math.abs((out.SNCI.vpa as number) - 95.75) < 0.1);
  // campo com valor divergente de PL ÷ cotas: vale a conta
  assert.ok(Math.abs((out.XPTO.vpa as number) - 1000 / 300) < 1e-9);
});

test("FII: P/VP absurdo não é exibido", () => {
  const a = analyzeFii({ price: 56, dividends12m: 11, vpa: 0.75, patrimonio: 1e8, cotistas: 100, taxaAdm: null, div12mPrev: 11, monthsPaid: 12, avgDailyVolume: 1e6 });
  const by = Object.fromEntries(a.map((i) => [i.id, i]));
  assert.equal(by.pvp.status, "nd");
  assert.equal(by.vpa.value, null);
});

test("proventos: mês atual ainda sem registro não derruba o 12 meses nem a regularidade (caso SNEL11/SNCI11)", async () => {
  const { monthsPaid, sum12, nextEstimate, monthCalendar } = await import("../src/lib/dividends");
  const d: { date: string; value: number }[] = [];
  const ms = ["2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07","2026-08","2026-09","2026-10"];
  ms.forEach((m) => d.push({ date: `${m}-17`, value: 0.1 }));
  const today = "2026-11-18";
  assert.equal(monthsPaid(d, today), 12); // antes: 11 (17/11/2025 caía fora e novembro/2026 ainda não existe)
  assert.ok(Math.abs(sum12(d, today).cur - 1.2) < 1e-9);
  assert.equal(monthCalendar(d, today)[10].items.length, 1);
  const nx = nextEstimate(d, today);
  assert.equal(nx?.date, "2026-11-18"); // ainda em novembro, não pula para dezembro
  assert.match(nx?.basis ?? "", /ainda não registrado/);
  // quando novembro aparece, a janela volta a ser móvel e continua com 12 meses
  const d2 = [...d, { date: "2026-11-17", value: 0.1 }];
  assert.equal(monthsPaid(d2, today), 12);
  assert.ok(Math.abs(sum12(d2, today).cur - 1.2) < 1e-9);
});

test("maiores valores de mercado: lê linhas da tabela da CompaniesMarketCap e ignora o que não é linha de ativo", async () => {
  const { parseTopCaps, parseMoneyText } = await import("../src/lib/topcaps");
  const row = (rank: number, logo: string, name: string, code: string, cap: string, capNum: number, price: string, priceNum: number, cls: string, pct: string) =>
    `<tr><td class="fav"></td><td class="rank-td td-right" data-sort="${rank}">${rank}</td><td class="name-td"><div class="logo-container"><img class="company-logo" src="/img/company-logos/64/${logo}.webp" alt="${name} logo"></div><a href="/${name.toLowerCase()}/marketcap/"><div class="name-div"><div class="company-name">${name}</div><div class="company-code"><span class="rank d-none"></span>${code}</div></div></a></td><td class="td-right" data-sort="${capNum}">${cap}</td><td class="td-right" data-sort="${priceNum}">${price}</td><td data-sort="1"><span class="${cls}">${pct}</span></td></tr>`;
  const html = `<table><thead><tr><th>Rank</th></tr></thead><tbody>${[
    row(1, "AAPL", "Apple", "AAPL", "$5.121 T", 5.121e12, "$352.45", 352.45, "percentage-green", "0.15%"),
    row(2, "MSFT", "Microsoft", "MSFT", "$3.774 T", 3.774e12, "$508.29", 508.29, "percentage-red", "1.20%"),
    row(3, "2222.SR", "Saudi Aramco", "2222.SR", "$1.703 T", 1.703e12, "$7.04", 7.04, "percentage-green", "0.5%"),
    row(4, "NVDA", "NVIDIA", "NVDA", "$3.645 T", 3.645e12, "$150.96", 150.96, "percentage-green", "2%"),
    row(5, "GOOG", "Alphabet &amp; Co", "GOOG", "$3.432 T", 3.432e12, "$279.20", 279.2, "percentage-red", "0.3%"),
  ].join("")}</tbody></table>`;
  const r = parseTopCaps(html);
  assert.equal(r.length, 5);
  assert.equal(r[0].ticker, "AAPL");
  assert.equal(r[0].marketCap, 5.121e12);
  assert.equal(r[0].price, 352.45);
  assert.equal(r[0].change30d, 0.15);
  assert.equal(r[1].change30d, -1.2);
  assert.equal(r[2].ticker, "2222.SR");
  assert.equal(r[2].logo, "https://companiesmarketcap.com/img/company-logos/64/2222.SR.webp");
  assert.equal(r[4].name, "Alphabet & Co");
  assert.equal(parseTopCaps("<html>sem tabela</html>").length, 0);
  assert.equal(parseMoneyText("$5.121 T"), 5.121e12);
});

test("maiores valores de mercado: Bitcoin e Ethereum (linhas sem link) também entram", async () => {
  const { parseTopCaps } = await import("../src/lib/topcaps");
  const btc = `<tr><td class="rank-td td-right" data-sort="14">14</td><td class="name-td"><div class="logo-container"><img class="company-logo" src="https://companiesmarketcap.com/img/company-logos/64/BTC.X.png" alt="Bitcoin logo"></div><div class="name-div"><div class="company-name">Bitcoin</div><div class="company-code">BTC</div></div></td><td class="td-right" data-sort="1282000000000">$1.282 T</td><td class="td-right" data-sort="63755">$63,755</td><td data-sort="-1.36"><span class="percentage-red">1.36%</span></td></tr>`;
  const eth = `<tr><td class="rank-td td-right" data-sort="84">84</td><td class="name-td"><img class="company-logo" src="/img/company-logos/64/ETH.X.png" alt="Ethereum logo"></td><td class="td-right" data-sort="220320000000">$220.32 B</td><td class="td-right" data-sort="1802">$1,802</td><td><span class="percentage-red">0.46%</span></td></tr>`;
  const gold = `<tr><td class="rank-td td-right" data-sort="1">1</td><td><img class="company-logo" src="/img/company-logos/64/GOLD.XM.png" alt="Gold logo"><a href="/gold/marketcap/"><div class="company-name">Gold</div><div class="company-code">GOLD</div></a></td><td class="td-right" data-sort="25999000000000">$25.999 T</td><td data-sort="3739">$3,739</td><td><span class="percentage-red">0.07%</span></td></tr>`;
  const r = parseTopCaps(`<table>${gold}${btc}${eth}</table>`);
  assert.deepEqual(r.map((x) => x.ticker), ["GOLD", "BTC", "ETH"]);
  assert.equal(r[1].name, "Bitcoin");
  assert.equal(r[1].marketCap, 1.282e12);
  assert.equal(r[1].change30d, -1.36);
  assert.equal(r[2].name, "Ethereum"); // sem company-name: nome vem do alt, sem a palavra "logo"
  assert.equal(r[2].rank, 84);
  assert.equal(r[2].logo, "https://companiesmarketcap.com/img/company-logos/64/ETH.X.png");
});

test("zoom do tempo do gráfico on-chain: aproxima, afasta, ancora no cursor e volta ao início", async () => {
  const { zoomWindow } = await import("../src/lib/timezoom");
  const n = 1000;
  // aproximar no centro de 0..999 → janela menor, com o centro preservado
  const a = zoomWindow(0, 999, n, 0.5, 0.5)!;
  assert.ok(a[1] - a[0] < 999 && a[1] - a[0] >= 14);
  assert.ok(Math.abs((a[0] + a[1]) / 2 - 499.5) <= 1);
  // âncora na esquerda: o início fica parado
  const b = zoomWindow(100, 500, n, 0.5, 0)!;
  assert.equal(b[0], 100);
  // afastar além do total → null (reset)
  assert.equal(zoomWindow(100, 500, n, 10, 0.5), null);
  // não passa do mínimo nem sai dos limites
  const c = zoomWindow(990, 999, n, 0.1, 1)!;
  assert.ok(c[1] <= 999 && c[0] >= 0 && c[1] - c[0] >= 14);
  const d = zoomWindow(0, 200, n, 1.25, 0)!;
  assert.equal(d[0], 0);
  assert.equal(d[1] - d[0], 250);
});

test("caneta do gráfico: distância a traços (borracha)", async () => {
  const { distToSegment, distToStroke } = await import("../src/lib/pen");
  assert.equal(distToSegment(5, 5, 0, 0, 10, 0), 5);
  assert.equal(distToSegment(-3, 4, 0, 0, 10, 0), 5); // além da ponta: distância até o extremo
  assert.equal(distToStroke(5, 3, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]), 3);
  assert.equal(distToStroke(0, 0, [{ x: 3, y: 4 }]), 5);
  assert.equal(distToStroke(0, 0, []), Infinity);
});

test("gráfico on-chain: a janela pode passar das pontas dos dados (espaço vazio), mas sempre sobra dado à vista", async () => {
  const { clampStart, overshoot, zoomWindow } = await import("../src/lib/timezoom");
  const n = 1000, span = 200;
  assert.equal(overshoot(span), 170);
  assert.equal(clampStart(5000, span, n), n - 1 - span + 170); // direita: o último dado pode ir quase até a borda esquerda
  assert.equal(clampStart(-5000, span, n), -170); // esquerda
  assert.equal(clampStart(300, span, n), 300); // dentro: não mexe
  // com a janela já deslocada para a direita, aproximar/afastar não a joga de volta para dentro
  const w = zoomWindow(900, 1100, n, 0.5, 0.5)!;
  assert.ok(w[1] > 999);
  // pelo menos 15% da janela continua com dados
  const a = clampStart(5000, span, n);
  assert.ok((n - 1 - a) / span >= 0.14);
});
