import type { BlockKey } from "./protocol";
import type { Cell, Sheet } from "./xlsx-lite";

/**
 * Importação da posição da B3. O investidor baixa a planilha "Posição" na Área do Investidor
 * (investidor.b3.com.br) e o app lê as linhas, sugere o bloco do Protocolo e deixa revisar antes de salvar.
 * Tudo aqui roda no navegador: só as linhas escolhidas (nome e valor) vão para o servidor.
 */

export interface B3Item {
  sheet: string;
  code: string;
  product: string;
  label: string;
  qty: number | null;
  /** Valor atualizado em R$. */
  value: number;
  block: BlockKey;
  /** true quando o bloco foi um palpite e merece conferência. */
  review: boolean;
}

export interface B3Parse {
  items: B3Item[];
  sheetsRead: number;
  /** Linhas ignoradas (sem valor, totais, linhas vazias). */
  skipped: number;
}

export const norm = (s: unknown): string =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Número em formato brasileiro ("R$ 1.234,56") ou já numérico. Devolve null se não for número. */
export function parseNumberBR(v: Cell | undefined | null): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v === undefined || v === null) return null;
  let s = String(v).replace(/R\$|\s| /g, "");
  if (!s || s === "-" || !/\d/.test(s)) return null;
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()\-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

/** Texto de um CSV (aceita ; , ou tabulação e aspas). */
export function parseCsv(text: string): Cell[][] {
  const clean = text.replace(/^﻿/, "");
  const first = clean.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => first.split(ch).length - 1;
  const delim = [";", "\t", ","].reduce((best, d) => (count(d) > count(best) ? d : best), ";");
  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let cur = "";
  let quoted = false;
  const endCell = () => { row.push(cur); cur = ""; };
  const endRow = () => { endCell(); if (row.some((c) => c !== "")) rows.push(row); row = []; };
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') { if (clean[i + 1] === '"') { cur += '"'; i++; } else quoted = false; }
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) endCell();
    else if (ch === "\n") endRow();
    else if (ch !== "\r") cur += ch;
  }
  if (cur !== "" || row.length) endRow();
  return rows;
}

/** Decodifica bytes de CSV: tenta UTF-8 e, se houver caracteres inválidos, usa Windows-1252. */
export function decodeCsvBytes(buf: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

const TICKER = /^[A-Z]{4}\d{1,2}$/;

/** Sugere o bloco do Protocolo. `review` indica palpite fraco. */
export function guessBlock(sheet: string, product: string, code: string): { block: BlockKey; review: boolean } {
  const s = norm(sheet);
  const p = norm(product);
  const c = code.toUpperCase();
  if (/tesouro|renda fixa|cdb|\blci\b|\blca\b|debenture|\bcri\b|\bcra\b/.test(s) || /^(tesouro|cdb|lci|lca|lc|cri|cra|debenture|letra)\b/.test(p)) {
    return { block: "renda_fixa", review: false };
  }
  if (/\bfii\b|fiagro|imobiliari|fdo inv imob|\bimob\b/.test(p) || /\bfii\b|imobiliari/.test(s)) return { block: "fiis", review: false };
  if (/\betf\b|\bbdr\b|acoes|acao\b/.test(s)) return { block: "acoes", review: false };
  if (TICKER.test(c)) {
    if (c.endsWith("11")) {
      // Final 11 pode ser FII, ETF ou unit de ação. Sem pista no nome, assume FII e pede conferência.
      if (/\betf\b|ishares|\bunt\b|\bunit/.test(p)) return { block: "acoes", review: false };
      return { block: "fiis", review: !/\bfii\b|imob/.test(p) };
    }
    return { block: "acoes", review: false };
  }
  if (/fundo/.test(s)) return { block: "renda_fixa", review: true };
  return { block: "renda_fixa", review: true };
}

interface Cols { header: number; code: number; product: number; qty: number; value: number; price: number }

function findColumns(rows: Cell[][]): Cols | null {
  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const h = rows[r].map(norm);
    const find = (pred: (x: string) => boolean) => h.findIndex((x) => x !== "" && pred(x));
    const code = find((x) => x === "codigo de negociacao" || x === "ticker" || x === "codigo" || x === "ativo" || x.startsWith("codigo de negociacao"));
    const product = find((x) => x === "produto" || x.startsWith("produto") || x === "nome");
    let qty = find((x) => x === "quantidade");
    if (qty < 0) qty = find((x) => x.startsWith("quantidade") && !/disponivel|indisponivel|garantia|bloque/.test(x));
    let value = find((x) => x.startsWith("valor atualizado"));
    if (value < 0) value = find((x) => x === "valor liquido" || x === "valor bruto" || x.startsWith("valor de mercado") || x === "valor");
    const price = find((x) => x.startsWith("preco de fechamento") || x.startsWith("preco atualizado"));
    if ((code >= 0 || product >= 0) && (value >= 0 || (price >= 0 && qty >= 0))) return { header: r, code, product, qty, value, price };
  }
  return null;
}

const cleanText = (v: Cell | undefined) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();

/** Lê as abas da planilha de posição e devolve as linhas com bloco sugerido, somando posições repetidas. */
export function parseB3(sheets: Sheet[]): B3Parse {
  const agg = new Map<string, B3Item>();
  let skipped = 0;
  let sheetsRead = 0;
  for (const sheet of sheets) {
    const cols = findColumns(sheet.rows);
    if (!cols) continue;
    sheetsRead++;
    for (let r = cols.header + 1; r < sheet.rows.length; r++) {
      const row = sheet.rows[r];
      if (!row || row.every((c) => c === "" || c === undefined)) continue;
      const product = cleanText(cols.product >= 0 ? row[cols.product] : "");
      let code = cleanText(cols.code >= 0 ? row[cols.code] : "").toUpperCase();
      if (!code) code = product.match(/^([A-Z]{4}\d{1,2})\b/)?.[1] ?? "";
      if (/^[A-Z]{4}\d{1,2}F$/.test(code)) code = code.slice(0, -1); // mercado fracionário
      if (norm(product).startsWith("total") || norm(code).startsWith("total") || (!code && !product)) { skipped++; continue; }

      const qty = cols.qty >= 0 ? parseNumberBR(row[cols.qty]) : null;
      let value = cols.value >= 0 ? parseNumberBR(row[cols.value]) : null;
      if ((value === null || value <= 0) && cols.price >= 0 && qty !== null) {
        const price = parseNumberBR(row[cols.price]);
        if (price !== null) value = price * qty;
      }
      if (value === null || !(value > 0)) { skipped++; continue; }

      const { block, review } = guessBlock(sheet.name, product, code);
      const raw = block === "renda_fixa" ? product || code : code || product;
      const label = raw.slice(0, 60);
      const key = `${block}|${label}`;
      const prev = agg.get(key);
      if (prev) {
        prev.value += value;
        prev.qty = prev.qty !== null && qty !== null ? prev.qty + qty : prev.qty ?? qty;
      } else {
        agg.set(key, { sheet: sheet.name, code, product, label, qty, value, block, review });
      }
    }
  }
  const items = [...agg.values()].map((i) => ({ ...i, value: Math.round(i.value * 100) / 100 }));
  items.sort((a, b) => a.block.localeCompare(b.block) || b.value - a.value);
  return { items, sheetsRead, skipped };
}

/** Linhas de um CSV da B3 como se fosse uma aba. */
export const sheetFromCsv = (name: string, text: string): Sheet => ({ name, rows: parseCsv(text) });
