/**
 * Dados abertos da CVM (https://dados.cvm.gov.br), sem chave:
 *  - ITR/DFP (demonstrações trimestrais e anuais, consolidadas) -> indicadores de ações
 *  - FRE (valores mobiliários) -> relação ticker <-> CNPJ
 *  - Informe mensal de FII -> patrimônio, VPA, cotistas
 * Os arquivos são grandes (zips de dezenas de MB), então são lidos uma vez por semana em segundo plano
 * e só o necessário fica guardado na tabela de cache. Nada é inventado: sem dado, o indicador some.
 */
import { inflateRawSync } from "node:zlib";
import { db } from "./db";
import type { CvmRow } from "./indicators";

const BASE = "https://dados.cvm.gov.br/dados";
const MAX_ENTRY = 400 * 1024 * 1024;

/* ------------------------------- zip ------------------------------- */

export function unzipAll(buf: Buffer, want: (name: string) => boolean): Map<string, Buffer> {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("zip inválido");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("zip corrompido");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const uncomp = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (!want(name)) continue;
    if (uncomp > MAX_ENTRY) throw new Error("arquivo grande demais no zip");
    const start = offset + 30 + buf.readUInt16LE(offset + 26) + buf.readUInt16LE(offset + 28);
    const raw = buf.subarray(start, start + compSize);
    out.set(name, method === 0 ? raw : method === 8 ? inflateRawSync(raw) : (() => { throw new Error("compressão não suportada"); })());
  }
  return out;
}

async function download(url: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "cr2fa-lab/0.1" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${new URL(url).host}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------- csv ------------------------------- */

export interface Table { headers: string[]; rows: string[][] }

/** CSV da CVM: separador ';', codificação ISO-8859-1. */
export function parseCsv(buf: Buffer): Table {
  const text = buf.toString("latin1");
  const lines = text.split(/\r?\n/);
  const headers = (lines.shift() ?? "").split(";").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: string[][] = [];
  for (const ln of lines) if (ln) rows.push(ln.split(";"));
  return { headers, rows };
}

export const col = (t: Table, re: RegExp) => t.headers.findIndex((h) => re.test(h));
export const digits = (s: string | undefined) => (s ?? "").replace(/\D/g, "");
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/* ----------------------- contas canônicas (ações) ----------------------- */

/** Traduz código/descrição de conta da CVM para uma chave simples; null = não interessa. */
export function canonAccount(stmt: "DRE" | "BPA" | "BPP", code: string, desc: string): string | null {
  const d = norm(desc);
  if (stmt === "DRE") {
    if (code === "3.01") return d.includes("intermediacao financeira") ? "rec_banco" : "rec";
    if (code === "3.05" && d.includes("antes do resultado financeiro")) return "ebit";
    if (/^3\.\d\d$/.test(code) && (d.startsWith("lucro/prejuizo consolidado") || d.startsWith("lucro ou prejuizo liquido consolidado") || d.startsWith("lucro/prejuizo do periodo") || d.startsWith("lucro liquido"))) return "ll_total";
    if (/^3\.\d\d\.01$/.test(code) && d.includes("controlador")) return "ll";
    return null;
  }
  if (stmt === "BPA") {
    if (code === "1") return "ativo";
    if (code === "1.01") return "ac";
    if (code === "1.01.01") return "caixa";
    if (code === "1.01.02") return "aplic";
    return null;
  }
  if (code === "2.01") return "pc";
  if (code === "2.01.04" && d.includes("emprest")) return "div_cp";
  if (code === "2.02.01" && d.includes("emprest")) return "div_lp";
  if (/^2\.\d\d$/.test(code) && d.startsWith("patrimonio liquido")) return "pl";
  return null;
}

export interface CvmCompany { name: string; cd: string; bank: boolean; rows: CvmRow[] }
export interface CvmData {
  loadedAt: number;
  year: number;
  companies: Record<string, CvmCompany>; // chave = CNPJ só com dígitos
  tickers: Record<string, string>; // ticker -> CNPJ
  /** Diagnóstico do que foi lido (ajuda a achar problemas quando um ticker não é encontrado). */
  diag?: string;
}

/** Lê um CSV de demonstração (DRE/BPA/BPP consolidada) e acumula nas empresas. Mantém a maior VERSAO por linha. */
export function ingestStatement(t: Table, stmt: "DRE" | "BPA" | "BPP", acc: Map<string, CvmCompany & { ver: Map<string, number> }>) {
  const iC = col(t, /^CNPJ_CIA$/i), iN = col(t, /^DENOM_CIA$/i), iCd = col(t, /^CD_CVM$/i), iV = col(t, /^VERSAO$/i);
  const iEsc = col(t, /^ESCALA_MOEDA$/i), iOrd = col(t, /^ORDEM_EXERC/i), iIni = col(t, /^DT_INI_EXERC$/i), iFim = col(t, /^DT_FIM_EXERC$/i);
  const iCode = col(t, /^CD_CONTA$/i), iDesc = col(t, /^DS_CONTA$/i), iVal = col(t, /^VL_CONTA$/i);
  if ([iC, iFim, iCode, iDesc, iVal].some((x) => x < 0)) throw new Error(`colunas inesperadas em ${stmt}`);
  for (const r of t.rows) {
    if (iOrd >= 0 && norm(r[iOrd] ?? "").startsWith("penult")) continue;
    const k = canonAccount(stmt, r[iCode], r[iDesc] ?? "");
    if (!k) continue;
    const cnpj = digits(r[iC]);
    if (!cnpj) continue;
    const mult = iEsc >= 0 && /mil/i.test(r[iEsc] ?? "") ? 1000 : 1;
    const v = Number((r[iVal] ?? "").replace(",", ".")) * mult;
    if (!Number.isFinite(v)) continue;
    let c = acc.get(cnpj);
    if (!c) { c = { name: r[iN] ?? "", cd: iCd >= 0 ? r[iCd] : "", bank: false, rows: [], ver: new Map() }; acc.set(cnpj, c); }
    if (k === "rec_banco") { c.bank = true; continue; }
    const ini = iIni >= 0 ? (r[iIni] ?? "") : "";
    const fim = r[iFim] ?? "";
    const key = `${k}|${ini}|${fim}`;
    const ver = iV >= 0 ? Number(r[iV]) || 0 : 0;
    const prev = c.ver.get(key);
    if (prev !== undefined && prev >= ver) continue;
    c.ver.set(key, ver);
    c.rows = c.rows.filter((x) => !(x.k === k && x.i === ini && x.f === fim));
    c.rows.push({ k, i: ini, f: fim, v });
  }
}

/** Extrai tickers (ex.: BBAS3, ITUB4) do campo de código de negociação do FRE. */
export function ingestTickers(t: Table, into: Record<string, string>) {
  const iC = col(t, /^CNPJ/i);
  if (iC < 0) throw new Error(`FRE sem coluna de CNPJ (colunas: ${t.headers.join(",")})`);
  // procura tickers em qualquer coluna de código/negociação; se nada, em todas as colunas de texto
  let cols = t.headers.map((h, i) => (/negocia|codigo|ticker|simbolo/i.test(h) ? i : -1)).filter((i) => i >= 0 && i !== iC);
  if (!cols.length) cols = t.headers.map((_, i) => i).filter((i) => i !== iC);
  for (const r of t.rows) {
    const cnpj = digits(r[iC]);
    if (!cnpj) continue;
    for (const i of cols) for (const m of (r[i] ?? "").toUpperCase().matchAll(/\b[A-Z]{4}\d{1,2}\b/g)) into[m[0]] = cnpj;
  }
}

/** Normaliza nome de empresa para comparar ("Banco do Brasil S.A." == "BANCO DO BRASIL SA"). */
export function normName(s: string): string {
  return norm(s).replace(/\b(s\.?\/?a\.?|sa|ltda|cia|companhia|holding|participacoes|part)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
}

export function companyByName(d: CvmData, name: string): { cnpj: string; company: CvmCompany } | null {
  const n = normName(name);
  if (n.length < 4) return null;
  let hit: [string, CvmCompany] | undefined;
  for (const e of Object.entries(d.companies)) if (normName(e[1].name) === n) { hit = e; break; }
  if (!hit) {
    const cands = Object.entries(d.companies).filter(([, c]) => { const m = normName(c.name); return m.startsWith(n) || n.startsWith(m); });
    if (cands.length === 1) hit = cands[0];
  }
  return hit ? { cnpj: hit[0], company: hit[1] } : null;
}

async function loadZipCsvs(url: string, re: RegExp): Promise<Map<string, Table>> {
  const zip = await download(url);
  const files = unzipAll(zip, (n) => re.test(n));
  const out = new Map<string, Table>();
  for (const [name, buf] of files) out.set(name, parseCsv(buf));
  return out;
}

async function buildCvmData(): Promise<CvmData> {
  const year = new Date().getFullYear();
  const acc = new Map<string, CvmCompany & { ver: Map<string, number> }>();
  const tickers: Record<string, string> = {};
  const jobs: { kind: "itr" | "dfp"; y: number }[] = [
    { kind: "dfp", y: year - 2 }, { kind: "dfp", y: year - 1 }, { kind: "dfp", y: year },
    { kind: "itr", y: year - 1 }, { kind: "itr", y: year },
  ];
  let ok = 0;
  const diag: string[] = [];
  for (const j of jobs) {
    try {
      const tabs = await loadZipCsvs(`${BASE}/CIA_ABERTA/DOC/${j.kind.toUpperCase()}/DADOS/${j.kind}_cia_aberta_${j.y}.zip`, /_(DRE|BPA|BPP)_con_/i);
      for (const [name, t] of tabs) {
        const s = /_(DRE|BPA|BPP)_con_/i.exec(name)?.[1].toUpperCase() as "DRE" | "BPA" | "BPP";
        ingestStatement(t, s, acc);
      }
      ok++;
    } catch (e) {
      diag.push(`${j.kind}${j.y}: ${e instanceof Error ? e.message : "erro"}`);
      // ano ainda sem arquivo (ex.: DFP do ano corrente em janeiro): segue com os outros
    }
  }
  if (!ok) throw new Error("não foi possível baixar as demonstrações da CVM");
  for (const y of [year, year - 1]) {
    try {
      const tabs = await loadZipCsvs(`${BASE}/CIA_ABERTA/DOC/FRE/DADOS/fre_cia_aberta_${y}.zip`, /valor_mobiliario/i);
      diag.push(`fre${y}: arquivos ${[...tabs.keys()].join("|") || "nenhum"}; colunas ${[...tabs.values()].map((t) => t.headers.join(",")).join(" // ").slice(0, 300)}`);
      for (const t of tabs.values()) ingestTickers(t, tickers);
      if (Object.keys(tickers).length) break;
    } catch (e) { diag.push(`fre${y}: ${e instanceof Error ? e.message : "erro"}`); }
  }
  const companies: Record<string, CvmCompany> = {};
  for (const [cnpj, c] of acc) companies[cnpj] = { name: c.name, cd: c.cd, bank: c.bank, rows: c.rows };
  return { loadedAt: Math.floor(Date.now() / 1000), year, companies, tickers, diag: `${Object.keys(tickers).length} tickers; ${diag.join(" ; ")}`.slice(0, 900) };
}

/* ------------------------------ FII (informe mensal) ------------------------------ */

export interface FiiRecord { name: string; isin: string; date: string; vpa: number | null; patrimonio: number | null; cotistas: number | null; taxaAdm: number | null }
export interface FiiData { loadedAt: number; byPrefix: Record<string, FiiRecord> }

export function ingestFii(geral: Table, compl: Table, into: Record<string, FiiRecord>) {
  const gC = col(geral, /^CNPJ/i), gD = col(geral, /^Data_Referencia$/i), gN = col(geral, /^Nome_Fundo/i), gI = col(geral, /ISIN/i);
  const cC = col(compl, /^CNPJ/i), cD = col(compl, /^Data_Referencia$/i);
  const cVpa = col(compl, /^Valor_Patrimonial_Cotas$/i), cPl = col(compl, /^Patrimonio_Liquido$/i), cCot = col(compl, /^Total_Numero_Cotistas$/i), cAdm = col(compl, /Taxa_Administracao/i);
  if ([gC, gD, cC, cD].some((x) => x < 0)) throw new Error("colunas inesperadas no informe mensal de FII");
  const n = (s: string | undefined) => { const v = Number((s ?? "").replace(",", ".")); return s && Number.isFinite(v) ? v : null; };
  const latestCompl = new Map<string, string[]>();
  for (const r of compl.rows) {
    const key = digits(r[cC]);
    const prev = latestCompl.get(key);
    if (!prev || (r[cD] ?? "") >= (prev[cD] ?? "")) latestCompl.set(key, r);
  }
  const latestGeral = new Map<string, string[]>();
  for (const r of geral.rows) {
    const key = digits(r[gC]);
    const prev = latestGeral.get(key);
    if (!prev || (r[gD] ?? "") >= (prev[gD] ?? "")) latestGeral.set(key, r);
  }
  for (const [cnpj, g] of latestGeral) {
    const isin = gI >= 0 ? (g[gI] ?? "").toUpperCase() : "";
    const prefix = /^BR[A-Z0-9]{4}/.test(isin) ? isin.slice(2, 6) : "";
    if (!prefix) continue;
    const c = latestCompl.get(cnpj);
    if (!c) continue;
    into[prefix] = {
      name: gN >= 0 ? g[gN] ?? "" : "", isin, date: c[cD] ?? "",
      vpa: cVpa >= 0 ? n(c[cVpa]) : null, patrimonio: cPl >= 0 ? n(c[cPl]) : null,
      cotistas: cCot >= 0 ? n(c[cCot]) : null, taxaAdm: cAdm >= 0 ? n(c[cAdm]) : null,
    };
  }
}

async function buildFiiData(): Promise<FiiData> {
  const byPrefix: Record<string, FiiRecord> = {};
  const year = new Date().getFullYear();
  for (const y of [year, year - 1]) {
    try {
      const tabs = await loadZipCsvs(`${BASE}/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_${y}.zip`, /(geral|complemento)/i);
      let geral: Table | null = null, compl: Table | null = null;
      for (const [name, t] of tabs) { if (/geral/i.test(name)) geral = t; else if (/complemento/i.test(name)) compl = t; }
      if (geral && compl) { ingestFii(geral, compl, byPrefix); if (Object.keys(byPrefix).length) break; }
    } catch { /* tenta o ano anterior */ }
  }
  if (!Object.keys(byPrefix).length) throw new Error("não foi possível ler o informe mensal de FII da CVM");
  return { loadedAt: Math.floor(Date.now() / 1000), byPrefix };
}

/* ------------------------ cache em segundo plano ------------------------ */

const WEEK = 7 * 24 * 3600;
const running = new Map<string, Promise<void>>();
const lastError = new Map<string, string>();

function readCache<T>(key: string): { v: T; at: number } | null {
  const row = db().prepare("SELECT value, fetched_at FROM cache WHERE key = ?").get(key) as { value: string; fetched_at: number } | undefined;
  return row ? { v: JSON.parse(row.value) as T, at: row.fetched_at } : null;
}

function refreshInBackground(key: string, build: () => Promise<unknown>) {
  if (running.has(key)) return;
  const p = build()
    .then((data) => {
      db().prepare("INSERT INTO cache (key, value, fetched_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, fetched_at = excluded.fetched_at")
        .run(key, JSON.stringify(data), Math.floor(Date.now() / 1000));
      lastError.delete(key);
    })
    .catch((e) => { lastError.set(key, e instanceof Error ? e.message : "erro desconhecido"); })
    .finally(() => { running.delete(key); });
  running.set(key, p);
}

export interface Loaded<T> { data: T | null; loading: boolean; error?: string }

function get<T>(key: string, build: () => Promise<T>): Loaded<T> {
  const c = readCache<T>(key);
  const stale = !c || Math.floor(Date.now() / 1000) - c.at > WEEK;
  // com erro recente e sem dados, não martela a CVM a cada visita: tenta de novo a cada 10 min
  if (stale && !running.has(key)) {
    const failedAt = failedAtMap.get(key) ?? 0;
    if (Date.now() - failedAt > 10 * 60_000) {
      refreshInBackground(key, async () => {
        try { return await build(); } catch (e) { failedAtMap.set(key, Date.now()); throw e; }
      });
    }
  }
  return { data: c?.v ?? null, loading: running.has(key), error: c ? undefined : lastError.get(key) };
}
const failedAtMap = new Map<string, number>();

export const getCvmData = () => get<CvmData>("cvm:acoes:v2", buildCvmData);
export const getFiiData = () => get<FiiData>("cvm:fii:v1", buildFiiData);

/** Acha a empresa de um ticker: exato; senão, mesma raiz de 4 letras (ex.: ITUB3 -> ITUB4). */
export function companyOf(d: CvmData, ticker: string): { cnpj: string; company: CvmCompany } | null {
  let cnpj = d.tickers[ticker];
  if (!cnpj) {
    const root = ticker.slice(0, 4);
    const k = Object.keys(d.tickers).find((t) => t.startsWith(root));
    if (k) cnpj = d.tickers[k];
  }
  const company = cnpj ? d.companies[cnpj] : undefined;
  return company ? { cnpj, company } : null;
}
