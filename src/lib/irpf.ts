/**
 * Simulado da declaração de IRPF: monta Bens e Direitos e Rendimentos a partir da carteira.
 * Funções puras, rodam no navegador. Nada daqui é enviado ao servidor.
 * Informativo: confira códigos e valores no programa da Receita e nos informes de rendimentos (documentos oficiais).
 */

export type AssetKind = "acao" | "fii" | "cripto" | "acao_us" | "renda_fixa" | "outro";

export interface PortfolioItem {
  key: string; label: string; ticker: string | null; kind: AssetKind;
  qty: number | null; avg: number | null; valueCents: number;
  cnpj: string | null; legalName: string | null;
  /** Proventos do ano-calendário: data (ex) e valor por ação/cota, na moeda do ativo. */
  divs: { date: string; perShare: number }[];
}

export interface ItemEdit { custody?: string; cnpj?: string; qty?: number | null; avg?: number | null; text?: string; skip?: boolean }
export interface ProvEdit { type?: ProvType; gross?: number | null; irrf?: number | null }
export interface PrevBem { id: string; grupo: string; codigo: string; discriminacao: string; valor: number }
export interface CustomBem { id: string; grupo: string; codigo: string; discriminacao: string; valor: number; prev: number | null }
export interface Workspace {
  v: 1; year: number; previous: PrevBem[]; custom: CustomBem[];
  edits: Record<string, ItemEdit>; prov: Record<string, ProvEdit>; notes: string; savedAt: string;
  /** Fotografia dos bens em 31/12 do ano do arquivo: vira a "situação anterior" no ano seguinte. */
  snapshot?: PrevBem[];
}
export const emptyWorkspace = (year: number): Workspace => ({ v: 1, year, previous: [], custom: [], edits: {}, prov: {}, notes: "", savedAt: "" });

export type ProvType = "dividendos" | "jcp" | "fii" | "exterior";
export const PROV_INFO: Record<ProvType, { ficha: string; codigo: string; titulo: string; dica: string }> = {
  dividendos: { ficha: "Rendimentos Isentos e Não Tributáveis", codigo: "09", titulo: "Lucros e dividendos recebidos", dica: "Dividendos de ações brasileiras. Informe por empresa (fonte pagadora), com o CNPJ dela." },
  jcp: { ficha: "Rendimentos Sujeitos à Tributação Exclusiva/Definitiva", codigo: "10", titulo: "Juros sobre capital próprio (JCP)", dica: "Informe o valor bruto. O imposto de 15% já foi retido na fonte, e o informe de rendimentos mostra os dois valores." },
  fii: { ficha: "Rendimentos Isentos e Não Tributáveis", codigo: "26", titulo: "Outros: rendimentos de FII e Fiagro", dica: "Isento para pessoa física quando as cotas são negociadas em bolsa, o fundo tem 100 ou mais cotistas e você tem menos de 10% das cotas. Confirme no informe do fundo." },
  exterior: { ficha: "Aplicações Financeiras no Exterior (Lei 14.754)", codigo: "—", titulo: "Lucros e dividendos de ativos no exterior", dica: "Dividendos de ações dos EUA são tributados a 15% na declaração anual, em ficha própria do programa. Converta pela cotação do dólar da data de cada recebimento. Confira com um contador." },
};

export const defaultProvType = (k: AssetKind): ProvType | null => (k === "acao" ? "dividendos" : k === "fii" ? "fii" : k === "acao_us" ? "exterior" : null);

const STABLES = new Set(["USDT", "USDC", "DAI", "USDE", "TUSD", "FDUSD", "BUSD", "PYUSD", "USDS"]);

export interface Code { grupo: string; codigo: string; nome: string }
export function codeFor(i: Pick<PortfolioItem, "kind" | "ticker" | "label">): Code {
  switch (i.kind) {
    case "acao": case "acao_us": return { grupo: "03", codigo: "01", nome: "Participações Societárias: Ações" };
    case "fii": return { grupo: "07", codigo: "03", nome: "Fundos: Fundos de Investimento Imobiliário (FII)" };
    case "cripto": {
      const t = (i.ticker ?? "").toUpperCase();
      if (t === "BTC") return { grupo: "08", codigo: "01", nome: "Criptoativos: Bitcoin" };
      if (STABLES.has(t)) return { grupo: "08", codigo: "03", nome: "Criptoativos: Stablecoins" };
      return { grupo: "08", codigo: "02", nome: "Criptoativos: Altcoins (outros criptoativos)" };
    }
    case "renda_fixa":
      return /lci|lca|cri\b|cra\b/i.test(i.label) ? { grupo: "04", codigo: "03", nome: "Aplicações: títulos isentos (LCI, LCA, CRI, CRA)" } : { grupo: "04", codigo: "02", nome: "Aplicações: títulos públicos e privados (CDB, Tesouro...)" };
    default: return { grupo: "99", codigo: "99", nome: "Outros bens e direitos" };
  }
}

export const fmtCnpj = (d: string | null) => {
  const s = (d ?? "").replace(/\D/g, "");
  if (s.length !== 14) return d ?? "";
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
};
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 8 });

export interface BemRow {
  key: string; item: PortfolioItem; code: Code; qty: number | null; avg: number | null; custody: string; cnpj: string;
  /** Custo de aquisição total (quantidade × preço médio): é o que se declara, não o valor de mercado. */
  total: number | null; prev: number | null; text: string; autoText: string; warnings: string[]; foreign: boolean;
}

export function bemText(i: PortfolioItem, qty: number | null, avg: number | null, custody: string, cnpj: string): string {
  const total = qty && avg ? qty * avg : null;
  const where = custody ? ` Mantido(a) em ${custody}.` : "";
  const name = i.legalName ?? i.label;
  const cost = avg ? ` Custo médio de aquisição ${i.kind === "acao_us" ? "(converter para R$ pela PTAX da data de cada compra)" : ""}: ${brl(avg)} por unidade; custo total: ${total ? brl(total) : "—"}.` : "";
  switch (i.kind) {
    case "acao": return `${qty ? num(qty) : "—"} ações de ${name} (${i.ticker})${cnpj ? `, CNPJ ${cnpj}` : ""}.${where}${cost}`;
    case "fii": return `${qty ? num(qty) : "—"} cotas do ${name} (${i.ticker})${cnpj ? `, CNPJ ${cnpj}` : ""}.${where}${cost}`;
    case "acao_us": return `${qty ? num(qty) : "—"} ações de ${i.label} (${i.ticker}), negociadas em bolsa dos Estados Unidos.${where}${cost}`;
    case "cripto": return `${qty ? num(qty) : "—"} ${i.label} (${i.ticker}).${where}${avg ? ` Custo de aquisição: ${total ? brl(total) : "—"} (média de ${brl(avg)} por unidade).` : ""}`;
    default: return `${i.label}.${where}${i.valueCents ? ` Valor: ${brl(i.valueCents / 100)}.` : ""}`;
  }
}

/** Procura a situação do ano anterior no que foi importado/colado (pelo código do ativo na discriminação). */
export function prevFor(i: PortfolioItem, prev: PrevBem[]): number | null {
  if (!i.ticker) return null;
  const re = new RegExp(`\\b${i.ticker.replace(/[^A-Z0-9]/gi, "")}\\b`, "i");
  const hits = prev.filter((p) => re.test(p.discriminacao));
  return hits.length ? hits.reduce((a, p) => a + p.valor, 0) : null;
}

export function buildBens(items: PortfolioItem[], ws: Workspace): BemRow[] {
  const out: BemRow[] = [];
  for (const i of items) {
    const e = ws.edits[i.key] ?? {};
    if (e.skip) continue;
    const qty = e.qty !== undefined ? e.qty : i.qty;
    const avg = e.avg !== undefined ? e.avg : i.avg;
    const custody = e.custody ?? "";
    const cnpj = e.cnpj ?? fmtCnpj(i.cnpj);
    const total = qty && avg ? Math.round(qty * avg * 100) / 100 : i.kind === "renda_fixa" || i.kind === "outro" ? i.valueCents / 100 : null;
    const warnings: string[] = [];
    if (i.kind !== "renda_fixa" && i.kind !== "outro") {
      if (!qty) warnings.push("Informe a quantidade que você tinha em 31/12.");
      if (!avg) warnings.push("Informe o preço médio (custo de aquisição): a declaração usa o custo, não o preço de hoje.");
    }
    if ((i.kind === "acao" || i.kind === "fii") && !cnpj) warnings.push("Informe o CNPJ da empresa/fundo (consta no informe de rendimentos).");
    if (!custody) warnings.push("Informe a corretora/exchange onde o ativo está.");
    if (i.kind === "acao_us") warnings.push("Ativo no exterior: o programa pede o país (Estados Unidos) e o valor em R$ pela PTAX da compra. Confira com um contador.");
    const autoText = bemText(i, qty, avg, custody, cnpj);
    out.push({ key: i.key, item: i, code: codeFor(i), qty, avg, custody, cnpj, total, prev: prevFor(i, ws.previous), text: e.text ?? autoText, autoText, warnings, foreign: i.kind === "acao_us" });
  }
  return out;
}

export interface ProvRow {
  key: string; item: PortfolioItem; type: ProvType; gross: number; irrf: number; estimated: number; currency: "BRL" | "USD"; payer: string; cnpj: string; lines: number;
}

export function buildProventos(items: PortfolioItem[], ws: Workspace): ProvRow[] {
  const out: ProvRow[] = [];
  for (const i of items) {
    const dt = defaultProvType(i.kind);
    if (!dt) continue;
    const e = ws.prov[i.key] ?? {};
    const qty = (ws.edits[i.key]?.qty !== undefined ? ws.edits[i.key]?.qty : i.qty) ?? 0;
    const from = `${ws.year}-01-01`, to = `${ws.year}-12-31`;
    const evs = i.divs.filter((d) => d.date >= from && d.date <= to);
    const estimated = Math.round(evs.reduce((s, d) => s + d.perShare, 0) * qty * 100) / 100;
    const type = e.type ?? dt;
    const gross = e.gross !== undefined && e.gross !== null ? e.gross : estimated;
    const irrf = e.irrf !== undefined && e.irrf !== null ? e.irrf : type === "jcp" ? Math.round(gross * 15) / 100 : 0;
    out.push({ key: i.key, item: i, type, gross, irrf, estimated, currency: i.kind === "acao_us" ? "USD" : "BRL", payer: i.legalName ?? i.label, cnpj: ws.edits[i.key]?.cnpj ?? fmtCnpj(i.cnpj), lines: evs.length });
  }
  return out;
}

export function totalsByType(rows: ProvRow[]): Record<ProvType, number> {
  const t: Record<ProvType, number> = { dividendos: 0, jcp: 0, fii: 0, exterior: 0 };
  for (const r of rows) if (r.currency === "BRL" || r.type === "exterior") t[r.type] += r.gross;
  return t;
}

/** Texto único (para copiar/imprimir) com tudo o que vai em cada ficha. */
export function roteiro(bens: BemRow[], custom: CustomBem[], prov: ProvRow[], year: number): string {
  const L: string[] = [`ROTEIRO DE PREENCHIMENTO · ano-calendário ${year} (declaração de ${year + 1})`, "Gerado no seu navegador. Confira cada valor com os informes de rendimentos oficiais.", "", "== BENS E DIREITOS =="];
  for (const b of bens) L.push(`Grupo ${b.code.grupo} · Código ${b.code.codigo} (${b.code.nome})`, `Situação em 31/12/${year - 1}: ${b.prev !== null ? brl(b.prev) : "—"} | Situação em 31/12/${year}: ${b.total !== null ? brl(b.total) : "—"}`, `Discriminação: ${b.text}`, "");
  for (const c of custom) L.push(`Grupo ${c.grupo} · Código ${c.codigo}`, `Situação em 31/12/${year - 1}: ${c.prev !== null ? brl(c.prev) : "—"} | Situação em 31/12/${year}: ${brl(c.valor)}`, `Discriminação: ${c.discriminacao}`, "");
  L.push("== RENDIMENTOS ==");
  for (const p of prov) { const inf = PROV_INFO[p.type]; L.push(`${inf.ficha} · código ${inf.codigo} · ${inf.titulo}`, `Fonte pagadora: ${p.payer}${p.cnpj ? ` · CNPJ ${p.cnpj}` : ""}`, `Valor: ${p.currency === "USD" ? "US$ " + p.gross.toFixed(2) : brl(p.gross)}${p.type === "jcp" ? ` · IRRF: ${brl(p.irrf)}` : ""}`, ""); }
  return L.join("\n");
}

/** Lê número digitado em português ("1.234,56") ou simples ("1234.56"). */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(/\s|R\$|US\$/g, "");
  if (!t) return null;
  const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Fotografia dos bens em 31/12 (para o ano seguinte). */
export function snapshotOf(bens: BemRow[], custom: CustomBem[]): PrevBem[] {
  return [
    ...bens.filter((b) => b.total !== null).map((b) => ({ id: b.key, grupo: b.code.grupo, codigo: b.code.codigo, discriminacao: b.text, valor: b.total as number })),
    ...custom.map((c) => ({ id: c.id, grupo: c.grupo, codigo: c.codigo, discriminacao: c.discriminacao, valor: c.valor })),
  ];
}

/** Atualização para o ano seguinte: o fim do ano anterior vira a situação anterior; mantém corretoras, CNPJs e bens extras. */
export function rollover(ws: Workspace, year: number): Workspace {
  const snap = ws.snapshot ?? [];
  const edits: Workspace["edits"] = {};
  for (const [k, e] of Object.entries(ws.edits)) edits[k] = { custody: e.custody, cnpj: e.cnpj };
  return {
    v: 1, year, previous: snap, edits, prov: {}, notes: ws.notes, savedAt: "",
    custom: ws.custom.map((c) => ({ ...c, prev: c.valor })),
  };
}
