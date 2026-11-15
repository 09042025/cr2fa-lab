/**
 * PDF do roteiro de preenchimento, montado no navegador (nada é enviado). Tem a mesma ordem e os mesmos nomes das
 * fichas do programa da Receita, para o usuário ir copiando para o programa oficial.
 */
import { PROV_INFO, fmtField, programCode, type BemRow, type CustomBem, type ProvRow } from "./irpf";

export interface PdfInput { year: number; bens: BemRow[]; custom: CustomBem[]; prov: ProvRow[] }

/** Fontes padrão do PDF só têm Latin-1: troca o que sair disso. */
const clean = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/[·•●]/g, "-").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/→/g, ">").replace(/[^ -ÿ\n]/g, "?");

export async function buildIrpfPdf(inp: PdfInput): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 16, CW = W - M * 2;
  let y = M;
  const gold: [number, number, number] = [160, 120, 20];
  const ensure = (h: number) => { if (y + h > 280) { doc.addPage(); y = M; } };
  const text = (t: string, o: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}) => {
    doc.setFont("helvetica", o.bold ? "bold" : "normal"); doc.setFontSize(o.size ?? 10); doc.setTextColor(...(o.color ?? [30, 30, 30]));
    const lines = doc.splitTextToSize(clean(t), CW - (o.indent ?? 0)) as string[];
    const lh = (o.size ?? 10) * 0.42;
    for (const l of lines) { ensure(lh + 1); doc.text(l, M + (o.indent ?? 0), y); y += lh + 0.9; }
    y += o.gap ?? 0;
  };
  const rule = () => { ensure(4); doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 3; };
  const row = (label: string, value: string) => { text(label.toUpperCase(), { size: 7, color: [110, 110, 110] }); text(value || "-", { size: 10, bold: true, gap: 1 }); };

  const money = (v: number | null) => (v === null ? "-" : `R$ ${fmtField(v)}`);
  const nBens = inp.bens.length + inp.custom.length;

  text("Roteiro de preenchimento do Imposto de Renda", { size: 18, bold: true, color: gold, gap: 1 });
  text(`Declaração de ${inp.year + 1} (ano-calendário ${inp.year}) - Pessoa Física`, { size: 11, gap: 2 });
  text("DOCUMENTO CONFIDENCIAL. Foi gerado no seu aparelho, não é criptografado e não foi enviado a ninguém. Guarde com cuidado e apague depois de usar. Este roteiro NÃO é a declaração oficial: copie os dados abaixo para o programa da Receita Federal e confira cada valor com os informes de rendimentos.", { size: 8.5, color: [150, 40, 40], gap: 3 });
  rule();
  text("Resumo", { size: 12, bold: true, gap: 1 });
  text(`Bens e direitos a lançar: ${nBens}`);
  const total = inp.bens.reduce((a, b) => a + (b.foreign ? 0 : b.total ?? 0), 0) + inp.custom.reduce((a, c) => a + c.valor, 0);
  text(`Soma das situações em 31/12/${inp.year} (sem ativos no exterior): ${money(total)}`);
  text(`Rendimentos a lançar: ${inp.prov.length} fonte(s) pagadora(s)`, { gap: 3 });

  text("Como usar este roteiro", { size: 12, bold: true, gap: 1 });
  ["Abra o programa IRPF da Receita Federal (baixe somente em gov.br/receitafederal) e crie ou abra a declaração do ano certo.",
   "Na barra da esquerda, abra a ficha indicada em cada título abaixo (os nomes são os mesmos do programa).",
   "Clique em Novo, preencha cada campo na ordem em que aparece aqui e copie o texto da Discriminação exatamente como está.",
   "Ao terminar todas as fichas, use Ferramentas > Verificar pendências e depois Entregar declaração. Guarde o recibo."].forEach((t, i) => text(`${i + 1}. ${t}`, { indent: 2 }));
  y += 2;

  /* ------------------------------ Bens e Direitos ------------------------------ */
  doc.addPage(); y = M;
  text("Ficha: Bens e Direitos", { size: 15, bold: true, color: gold, gap: 1 });
  text(`No programa: Fichas da Declaração > Bens e Direitos > Novo. Situação em 31/12/${inp.year - 1} (anterior) e em 31/12/${inp.year} (atual).`, { size: 9, gap: 3 });
  let n = 0;
  const bemBlock = (code: { grupo: string; codigo: string }, pais: string, cnpj: string, disc: string, ant: number | null, atu: number | null, extra?: string) => {
    n++;
    ensure(70);
    rule();
    text(`Bem ${n} de ${nBens}`, { size: 11, bold: true, gap: 1 });
    const pc = programCode(code.grupo, code.codigo);
    row("Grupo", pc.grupo); row("Código", pc.codigo); row("Localização (País)", pais);
    if (cnpj) row("CNPJ", cnpj);
    text("DISCRIMINAÇÃO", { size: 7, color: [110, 110, 110] });
    text(disc, { size: 10, indent: 2, gap: 1 });
    row(`Situação em 31/12/${inp.year - 1}`, money(ant));
    row(`Situação em 31/12/${inp.year}`, atu === null ? "-" : money(atu));
    if (extra) text(extra, { size: 8.5, color: [150, 90, 10], gap: 1 });
  };
  for (const b of inp.bens) bemBlock(b.code, `${b.pais.codigo} - ${b.pais.nome}`, b.cnpj, b.text, b.prev, b.total, b.foreign ? "Ativo no exterior: o valor deve estar em reais, pela cotação (PTAX) da data de compra. Confira com um contador." : b.warnings.length ? `Conferir: ${b.warnings.join(" ")}` : undefined);
  for (const c of inp.custom) bemBlock({ grupo: c.grupo, codigo: c.codigo }, "105 - Brasil", "", c.discriminacao, c.prev, c.valor, c.review);
  if (!nBens) text("Nenhum bem informado.");

  /* ------------------------------- Rendimentos ------------------------------- */
  doc.addPage(); y = M;
  text("Fichas de Rendimentos", { size: 15, bold: true, color: gold, gap: 1 });
  text("Os valores são estimativas feitas pela carteira. Confirme sempre pelo informe de rendimentos da corretora ou do banco.", { size: 9, color: [150, 90, 10], gap: 3 });
  const types: ProvRow["type"][] = ["dividendos", "fii", "jcp", "exterior"];
  for (const t of types) {
    const list = inp.prov.filter((p) => p.type === t && p.gross > 0);
    if (!list.length) continue;
    const info = PROV_INFO[t];
    ensure(30); rule();
    text(`Ficha: ${info.ficha}`, { size: 12, bold: true, gap: 1 });
    text(`Tipo de rendimento${info.codigo !== "-" && info.codigo !== "—" ? `: ${info.codigo} - ${info.titulo}` : `: ${info.titulo}`}`, { size: 10, gap: 1 });
    for (const p of list) {
      ensure(24);
      row("Nome da fonte pagadora", p.payer); if (p.cnpj) row("CNPJ da fonte pagadora", p.cnpj);
      row(t === "jcp" ? "Valor bruto" : "Valor", p.currency === "USD" ? `US$ ${fmtField(p.gross)}` : money(p.gross));
      if (t === "jcp") row("Imposto retido na fonte", money(p.irrf));
    }
    text(info.dica, { size: 8.5, color: [90, 90, 90], gap: 2 });
  }
  if (!inp.prov.some((p) => p.gross > 0)) text("Nenhum provento informado.");

  /* ------------------------------ Conferência final ------------------------------ */
  ensure(60); rule();
  text("Antes de entregar", { size: 12, bold: true, gap: 1 });
  ["Confira os valores com os informes de rendimentos (corretoras, bancos, exchanges).", "Ações, FIIs e criptoativos entram pelo custo de aquisição, não pelo preço de mercado.", "Ativos vendidos: informe zero na situação atual e verifique ganho de capital e DARF.", "Use Ferramentas > Verificar pendências antes de enviar e guarde o recibo.", "Dúvidas ou ativos no exterior: consulte um contador."].forEach((t) => text(`[  ] ${t}`, { indent: 2 }));
  y += 3;
  text("Conteúdo informativo, baseado em regras gerais; não substitui um contador nem as orientações oficiais da Receita Federal.", { size: 8, color: [110, 110, 110] });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFontSize(8); doc.setTextColor(130); doc.text(clean(`NIZA INVEST - Roteiro IRPF ${inp.year + 1} - confidencial - página ${p} de ${pages}`), M, 290); }
  return doc.output("blob");
}
