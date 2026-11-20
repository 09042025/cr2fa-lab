/**
 * Maiores valores de mercado do mundo (empresas, ouro, prata, Bitcoin…), lidos da página pública
 * https://companiesmarketcap.com/assets-by-market-cap/ e guardados por 10 minutos (a própria fonte tem atraso de 10 min ou mais).
 * Não há chave nem API: lemos a tabela da página. Se o site mudar o formato, a lista some em vez de mostrar dado errado.
 */
import { cachedSwr } from "./market";

const SITE = "https://companiesmarketcap.com";
export interface TopCap { rank: number; name: string; ticker: string; marketCap: number; price: number | null; change30d: number | null; logo: string }

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim();
const text = (html: string) => decode(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
const num = (s: string | undefined) => { if (s === undefined || s === "") return null; const v = Number(s); return Number.isFinite(v) ? v : null; };

/** Converte "$5.121 T", "$850.2 B", "$1,383" em número (usado só quando a célula não traz data-sort). */
export function parseMoneyText(t: string): number | null {
  const m = /([\d.,]+)\s*([TBMK])?/i.exec(t.replace(/[$\s]/g, (x) => (x === "$" ? "" : " ")));
  if (!m) return null;
  const v = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(v)) return null;
  const mult = { T: 1e12, B: 1e9, M: 1e6, K: 1e3 }[(m[2] ?? "").toUpperCase() as "T"] ?? 1;
  return v * mult;
}

export function parseTopCaps(html: string): TopCap[] {
  const out: TopCap[] = [];
  for (const row of html.split(/<tr[\s>]/i).slice(1)) {
    if (!/\/marketcap\//i.test(row)) continue;
    const tds = [...row.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/gi)].map((m) => ({ attrs: m[1], inner: m[2], sort: /data-sort="([^"]*)"/i.exec(m[1])?.[1], txt: text(m[2]) }));
    const logoSrc = /<img[^>]*?(?:data-src|src)="([^"]*company-logos[^"]*)"/i.exec(row)?.[1];
    const fromLogo = logoSrc ? decodeURIComponent(logoSrc.split("/").pop() ?? "").replace(/\.(png|webp|jpg|svg)$/i, "") : "";
    const code = /class="[^"]*company-code[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(row)?.[1];
    const ticker = (code ? text(code) : "") || fromLogo;
    const nm = /class="[^"]*company-name[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(row)?.[1];
    const alt = /<img[^>]*alt="([^"]*)"/i.exec(row)?.[1];
    const name = (nm ? text(nm) : "") || (alt ? decode(alt) : "") || ticker;
    if (!ticker || !name) continue;
    // valor de mercado = primeira célula com número grande (as de posição e preço são menores ou vêm depois)
    const capIdx = tds.findIndex((t) => (num(t.sort) ?? 0) >= 1e6 || (t.sort === undefined && /\d\s*[TBM]\b/i.test(t.txt)));
    if (capIdx < 0) continue;
    const cap = num(tds[capIdx].sort) ?? parseMoneyText(tds[capIdx].txt);
    if (!cap || cap <= 0) continue;
    const priceCell = tds[capIdx + 1];
    const price = priceCell ? (num(priceCell.sort) ?? parseMoneyText(priceCell.txt)) : null;
    const chg = /class="percentage-(green|red)"[^>]*>\s*(?:<[^>]*>)*\s*([\d.,]+)\s*%/i.exec(row);
    const change = chg ? (chg[1] === "red" ? -1 : 1) * Number(chg[2].replace(/,/g, "")) : null;
    const rankCell = tds.find((t) => /rank/i.test(t.attrs));
    const rank = Number(rankCell?.sort ?? rankCell?.txt) || out.length + 1;
    const logo = !logoSrc ? `${SITE}/img/company-logos/64/${encodeURIComponent(ticker)}.png` : logoSrc.startsWith("http") ? logoSrc : `${SITE}${logoSrc.startsWith("/") ? "" : "/"}${logoSrc}`;
    out.push({ rank, name, ticker, marketCap: cap, price: price !== null && Number.isFinite(price) ? price : null, change30d: change !== null && Number.isFinite(change) ? change : null, logo });
  }
  return out;
}

export function getTopCaps() {
  return cachedSwr<TopCap[]>("topcaps:v1", 10 * 60, async () => {
    const res = await fetch(`${SITE}/assets-by-market-cap/`, { headers: { "user-agent": "Mozilla/5.0 (compatible; NizaHub/1.0)", accept: "text/html" }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} em companiesmarketcap.com`);
    const rows = parseTopCaps(await res.text());
    if (rows.length < 5) throw new Error("não consegui ler a tabela (o site pode ter mudado de formato)");
    return rows.slice(0, 20);
  });
}
