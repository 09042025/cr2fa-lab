/**
 * PDF da declaração simulada, montado no navegador (nada é enviado). Segue o modelo da declaração impressa pelo
 * programa da Receita (cabeçalho, fichas na mesma ordem, colunas e rótulos), para o usuário ir copiando para o programa.
 * Dados pessoais (nome, CPF, endereço) não existem no Niza: ficam para preencher direto no programa.
 */
import { fmtField, upNoAccent, type BemRow, type CustomBem, type ExtraProv, type ProvRow, type ProvType } from "./irpf";

export interface PdfInput { year: number; bens: BemRow[]; custom: CustomBem[]; prov: ProvRow[]; extras?: ExtraProv[] }

/** Fontes padrão do PDF só têm Latin-1: troca o que sair disso. */
const clean = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/[·•●]/g, "-").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/→/g, ">").replace(/[^ -ÿ\n]/g, "?");

const PROG: Record<Exclude<ProvType, "exterior">, { codigo: string; nome: string }> = {
  dividendos: { codigo: "09", nome: "Lucros e dividendos recebidos" },
  fii: { codigo: "26", nome: "Outros" },
  jcp: { codigo: "10", nome: "Juros sobre capital próprio" },
};

export async function buildIrpfPdf(inp: PdfInput): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 10, R = W - M;
  let y = 0;
  const g = (v: number): [number, number, number] => [v, v, v];

  const header = () => {
    doc.setDrawColor(0); doc.setLineWidth(0.4); doc.rect(M, 8, W - 2 * M, 17);
    doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("NOME:  (preencha no programa da Receita)", M + 2, 13);
    doc.text("CPF:  (preencha no programa da Receita)", M + 2, 18.5);
    doc.text("DECLARAÇÃO DE AJUSTE ANUAL (SIMULADO)", M + 2, 23.5);
    doc.text("IMPOSTO SOBRE A RENDA - PESSOA FÍSICA", 118, 13);
    doc.text(`EXERCÍCIO ${inp.year + 1}`, 118, 20);
    doc.text(`ANO-CALENDÁRIO ${inp.year}`, R - 2, 20, { align: "right" });
    doc.setLineWidth(0.2); y = 30;
  };
  const ensure = (h: number, again?: () => void) => { if (y + h > 280) { doc.addPage(); header(); again?.(); } };
  const font = (size: number, bold = false, color = 0) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(color); };
  const wrap = (t: string, w: number) => doc.splitTextToSize(clean(t), w) as string[];
  const section = (title: string, right?: string) => {
    ensure(14); y += 3; font(9.5, true); doc.text(clean(title), M + 1, y);
    if (right) { font(8); doc.text(right, R - 2, y, { align: "right" }); }
    y += 1.6; doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(M, y, R, y); doc.setLineWidth(0.2); y += 4.5;
  };
  const note = (t: string, color = 80, size = 8) => { font(size, false, color); for (const l of wrap(t, W - 2 * M - 4)) { ensure(4); doc.text(l, M + 2, y); y += size * 0.44 + 0.6; } };
  const total = (label: string, v: string) => { ensure(8); doc.setDrawColor(120); doc.line(M, y, R, y); y += 4.5; font(8.5, true); doc.text(label, M + 1, y); doc.text(v, R - 2, y, { align: "right" }); y += 4; };

  header();

  /* ---- como usar (faixa do Niza, fora do modelo da Receita) ---- */
  doc.setFillColor(245, 242, 230); doc.rect(M, y, W - 2 * M, 30, "F");
  font(8.5, true, 90); doc.text("SIMULADO NIZA INVEST - COMO USAR", M + 2, y + 5);
  font(7.8, false, 60);
  let ty = y + 9.5;
  for (const l of [
    "1. Abra o programa IRPF da Receita (baixe só em gov.br/receitafederal). As fichas abaixo têm os mesmos nomes e a mesma ordem do programa.",
    "2. Em cada ficha do programa, clique em Novo e copie campo por campo (Grupo, Código, País, CNPJ, Discriminação, Situações).",
    "3. Este documento NÃO é a declaração oficial e não é criptografado: foi gerado no seu aparelho, guarde com cuidado e apague depois de usar.",
    "4. Fichas marcadas 'preencher no programa' são dados que o Niza não guarda (pessoais, empregador, despesas, dívidas, renda variável).",
  ]) for (const w of wrap(l, W - 2 * M - 4)) { doc.text(w, M + 2, ty); ty += 3.4; }
  y += 32;

  /* ---- fichas que o Niza não guarda ---- */
  const prog = (title: string) => { section(title); note("Preencher no programa (o Niza não guarda estes dados)."); y += 1; };
  prog("IDENTIFICAÇÃO DO CONTRIBUINTE");
  prog("DEPENDENTES");
  prog("RENDIMENTOS TRIBUTÁVEIS RECEBIDOS DE PESSOA JURÍDICA PELO TITULAR");
  prog("RENDIMENTOS TRIBUTÁVEIS RECEBIDOS DE PESSOA FÍSICA E DO EXTERIOR PELO TITULAR");

  /* ---- tabela de rendimentos (Beneficiário / CPF / CNPJ / Nome / Valor) ---- */
  const colHead = () => { font(7.5, false, 90); doc.text("Beneficiário", M + 5, y); doc.text("CPF", M + 30, y); doc.text("CNPJ da Fonte Pagadora", M + 52, y); doc.text("Nome da Fonte Pagadora", M + 123, y, { align: "center" }); doc.text("Valor", R - 12, y, { align: "right" }); y += 5; };
  const provTable = (code: string, nome: string, rows: { cnpj: string; payer: string; valor: string; v: number }[]) => {
    ensure(24); font(8.5); doc.text(`${code}. ${nome}`, M + 1, y);
    const sum = rows.reduce((a, r) => a + r.v, 0); font(8.5); doc.text(fmtField(sum), R - 2, y, { align: "right" }); y += 5.5;
    colHead();
    for (const r of rows) {
      const nm = wrap(upNoAccent(r.payer), 50); const h = Math.max(1, nm.length) * 3.6 + 1.5;
      ensure(h, colHead);
      font(8); doc.text("Titular", M + 5, y); doc.text("-", M + 30, y); doc.text(r.cnpj || "-", M + 52, y);
      nm.forEach((l, i) => doc.text(l, M + 123, y + i * 3.6, { align: "center" })); doc.text(r.valor, R - 12, y, { align: "right" });
      y += h;
    }
    y += 2; return sum;
  };
  const rows = (t: ProvType) => inp.prov.filter((p) => p.type === t && p.gross > 0);
  const toRows = (list: ProvRow[], liquid = false) => list.map((p) => { const v = liquid ? p.gross - p.irrf : p.gross; return { cnpj: p.cnpj, payer: p.payer, v, valor: fmtField(v) }; });
  const exRows = (f: (x: ExtraProv) => boolean) => (inp.extras ?? []).filter(f).map((x) => ({ cnpj: x.cnpj, payer: x.fonte || x.cnpj, v: x.valor, valor: fmtField(x.valor) }));

  section("RENDIMENTOS ISENTOS E NÃO TRIBUTÁVEIS", "(Valores em Reais)");
  let isentos = 0;
  const d09 = [...toRows(rows("dividendos")), ...exRows((x) => x.tipo === "dividendos" || (x.tipo === "outro" && x.codigo === "09"))];
  const d26 = [...toRows(rows("fii")), ...exRows((x) => x.tipo === "fii" || (x.tipo === "outro" && x.codigo === "26"))];
  if (d09.length) isentos += provTable(PROG.dividendos.codigo, PROG.dividendos.nome, d09);
  if (d26.length) isentos += provTable(PROG.fii.codigo, PROG.fii.nome, d26);
  if (!isentos) note("Nenhum rendimento calculado a partir da carteira.");
  else note("Fundos imobiliários: use o código indicado no informe de rendimentos do administrador/corretora (declarações anteriores podem ter usado 09).", 90, 7.5);
  total("TOTAL", fmtField(isentos));

  section("RENDIMENTOS SUJEITOS À TRIBUTAÇÃO EXCLUSIVA / DEFINITIVA", "(Valores em Reais)");
  let excl = 0;
  const dj = [...toRows(rows("jcp"), true), ...exRows((x) => x.tipo === "jcp")];
  if (dj.length) { excl += provTable(PROG.jcp.codigo, PROG.jcp.nome, dj); note("JCP: informe o valor líquido (já sem os 15% retidos). Confirme no informe de rendimentos.", 90, 7.5); }
  const ext = rows("exterior");
  if (ext.length) {
    ensure(24); font(8.5); doc.text("12. Aplicações Financeiras e Lucros e Dividendos no Exterior (Lei 14.754/2023)", M + 1, y); y += 5.5;
    font(7.5, false, 90); doc.text("Nome do ativo / pagador", M + 5, y); doc.text("Valor recebido (US$) - converter para R$ pelo dólar de cada recebimento", R - 2, y, { align: "right" }); y += 5;
    for (const p of ext) { ensure(6); font(8); doc.text(clean(upNoAccent(p.payer)), M + 5, y); doc.text(`US$ ${fmtField(p.gross)}`, R - 12, y, { align: "right" }); y += 4.4; }
    note("Ficha própria do programa para a Lei 14.754 (dividendos e ganhos no exterior). Confira com um contador.", 90, 7.5);
  }
  if (!excl && !ext.length) note("Nenhum rendimento calculado a partir da carteira.");
  total("TOTAL", fmtField(excl));

  prog("IMPOSTO PAGO / RETIDO");
  prog("PAGAMENTOS EFETUADOS");

  /* ---- Bens e Direitos ---- */
  const bensHead = () => {
    font(7.5, false, 60); doc.text("BEM", M + 6, y); doc.text("GRUPO", M + 17, y); doc.text("CÓDIGO", M + 30, y); doc.text("DISCRIMINAÇÃO", M + 46, y);
    doc.text("SITUAÇÃO EM", 160, y, { align: "center" }); y += 4;
    doc.text(`31/12/${inp.year - 1}`, 141, y); doc.text(`31/12/${inp.year}`, 178, y); y += 2; doc.setDrawColor(0); doc.line(M, y, R, y); y += 5;
  };
  ensure(60);
  section("DECLARAÇÃO DE BENS E DIREITOS", "(Valores em Reais)");
  bensHead();
  let n = 0, somaAnt = 0, somaAtu = 0;
  const block = (o: { grupo: string; codigo: string; pais: string; disc: string; ant: number | null; atu: number | null; lines: string[]; extra?: string[] }) => {
    n++;
    const disc = wrap(o.disc, 80);
    const h = Math.max(disc.length * 3.6, 8) + (1 + o.lines.length + (o.extra?.length ?? 0)) * 4.2 + 5;
    ensure(h, bensHead);
    font(8); doc.text(String(n), M + 8, y, { align: "right" }); doc.text(o.grupo, M + 19, y); doc.text(o.codigo, M + 32, y);
    disc.forEach((l, i) => doc.text(l, M + 46, y + i * 3.6));
    doc.text(o.ant === null ? "0,00" : fmtField(o.ant), 141, y); doc.text(o.atu === null ? "0,00" : fmtField(o.atu), 178, y);
    y += Math.max(disc.length * 3.6, 8);
    font(8); doc.text(clean(o.pais), M + 1, y); doc.text("Bem com usufruto:  Não", 141, y); y += 4.8;
    font(7.8); for (const l of o.lines) { doc.text(clean(l), M + 1, y); y += 4.2; }
    if (o.extra) for (const l of o.extra) { doc.text(clean(l), M + 1, y); y += 4.2; }
    doc.setDrawColor(0); doc.setLineWidth(0.15); doc.line(M, y, R, y); doc.setLineWidth(0.2); y += 4.5;
    somaAnt += o.ant ?? 0; somaAtu += o.atu ?? 0;
  };
  for (const b of inp.bens) {
    const k = b.item.kind, t = upNoAccent(b.item.ticker ?? "");
    const lines = ["Bem ou direito pertencente ao:  Titular      CPF: (do titular)"];
    const extra: string[] = [];
    if (k === "acao") { lines.push(`CNPJ:  ${b.cnpj || "(informe o CNPJ)"}`); lines.push(`Negociados em Bolsa:  Sim      Código de Negociação: ${t}`); }
    else if (k === "fii") { lines.push(`CNPJ do Fundo:  ${b.cnpj || "(informe o CNPJ)"}`); lines.push(`Negociados em Bolsa:  Sim      Código de Negociação: ${t}`); }
    else if (k === "acao_us") {
      lines.push(`Negociados em Bolsa:  Sim      Código de Negociação: ${t}`);
      extra.push("Aplicação Financeira (R$): Rendimento ou Perda e Imposto Pago no Exterior - calcular", "Lucros e Dividendos (R$): Valor Recebido e Imposto Pago Exterior/IRRF Brasil - ver informe");
    } else if (k === "cripto") { lines.push("Autocustodiante:  (Sim = carteira própria; Não = exchange)"); if (b.code.codigo === "02") lines.push(`Código Altcoin: ${t}`); }
    block({ grupo: b.code.grupo, codigo: b.code.codigo, pais: `${b.pais.codigo} - ${b.pais.codigo === "249" ? "ESTADOS UNIDOS DA AMERICA" : upNoAccent(b.pais.nome)}`, disc: b.text, ant: b.prev, atu: b.foreign ? b.total : b.total, lines, extra });
  }
  for (const c of inp.custom) block({ grupo: c.grupo, codigo: c.codigo, pais: "105 - BRASIL", disc: c.discriminacao, ant: c.prev, atu: c.valor, lines: ["Bem ou direito pertencente ao:  Titular      CPF: (do titular)"] });
  if (!n) note("Nenhum bem informado.");
  total("TOTAL", `${fmtField(somaAnt)}        ${fmtField(somaAtu)}`);
  note("Ativos no exterior: informe o valor em reais pela cotação (PTAX) da data de compra. Ações, FIIs e cripto entram pelo custo de aquisição.", 90, 7.5);

  prog("DÍVIDAS E ÔNUS REAIS");

  section("EVOLUÇÃO PATRIMONIAL");
  font(8.5); doc.text(`Bens e direitos em 31/12/${inp.year - 1}`, M + 3, y); doc.text(fmtField(somaAnt), R - 2, y, { align: "right" }); y += 4.6;
  doc.text(`Bens e direitos em 31/12/${inp.year}`, M + 3, y); doc.text(fmtField(somaAtu), R - 2, y, { align: "right" }); y += 6;
  note("Antes de entregar: confira cada valor com os informes de rendimentos, use Ferramentas > Verificar pendências no programa e guarde o recibo. Conteúdo informativo; não substitui um contador nem as orientações da Receita Federal.", 100, 7.5);

  /* ---- marca d'água e rodapé em todas as páginas ---- */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setTextColor(...g(238)); doc.setFont("helvetica", "bold"); doc.setFontSize(46);
    doc.text("SIMULADO NIZA", 52, 215, { angle: 45 });
    font(8, false, 110); doc.text(`Página ${p} de ${pages}`, W / 2, 290, { align: "center" });
  }
  return doc.output("blob");
}
