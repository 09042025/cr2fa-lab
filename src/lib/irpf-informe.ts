/**
 * Leitura local dos informes de rendimentos (PDF/CSV/TXT). Tudo acontece no navegador: o arquivo nunca é enviado.
 * O leitor é genérico (procura seção, código e CNPJ + valores) e TODO resultado passa por conferência do usuário
 * antes de entrar na declaração. Leitores específicos por instituição entram depois, com informes reais de exemplo.
 */
import type { ExtraProv, PortfolioItem, ProvType, Workspace } from "./irpf";
import { parseNum } from "./irpf";

export interface InformeLine { id: string; tipo: ProvType | "outro"; codigo: string; cnpj: string; fonte: string; valor: number; irrf: number; arquivo: string }
export interface InformeResult { lines: InformeLine[]; warnings: string[] }

const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/;
const MONEY_RE = /-?\d{1,3}(?:\.\d{3})*,\d{2}\b/g;
const fmtCnpj = (d: string) => { const s = d.replace(/\D/g, ""); return s.length === 14 ? `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}` : d; };
const looksFund = (n: string) => /fundo|\bfii\b|fiagro|imobili|\b[a-z]{4}\s?11\b/i.test(n);

/** Lê texto já extraído (uma string por linha) e devolve as linhas de rendimento reconhecidas. */
export function parseInforme(rawLines: string[], arquivo: string): InformeResult {
  const lines: InformeLine[] = []; const warnings: string[] = [];
  let sec: "isento" | "exclusivo" | null = null; let codigo = ""; let pend: { cnpj: string; nome: string } | null = null; let n = 0;
  for (const raw of rawLines) {
    const l = raw.replace(/\s+/g, " ").trim(); if (!l) continue;
    if (/isentos?\s+e\s+n[ãa]o\s+tribut/i.test(l)) { sec = "isento"; codigo = ""; pend = null; continue; }
    if (/tributa[çc][ãa]o\s+exclusiva|definitiva/i.test(l)) { sec = "exclusivo"; codigo = ""; pend = null; continue; }
    if (/rendimentos?\s+tribut[áa]veis|bens\s+e\s+direitos|d[ií]vidas/i.test(l) && !/n[ãa]o\s+tribut/i.test(l)) { sec = null; codigo = ""; pend = null; continue; }
    const c = /^(\d{2})\s*[-–.:)]\s*([^\d].*)$/.exec(l); if (c) { codigo = c[1]; pend = null; if (!MONEY_RE.test(l)) continue; MONEY_RE.lastIndex = 0; }
    const cn = CNPJ_RE.exec(l); const vals = (l.match(MONEY_RE) ?? []).map((v) => parseNum(v)).filter((v): v is number => v !== null);
    if (!sec && !codigo) continue;
    if (cn && !vals.length) { pend = { cnpj: fmtCnpj(cn[0]), nome: l.slice(cn.index + cn[0].length).trim() || l.slice(0, cn.index).trim() }; continue; }
    const src = cn ? { cnpj: fmtCnpj(cn[0]), nome: l.slice(cn.index + cn[0].length, l.search(/-?\d{1,3}(?:\.\d{3})*,\d{2}\b/)).trim() } : pend;
    if (!src || !vals.length) continue;
    const valor = vals[vals.length - 1]; if (!(valor > 0)) continue;
    const cod = codigo || (sec === "exclusivo" ? "10" : "09");
    const tipo: InformeLine["tipo"] = cod === "10" ? "jcp" : cod === "09" ? (looksFund(src.nome) ? "fii" : "dividendos") : cod === "26" ? "fii" : "outro";
    lines.push({ id: `${arquivo}#${n++}`, tipo, codigo: cod, cnpj: src.cnpj, fonte: src.nome.replace(/^[-–|:\s]+|[-–|:\s]+$/g, ""), valor, irrf: 0, arquivo }); pend = null;
  }
  if (!lines.length) warnings.push(`Não reconheci rendimentos em "${arquivo}". Pode ser PDF escaneado (imagem) ou um formato que ainda não aprendi: digite os valores à mão na ficha.`);
  return { lines, warnings };
}

/** CSV/TXT: junta como linhas de texto separadas por ; ou tab. */
export function textToLines(t: string): string[] { return t.split(/\r?\n/).map((l) => l.replace(/[;\t]+/g, " ")); }

/** Extrai o texto de um PDF no navegador (pdf.js), agrupando por linha. */
export async function extractPdfLines(file: File): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const it of tc.items) { if (!("str" in it) || !it.str.trim()) continue; const y = Math.round(it.transform[5] / 3); const r = rows.get(y) ?? []; r.push({ x: it.transform[4], s: it.str }); rows.set(y, r); }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) out.push(rows.get(y)!.sort((a, b) => a.x - b.x).map((c) => c.s).join(" "));
  }
  return out;
}

export async function readInforme(file: File): Promise<InformeResult> {
  const lines = /\.pdf$/i.test(file.name) ? await extractPdfLines(file) : textToLines(await file.text());
  return parseInforme(lines, file.name);
}

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** Aplica as linhas conferidas: se o CNPJ é de um ativo da carteira, ajusta o provento dele; senão vira lançamento extra. */
export function applyInformes(ws: Workspace, lines: InformeLine[], items: PortfolioItem[]): Workspace {
  const prov = { ...ws.prov }; const extras: ExtraProv[] = (ws.extras ?? []).filter((e) => !lines.some((l) => l.id === e.id)); const done = new Set<string>();
  for (const l of lines) {
    const it = l.cnpj ? items.find((i) => digits(i.cnpj) === digits(l.cnpj) && (i.kind === "acao" || i.kind === "fii")) : undefined;
    const allowed: ProvType[] = it?.kind === "fii" ? ["fii"] : ["dividendos"]; // JCP entra como lançamento próprio (a ação pode ter os dois)
    if (it && l.tipo !== "outro" && allowed.includes(l.tipo)) {
      // vários informes do mesmo ativo: soma
      const k = `${it.key}|${l.tipo}`; const base = done.has(k) ? (prov[it.key]?.gross ?? 0) : 0; done.add(k);
      prov[it.key] = { ...prov[it.key], type: l.tipo, gross: Math.round((base + l.valor) * 100) / 100, irrf: null };
    } else extras.push({ id: l.id, tipo: l.tipo, codigo: l.codigo, cnpj: l.cnpj, fonte: l.fonte, valor: l.valor, irrf: l.irrf, origem: l.arquivo });
  }
  return { ...ws, prov, extras };
}
