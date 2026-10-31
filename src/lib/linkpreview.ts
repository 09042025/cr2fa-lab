import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { createHash } from "node:crypto";
import { cached } from "./market";

/**
 * Prévia de links (título, descrição e imagem), como no WhatsApp e no X.
 * O servidor visita o endereço que o membro colou, por isso há várias travas contra abuso (SSRF):
 * só http/https nas portas 80/443, sem usuário e senha no endereço, nunca para endereços internos
 * (a checagem acontece na hora de conectar, inclusive nos redirecionamentos), com limite de tempo e de tamanho.
 */

export interface LinkPreview { url: string; site: string; title: string; description: string; image: string | null }

/* ------------------------- travas contra endereços internos ------------------------- */

function ipv4Private(a: number, b: number, c: number): boolean {
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function expandIpv6(ip: string): number[] | null {
  let s = ip.split("%")[0].toLowerCase();
  const v4 = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(s);
  if (v4) s = s.slice(0, v4.index) + ((Number(v4[1]) << 8) | Number(v4[2])).toString(16) + ":" + ((Number(v4[3]) << 8) | Number(v4[4])).toString(16);
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const groups = [...head, ...Array(fill).fill("0"), ...tail].map((g) => parseInt(g || "0", 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

/** Verdadeiro para endereços que não são da internet pública (loopback, rede local, nuvem interna etc.). Em caso de dúvida, bloqueia. */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) { const [a, b, c] = ip.split(".").map(Number); return ipv4Private(a, b, c); }
  const g = expandIpv6(ip);
  if (!g) return true;
  if (g.every((x) => x === 0) || (g.slice(0, 7).every((x) => x === 0) && g[7] === 1)) return true; // :: e ::1
  if ((g[0] & 0xfe00) === 0xfc00 || (g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xff00) === 0xff00) return true; // fc00::/7, fe80::/10, ff00::/8
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentação
  if (g[0] === 0x0064 && g[1] === 0xff9b) return true; // NAT64
  if (g[0] === 0x2002) return true; // 6to4
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return ipv4Private(g[6] >> 8, g[6] & 255, g[7] >> 8); // IPv4 embutido
  return false;
}

export function checkUrl(raw: string): URL | null {
  if (raw.length > 2000) return null;
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== (u.protocol === "https:" ? "443" : "80")) return null;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (net.isIP(host) && isPrivateIp(host)) return null;
  if (!net.isIP(host) && !host.includes(".")) return null;
  return u;
}

/* ---------------------------------- download ---------------------------------- */

const MAX_BYTES = 400 * 1024;
const TIMEOUT_MS = 5000;
const UA = "Mozilla/5.0 (compatible; NIZAINVESTLinkPreview/1.0; +https://nizainvest.com.br)";

function guardedLookup(allowPrivate: boolean) {
  return (hostname: string, options: dns.LookupOptions, cb: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void) => {
    dns.lookup(hostname, { all: true, family: options.family }, (err, addrs) => {
      if (err) return cb(err, "", 0);
      const ok = addrs.filter((a) => allowPrivate || !isPrivateIp(a.address));
      if (!ok.length || ok.length !== addrs.length) return cb(Object.assign(new Error("endereço não permitido"), { code: "EBLOCKED" }), "", 0);
      if (options.all) return cb(null, ok);
      cb(null, ok[0].address, ok[0].family);
    });
  };
}

interface Fetched { status: number; headers: http.IncomingHttpHeaders; body: string; url: URL }

function once(u: URL, accept: string, allowPrivate: boolean): Promise<Fetched> {
  return new Promise((resolve, reject) => {
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(u, { method: "GET", headers: { "user-agent": UA, accept, "accept-language": "pt-BR,pt;q=0.9,en;q=0.8" }, lookup: guardedLookup(allowPrivate) as never, agent: false, timeout: TIMEOUT_MS }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400) { res.resume(); return resolve({ status, headers: res.headers, body: "", url: u }); }
      const type = String(res.headers["content-type"] ?? "");
      if (!/(text\/html|application\/xhtml|json|text\/plain)/i.test(type)) { res.destroy(); return reject(new Error("tipo não suportado")); }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (c: Buffer) => {
        size += c.length;
        chunks.push(c);
        if (size >= MAX_BYTES) { res.destroy(); resolve({ status, headers: res.headers, body: Buffer.concat(chunks).toString("utf8"), url: u }); }
      });
      res.on("end", () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks).toString("utf8"), url: u }));
      res.on("error", () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks).toString("utf8"), url: u }));
    });
    req.on("timeout", () => req.destroy(new Error("tempo esgotado")));
    req.on("error", reject);
    req.end();
  });
}

async function download(start: URL, accept: string, allowPrivate: boolean): Promise<Fetched> {
  let u = start;
  for (let i = 0; i < 4; i++) {
    const r = await once(u, accept, allowPrivate);
    if (r.status >= 300 && r.status < 400 && r.headers.location) {
      const next = checkUrl(new URL(String(r.headers.location), u).toString());
      if (!next) throw new Error("redirecionamento não permitido");
      u = next;
      continue;
    }
    if (r.status < 200 || r.status >= 300) throw new Error(`HTTP ${r.status}`);
    return r;
  }
  throw new Error("redirecionamentos demais");
}

/* ----------------------------------- leitura ----------------------------------- */

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", laquo: "«", raquo: "»", middot: "·", bull: "•" };
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENT[e.toLowerCase()] ?? m;
  });
}

const clean = (s: string | undefined, max: number) => {
  const t = decodeEntities(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

function metaTags(html: string): Map<string, string> {
  const out = new Map<string, string>();
  const head = html.slice(0, 250_000);
  for (const tag of head.match(/<meta\s[^>]*>/gi) ?? []) {
    const attrs: Record<string, string> = {};
    for (const m of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
    const key = (attrs.property || attrs.name || "").toLowerCase();
    if (key && attrs.content !== undefined && !out.has(key)) out.set(key, attrs.content);
  }
  return out;
}

export function parsePreview(html: string, pageUrl: URL): LinkPreview | null {
  const m = metaTags(html);
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html.slice(0, 250_000))?.[1];
  const title = clean(m.get("og:title") || m.get("twitter:title") || titleTag, 140);
  const description = clean(m.get("og:description") || m.get("twitter:description") || m.get("description"), 260);
  let image: string | null = null;
  const rawImg = (m.get("og:image") || m.get("og:image:url") || m.get("twitter:image") || m.get("twitter:image:src") || "").trim();
  if (rawImg) {
    try {
      const iu = new URL(decodeEntities(rawImg), pageUrl);
      if ((iu.protocol === "https:" || iu.protocol === "http:") && !iu.username && !iu.password) image = iu.toString();
    } catch { /* imagem inválida: segue sem ela */ }
  }
  const site = clean(m.get("og:site_name"), 60) || pageUrl.hostname.replace(/^www\./, "");
  if (!title && !description && !image) return null;
  return { url: pageUrl.toString(), site, title: title || site, description, image };
}

/** Posts do X/Twitter não mostram os metadados para robôs: usamos o oEmbed oficial (texto e autor). */
export function parseOEmbed(json: unknown, pageUrl: URL): LinkPreview | null {
  if (!json || typeof json !== "object") return null;
  const j = json as { author_name?: string; html?: string; author_url?: string };
  if (typeof j.html !== "string") return null;
  const p = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(j.html)?.[1] ?? "";
  const text = clean(p.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""), 260);
  const handle = /\(@([A-Za-z0-9_]+)\)/.exec(decodeEntities(j.html.replace(/<[^>]+>/g, " ")))?.[1] ?? /[^/]+$/.exec(j.author_url ?? "")?.[0];
  const author = clean(j.author_name, 60);
  if (!text && !author) return null;
  return { url: pageUrl.toString(), site: "X", title: author ? `${author}${handle ? ` (@${handle})` : ""} no X` : "Publicação no X", description: text, image: null };
}

const isTweet = (u: URL) => /^(www\.|mobile\.)?(x|twitter)\.com$/i.test(u.hostname) && /^\/[^/]+\/status\/\d+/.test(u.pathname);

export async function fetchPreview(raw: string, opts: { allowPrivate?: boolean } = {}): Promise<LinkPreview | null> {
  const u = checkUrl(raw);
  if (!u && !(opts.allowPrivate && /^https?:\/\//.test(raw))) return null;
  const url = u ?? new URL(raw);
  try {
    if (isTweet(url)) {
      const o = new URL("https://publish.twitter.com/oembed");
      o.searchParams.set("url", url.toString().replace("://x.com", "://twitter.com").replace("://www.x.com", "://twitter.com"));
      o.searchParams.set("omit_script", "1");
      const r = await download(o, "application/json", false);
      return parseOEmbed(JSON.parse(r.body), url);
    }
    const r = await download(url, "text/html,application/xhtml+xml", !!opts.allowPrivate);
    return parsePreview(r.body, r.url);
  } catch {
    return null;
  }
}

const TTL = 12 * 3600;

/** Com cache de 12 h no banco (inclusive para links sem prévia, para não repetir a visita). */
export async function getLinkPreview(raw: string): Promise<LinkPreview | null> {
  const u = checkUrl(raw);
  if (!u) return null;
  const key = `linkpreview:v1:${createHash("sha1").update(u.toString()).digest("hex")}`;
  const res = await cached<LinkPreview | null>(key, TTL, () => fetchPreview(u.toString()));
  return res.data ?? null;
}
