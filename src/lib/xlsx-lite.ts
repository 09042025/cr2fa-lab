/**
 * Leitor mínimo de planilhas .xlsx, sem dependências: um .xlsx é um zip de arquivos XML.
 * Roda no navegador (o arquivo do usuário não sai do computador dele) e no Node (para testes).
 */

export type Cell = string | number;
export interface Sheet {
  name: string;
  rows: Cell[][];
}

const MAX_ENTRY = 40 * 1024 * 1024; // limite por arquivo dentro do zip, contra "bombas" de compressão
const MAX_ENTRIES = 2000;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_ENTRY) {
      await reader.cancel();
      throw new Error("Arquivo grande demais dentro da planilha.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

interface ZipEntry { method: number; compSize: number; offset: number }

/** Lista os arquivos do zip pelo diretório central. */
function zipEntries(buf: Uint8Array): Map<string, ZipEntry> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Não é um arquivo .xlsx válido.");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  if (count > MAX_ENTRIES) throw new Error("Planilha com arquivos demais.");
  const dec = new TextDecoder();
  const out = new Map<string, ZipEntry>();
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || dv.getUint32(p, true) !== 0x02014b50) throw new Error("Arquivo .xlsx corrompido.");
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    out.set(dec.decode(buf.subarray(p + 46, p + 46 + nameLen)), { method, compSize, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function readEntry(buf: Uint8Array, e: ZipEntry): Promise<string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(e.offset, true) !== 0x04034b50) throw new Error("Arquivo .xlsx corrompido.");
  const start = e.offset + 30 + dv.getUint16(e.offset + 26, true) + dv.getUint16(e.offset + 28, true);
  const raw = buf.subarray(start, start + e.compSize);
  let data: Uint8Array;
  if (e.method === 0) data = raw;
  else if (e.method === 8) data = await inflateRaw(raw);
  else throw new Error("Compressão de planilha não suportada.");
  return new TextDecoder("utf-8").decode(data);
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decodeXml = (s: string) =>
  s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (m, g: string) => {
    if (g[0] === "#") {
      const code = g[1] === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENT[g] ?? m;
  });

/** Texto de um <si> ou <is>: junta os <t>, ignorando a pronúncia fonética (<rPh>). */
function textOf(xml: string): string {
  const clean = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  let out = "";
  for (const m of clean.matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)) out += m[1] ?? "";
  return decodeXml(out);
}

function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSheet(xml: string, shared: string[]): Cell[][] {
  const rows: Cell[][] = [];
  let auto = 0;
  for (const rm of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rn = Number(rm[1].match(/\br="(\d+)"/)?.[1]);
    const idx = Number.isFinite(rn) && rn > 0 ? rn - 1 : auto;
    auto = idx + 1;
    if (idx > 200_000) continue;
    const row: Cell[] = [];
    let nextCol = 0;
    for (const cm of (rm[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const col = ref ? colIndex(ref) : nextCol;
      nextCol = col + 1;
      if (col > 500) continue;
      const type = attrs.match(/\bt="(\w+)"/)?.[1] ?? "n";
      const body = cm[2] ?? "";
      let value: Cell = "";
      if (type === "inlineStr") value = textOf(body);
      else {
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (v !== undefined) {
          if (type === "s") value = shared[Number(v)] ?? "";
          else if (type === "str" || type === "e") value = decodeXml(v);
          else if (type === "b") value = v === "1" ? "VERDADEIRO" : "FALSO";
          else { const num = Number(v); value = Number.isFinite(num) ? num : decodeXml(v); }
        }
      }
      while (row.length < col) row.push("");
      row[col] = value;
    }
    while (rows.length < idx) rows.push([]);
    rows[idx] = row;
  }
  return rows;
}

/** Lê todas as abas de um .xlsx. */
export async function readXlsx(input: ArrayBuffer | Uint8Array): Promise<Sheet[]> {
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
  const entries = zipEntries(buf);
  const get = async (name: string) => {
    const e = entries.get(name);
    return e ? readEntry(buf, e) : null;
  };

  const workbook = await get("xl/workbook.xml");
  if (!workbook) throw new Error("Este arquivo não parece uma planilha .xlsx do Excel.");
  const rels = (await get("xl/_rels/workbook.xml.rels")) ?? "";
  const target = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const id = m[1].match(/\bId="([^"]+)"/)?.[1];
    const t = m[1].match(/\bTarget="([^"]+)"/)?.[1];
    if (id && t) target.set(id, t.startsWith("/") ? t.slice(1) : `xl/${t}`);
  }

  const sstXml = await get("xl/sharedStrings.xml");
  const shared: string[] = [];
  if (sstXml) for (const m of sstXml.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)) shared.push(textOf(m[1] ?? ""));

  const sheets: Sheet[] = [];
  let order = 0;
  for (const m of workbook.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    order++;
    const name = decodeXml(m[1].match(/\bname="([^"]*)"/)?.[1] ?? `Aba ${order}`);
    const rid = m[1].match(/\br:id="([^"]+)"/)?.[1];
    const path = (rid && target.get(rid)) || `xl/worksheets/sheet${order}.xml`;
    const xml = await get(path);
    if (xml) sheets.push({ name, rows: parseSheet(xml, shared) });
  }
  return sheets;
}
