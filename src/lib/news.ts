import { cached } from "./market";

export interface NewsItem { title: string; url: string; source: string; at: number; summary: string }

export interface Feed { url: string; source: string; /** Só aceita itens cujo título/resumo casem com este filtro. */ only?: RegExp }
export interface Topic { id: string; label: string; feeds: Feed[] }

const gnews = (q: string, source = "Google Notícias"): Feed => ({ url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`, source });

/** Temas da aba Notícias. Cada tema junta alguns feeds RSS; se um sair do ar, os outros continuam. */
export const TOPICS: Topic[] = [
  { id: "cripto", label: "Cripto", feeds: [
    { url: "https://portaldobitcoin.uol.com.br/feed/", source: "Portal do Bitcoin" },
    { url: "https://livecoins.com.br/feed/", source: "Livecoins" },
    { url: "https://br.cointelegraph.com/rss", source: "Cointelegraph Brasil" },
    gnews("bitcoin OR criptomoedas when:2d"),
  ] },
  { id: "acoes", label: "Ações", feeds: [
    { url: "https://www.infomoney.com.br/mercados/feed/", source: "InfoMoney" },
    { url: "https://www.moneytimes.com.br/feed/", source: "Money Times", only: /a[çc][õo]es|ibovespa|bolsa|b3|dividendos|petrobras|vale\b|balan[çc]o/i },
    gnews("ações bolsa Ibovespa B3 when:2d"),
  ] },
  { id: "fiis", label: "Fundos imobiliários", feeds: [
    { url: "https://www.infomoney.com.br/feed/", source: "InfoMoney", only: /fii|fundos? imobili/i },
    { url: "https://www.moneytimes.com.br/feed/", source: "Money Times", only: /fii|fundos? imobili/i },
    gnews("fundos imobiliários FIIs when:3d"),
  ] },
  { id: "renda-fixa", label: "Renda fixa", feeds: [
    { url: "https://www.infomoney.com.br/feed/", source: "InfoMoney", only: /renda fixa|tesouro|cdb|selic|lci|lca|deb[êe]nture|cdi/i },
    gnews("renda fixa Tesouro Direto CDB Selic when:3d"),
  ] },
  { id: "brasil", label: "Economia Brasil", feeds: [
    { url: "https://g1.globo.com/rss/g1/economia/", source: "g1 Economia" },
    { url: "https://www.infomoney.com.br/economia/feed/", source: "InfoMoney" },
    gnews("economia brasileira juros inflação when:2d"),
  ] },
  { id: "mundo", label: "Economia mundial", feeds: [
    { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC Business" },
    { url: "https://www.cnbc.com/id/10001147/device/rss/rss.html", source: "CNBC" },
    { url: "https://feeds.bbci.co.uk/portuguese/topics/c2dwqnxxxpyt/rss.xml", source: "BBC Brasil" },
  ] },
];

export const topicById = (id: string | undefined) => TOPICS.find((t) => t.id === id) ?? TOPICS[0];

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}
const clean = (raw: string) => {
  const noCdata = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // Decodifica uma vez, tira as tags (inclusive as que vinham escapadas) e decodifica o texto restante.
  return decode(decode(noCdata).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
};
const tag = (block: string, name: string) => block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))?.[1];

/** Lê RSS 2.0 ou Atom. Só aceita links http/https; devolve itens sem data com a hora de agora. */
export function parseFeed(xml: string, source: string, nowSec = Math.floor(Date.now() / 1000)): NewsItem[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  const out: NewsItem[] = [];
  for (const b of blocks) {
    const title = clean(tag(b, "title") ?? "");
    let link = clean(tag(b, "link") ?? "");
    if (!link) link = b.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? "";
    link = decode(link);
    try { if (!/^https?:$/.test(new URL(link).protocol)) continue; } catch { continue; }
    if (!title) continue;
    const dateRaw = clean(tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? tag(b, "dc:date") ?? "");
    const ms = Date.parse(dateRaw);
    const at = Number.isFinite(ms) ? Math.floor(ms / 1000) : nowSec;
    let summary = clean(tag(b, "description") ?? tag(b, "summary") ?? tag(b, "content:encoded") ?? "");
    if (summary.startsWith(title)) summary = summary.slice(title.length).trim();
    if (summary.length > 220) summary = summary.slice(0, 217).replace(/\s+\S*$/, "") + "…";
    const src = clean(tag(b, "source") ?? "") || source;
    out.push({ title, url: link, source: src, at: Math.min(at, nowSec + 3600), summary });
  }
  return out;
}

/** Junta feeds, aplica filtros, tira repetidas (mesmo título) e ordena da mais nova para a mais antiga. */
export function mergeNews(lists: { feed: Feed; items: NewsItem[] }[], limit = 40): NewsItem[] {
  const seen = new Set<string>();
  const all: NewsItem[] = [];
  for (const { feed, items } of lists) {
    for (const it of items) {
      if (feed.only && !feed.only.test(`${it.title} ${it.summary}`)) continue;
      const key = it.title.toLowerCase().replace(/\s*-\s*[^-]+$/, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(it);
    }
  }
  return all.sort((a, b) => b.at - a.at).slice(0, limit);
}

async function fetchFeed(f: Feed): Promise<NewsItem[]> {
  const res = await fetch(f.url, { headers: { "user-agent": "Mozilla/5.0 (compatible; NizaInvest/1.0)", accept: "application/rss+xml, application/xml, text/xml" }, signal: AbortSignal.timeout(8000), redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseFeed(await res.text(), f.source);
}

/** Notícias de um tema, cache de 15 minutos. Falha só se TODOS os feeds do tema falharem. */
export function getNews(topic: Topic) {
  return cached<NewsItem[]>(`news:${topic.id}:v1`, 15 * 60, async () => {
    const results = await Promise.allSettled(topic.feeds.map(fetchFeed));
    const lists = results.flatMap((r, i) => (r.status === "fulfilled" ? [{ feed: topic.feeds[i], items: r.value }] : []));
    if (!lists.length) throw new Error("nenhuma fonte respondeu");
    return mergeNews(lists);
  });
}
