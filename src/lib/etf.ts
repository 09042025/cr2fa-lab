import { cached } from "./market";

export interface EtfRow { date: string; flows: (number | null)[]; total: number | null }
export interface EtfFlows { funds: string[]; rows: EtfRow[] }

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

const text = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

/** "(110.3)" = saída (negativo); "-" ou vazio = sem dado. Números podem ter vírgula de milhar. */
export function parseFlow(raw: string): number | null {
  const t = raw.trim();
  if (!t || t === "-" || t === "–") return null;
  const neg = /^\(.*\)$/.test(t) || t.startsWith("-");
  const n = Number(t.replace(/[()\s,$-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

export function parseDate(raw: string): string | null {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const mon = MONTHS[m[2].toLowerCase()];
  if (mon === undefined) return null;
  return new Date(Date.UTC(Number(m[3]), mon, Number(m[1]))).toISOString().slice(0, 10);
}

/** Lê a tabela de fluxo diário da Farside Investors. Tolerante a mudanças de marcação: só depende de linhas com data e do cabeçalho com "Total". */
export function parseFarside(html: string): EtfFlows {
  const rows: string[][] = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = (tr.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) ?? []).map((c) => text(c));
    if (cells.length >= 3) rows.push(cells);
  }
  const head = rows.find((r) => r.some((c) => /^total$/i.test(c)));
  if (!head) throw new Error("tabela de fluxos não encontrada");
  const totalIdx = head.findIndex((c) => /^total$/i.test(c));
  const funds = head.slice(1, totalIdx).map((c) => c.split(" ")[0]);
  const out: EtfRow[] = [];
  for (const r of rows) {
    const date = parseDate(r[0]);
    if (!date || r.length < totalIdx + 1) continue;
    out.push({ date, flows: r.slice(1, totalIdx).map(parseFlow), total: parseFlow(r[totalIdx]) });
  }
  if (out.length < 5) throw new Error("poucas linhas de fluxo");
  return { funds, rows: out };
}

/** Fluxo diário líquido dos ETFs à vista dos EUA (US$ milhões), fonte Farside Investors. Cache de 3 horas. */
export function getEtfFlows(asset: "btc" | "eth") {
  return cached<EtfFlows>(`farside:${asset}:v1`, 3 * 60 * 60, async () => {
    const res = await fetch(`https://farside.co.uk/${asset}/`, { headers: { "user-agent": "Mozilla/5.0 (compatible; NizaInvest/1.0)", accept: "text/html" }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} em farside.co.uk`);
    return parseFarside(await res.text());
  });
}
