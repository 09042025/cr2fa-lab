import { db } from "./db";
import { cleanLink } from "./agenda";

/** Vitrine de negócios dos membros (serviços e produtos). A plataforma apenas divulga: não intermedeia nem garante nada. */
export const CATEGORIES: { id: string; label: string }[] = [
  { id: "reformas", label: "Reformas e Reparos" },
  { id: "domesticos", label: "Serviços Domésticos" },
  { id: "design-tech", label: "Design e Tecnologia" },
  { id: "marketing", label: "Marketing e Vendas" },
  { id: "consultoria", label: "Consultoria e Finanças" },
  { id: "juridico", label: "Jurídico e Contábil" },
  { id: "aulas", label: "Aulas e Treinamentos" },
  { id: "eventos", label: "Eventos e Festas" },
  { id: "saude", label: "Saúde e Bem-estar" },
  { id: "beleza", label: "Moda e Beleza" },
  { id: "auto", label: "Automóveis" },
  { id: "assistencia", label: "Assistência Técnica" },
  { id: "imoveis", label: "Imóveis" },
  { id: "alimentacao", label: "Alimentação" },
  { id: "produtos", label: "Produtos e Artesanato" },
  { id: "outros", label: "Outros" },
];
export const STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
export const MAX_LISTINGS = 3;
export const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? "Outros";

export interface BizCase { title: string; text: string; link: string }
export interface Listing {
  id: number; userId: number; owner: string; kind: "service" | "product"; category: string; title: string; description: string;
  city: string; state: string; priceNote: string; whatsapp: string; instagram: string; website: string;
  googleRating: number | null; googleUrl: string; cases: BizCase[]; createdAt: number;
  recs: number; hired: number; reports: number;
}
export interface Rec { id: number; userId: number; author: string; hired: boolean; comment: string; createdAt: number }
export interface ListingInput {
  kind: string; category: string; title: string; description: string; city: string; state: string; priceNote: string;
  whatsapp: string; instagram: string; website: string; googleRating: number | null; googleUrl: string; cases: BizCase[];
}

type Row = {
  id: number; user_id: number; owner: string; kind: string; category: string; title: string; description: string; city: string; state: string;
  price_note: string; whatsapp: string; instagram: string; website: string; google_rating: number | null; google_url: string; cases: string;
  created_at: number; recs: number; hired: number; reports: number;
};
const SELECT = `SELECT l.*, u.name AS owner,
  (SELECT COUNT(*) FROM biz_recs r WHERE r.listing_id = l.id) AS recs,
  (SELECT COUNT(*) FROM biz_recs r WHERE r.listing_id = l.id AND r.hired = 1) AS hired,
  (SELECT COUNT(*) FROM biz_reports x WHERE x.listing_id = l.id) AS reports
  FROM biz_listings l JOIN users u ON u.id = l.user_id`;

function map(r: Row): Listing {
  let cases: BizCase[] = [];
  try { cases = JSON.parse(r.cases); } catch { /* */ }
  return {
    id: r.id, userId: r.user_id, owner: r.owner, kind: r.kind === "product" ? "product" : "service", category: r.category, title: r.title, description: r.description,
    city: r.city, state: r.state, priceNote: r.price_note, whatsapp: r.whatsapp, instagram: r.instagram, website: r.website,
    googleRating: r.google_rating, googleUrl: r.google_url, cases, createdAt: r.created_at, recs: r.recs, hired: r.hired, reports: r.reports,
  };
}

const cut = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

/** Valida e limpa os campos. Devolve a mensagem de erro em PT-BR ou os dados prontos para gravar. */
export function cleanListing(i: ListingInput): { error: string } | { data: ListingInput } {
  const kind = i.kind === "product" ? "product" : i.kind === "service" ? "service" : "";
  if (!kind) return { error: "Escolha se é serviço ou produto." };
  if (!CATEGORIES.some((c) => c.id === i.category)) return { error: "Escolha uma categoria." };
  const title = cut(i.title, 80);
  const description = cut(i.description, 1200);
  if (title.length < 4) return { error: "Dê um título para o anúncio (mínimo 4 letras)." };
  if (description.length < 30) return { error: "Descreva melhor o que você oferece (mínimo 30 letras)." };
  const state = STATES.includes(i.state) ? i.state : "";
  const city = cut(i.city, 60);
  const whatsapp = String(i.whatsapp ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (whatsapp && !(whatsapp.length >= 10 && whatsapp.length <= 13)) return { error: "WhatsApp inválido: use DDD + número." };
  const instagram = cut(i.instagram, 40).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) return { error: "Instagram inválido." };
  const website = cut(i.website, 200);
  const webOk = cleanLink(website);
  if (website && !webOk) return { error: "Site inválido (precisa ser http ou https)." };
  if (!whatsapp && !instagram && !webOk) return { error: "Informe ao menos um contato: WhatsApp, Instagram ou site." };
  let googleRating: number | null = null;
  const googleUrl = cleanLink(cut(i.googleUrl, 300));
  if (i.googleRating !== null && i.googleRating !== undefined && String(i.googleRating) !== "") {
    const n = Math.round(Number(i.googleRating) * 10) / 10;
    if (!(n >= 1 && n <= 5)) return { error: "A nota do Google deve estar entre 1 e 5." };
    if (!googleUrl) return { error: "Para mostrar a nota do Google, cole o link do seu perfil no Google (assim os membros conferem)." };
    googleRating = n;
  }
  if (cut(i.googleUrl, 300) && !googleUrl) return { error: "Link do Google inválido." };
  const cases: BizCase[] = [];
  for (const c of (i.cases ?? []).slice(0, 3)) {
    const t = cut(c.title, 80), x = cut(c.text, 400), l = cut(c.link, 300);
    if (!t && !x && !l) continue;
    if (!t || !x) return { error: "Cada case de sucesso precisa de título e descrição." };
    const lk = cleanLink(l);
    if (l && !lk) return { error: "Link de case inválido." };
    cases.push({ title: t, text: x, link: lk });
  }
  return { data: { kind, category: i.category, title, description, city, state, priceNote: cut(i.priceNote, 80), whatsapp, instagram, website: webOk, googleRating, googleUrl, cases } };
}

export function countMine(userId: number): number {
  return (db().prepare("SELECT COUNT(*) c FROM biz_listings WHERE user_id = ?").get(userId) as { c: number }).c;
}

export function createListing(userId: number, i: ListingInput): number | { error: string } {
  const v = cleanListing(i);
  if ("error" in v) return v;
  if (countMine(userId) >= MAX_LISTINGS) return { error: `Limite de ${MAX_LISTINGS} anúncios por membro. Apague um para criar outro.` };
  const d = v.data;
  return Number(db().prepare(
    "INSERT INTO biz_listings (user_id, kind, category, title, description, city, state, price_note, whatsapp, instagram, website, google_rating, google_url, cases) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  ).run(userId, d.kind, d.category, d.title, d.description, d.city, d.state, d.priceNote, d.whatsapp, d.instagram, d.website, d.googleRating, d.googleUrl, JSON.stringify(d.cases)).lastInsertRowid);
}

export function updateListing(id: number, userId: number, isAdmin: boolean, i: ListingInput): true | { error: string } {
  const own = db().prepare("SELECT user_id FROM biz_listings WHERE id = ?").get(id) as { user_id: number } | undefined;
  if (!own) return { error: "Anúncio não encontrado." };
  if (own.user_id !== userId && !isAdmin) return { error: "Você só pode editar os seus anúncios." };
  const v = cleanListing(i);
  if ("error" in v) return v;
  const d = v.data;
  db().prepare(
    "UPDATE biz_listings SET kind=?, category=?, title=?, description=?, city=?, state=?, price_note=?, whatsapp=?, instagram=?, website=?, google_rating=?, google_url=?, cases=?, updated_at=unixepoch() WHERE id=?",
  ).run(d.kind, d.category, d.title, d.description, d.city, d.state, d.priceNote, d.whatsapp, d.instagram, d.website, d.googleRating, d.googleUrl, JSON.stringify(d.cases), id);
  return true;
}

export function deleteListing(id: number, userId: number, isAdmin: boolean): boolean {
  const r = isAdmin ? db().prepare("DELETE FROM biz_listings WHERE id = ?").run(id) : db().prepare("DELETE FROM biz_listings WHERE id = ? AND user_id = ?").run(id, userId);
  return r.changes > 0;
}

export function getListing(id: number): Listing | null {
  const r = db().prepare(`${SELECT} WHERE l.id = ?`).get(id) as Row | undefined;
  return r ? map(r) : null;
}

export function listMine(userId: number): Listing[] {
  return (db().prepare(`${SELECT} WHERE l.user_id = ? ORDER BY l.id DESC`).all(userId) as Row[]).map(map);
}

export interface Filters { q?: string; category?: string; kind?: string; state?: string; sort?: string }
export function searchListings(f: Filters): Listing[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (f.category && CATEGORIES.some((c) => c.id === f.category)) { where.push("l.category = ?"); args.push(f.category); }
  if (f.kind === "service" || f.kind === "product") { where.push("l.kind = ?"); args.push(f.kind); }
  if (f.state && STATES.includes(f.state)) { where.push("l.state = ?"); args.push(f.state); }
  const q = (f.q ?? "").trim().slice(0, 60);
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push("(l.title LIKE ? ESCAPE '\\' OR l.description LIKE ? ESCAPE '\\' OR l.city LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')");
    args.push(like, like, like, like);
  }
  const order = f.sort === "new" ? "l.id DESC" : f.sort === "google" ? "(l.google_rating IS NULL), l.google_rating DESC, recs DESC" : "recs DESC, hired DESC, l.id DESC";
  const sql = `${SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${order} LIMIT 200`;
  return (db().prepare(sql).all(...args) as Row[]).map(map);
}

export function listRecs(listingId: number): Rec[] {
  return (db().prepare("SELECT r.id, r.user_id, u.name AS author, r.hired, r.comment, r.created_at FROM biz_recs r JOIN users u ON u.id = r.user_id WHERE r.listing_id = ? ORDER BY r.id DESC LIMIT 100").all(listingId) as { id: number; user_id: number; author: string; hired: number; comment: string; created_at: number }[])
    .map((r) => ({ id: r.id, userId: r.user_id, author: r.author, hired: r.hired === 1, comment: r.comment, createdAt: r.created_at }));
}

/** Uma indicação por membro por anúncio (reenviar atualiza). Ninguém indica o próprio anúncio. */
export function addRec(listingId: number, userId: number, hired: boolean, comment: string): true | { error: string } {
  const l = db().prepare("SELECT user_id FROM biz_listings WHERE id = ?").get(listingId) as { user_id: number } | undefined;
  if (!l) return { error: "Anúncio não encontrado." };
  if (l.user_id === userId) return { error: "Você não pode indicar o seu próprio anúncio." };
  const c = comment.trim().slice(0, 400);
  if (c.length < 10) return { error: "Conte em poucas palavras como foi (mínimo 10 letras)." };
  db().prepare("INSERT INTO biz_recs (listing_id, user_id, hired, comment) VALUES (?,?,?,?) ON CONFLICT(listing_id, user_id) DO UPDATE SET hired=excluded.hired, comment=excluded.comment, created_at=unixepoch()").run(listingId, userId, hired ? 1 : 0, c);
  return true;
}

export function removeRec(recId: number, userId: number, isAdmin: boolean): boolean {
  const r = isAdmin ? db().prepare("DELETE FROM biz_recs WHERE id = ?").run(recId) : db().prepare("DELETE FROM biz_recs WHERE id = ? AND user_id = ?").run(recId, userId);
  return r.changes > 0;
}

export function reportListing(listingId: number, userId: number, reason: string): boolean {
  if (!getListing(listingId)) return false;
  db().prepare("INSERT OR REPLACE INTO biz_reports (listing_id, user_id, reason) VALUES (?,?,?)").run(listingId, userId, reason.trim().slice(0, 200) || "Sem motivo");
  return true;
}

export function listReports(listingId: number): { author: string; reason: string }[] {
  return db().prepare("SELECT u.name AS author, x.reason FROM biz_reports x JOIN users u ON u.id = x.user_id WHERE x.listing_id = ? ORDER BY x.created_at DESC").all(listingId) as { author: string; reason: string }[];
}
