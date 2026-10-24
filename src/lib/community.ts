import { db } from "./db";

/**
 * Canais da Comunidade, no estilo do Discord. Os canais são fixos (definidos aqui);
 * só as mensagens ficam no banco. "post: admin" = só o administrador escreve (avisos e regras).
 * "admin: true" = canal visível só para administradores (moderação).
 */
export interface Channel {
  slug: string;
  name: string;
  icon: string;
  description: string;
  post: "pro" | "admin";
  admin?: boolean;
  /** Canal aberto também para o plano Grátis. */
  free?: boolean;
  /** Texto fixo no topo do canal (regras, avisos de segurança). */
  intro?: string[];
}
export interface Category { id: string; label: string; channels: Channel[] }

const SECURITY = [
  "🚨 ATENÇÃO, NOVOS MEMBROS 🚨",
  "Para sua segurança, é fundamental saber:",
  "❗ NÃO entramos em contato via mensagem privada.",
  "❗ Nenhum administrador solicita dinheiro, investimentos ou dados pessoais no privado.",
  "❗ Desconfie de qualquer abordagem direta, mesmo que use nome ou foto semelhante à do Emerson Niza.",
  "⚠️ Golpistas podem tentar contato direto com novos membros. Nunca envie dinheiro, códigos ou informações pessoais.",
  "Se receber qualquer mensagem suspeita: ✔️ Ignore  ✔️ Bloqueie  ✔️ Denuncie para a moderação.",
  "🔒 Sua segurança depende da sua atenção.",
];

export const CATEGORIES: Category[] = [
  {
    id: "info",
    label: "Informações",
    channels: [
      {
        slug: "boas-vindas-e-regras", name: "boas-vindas-e-regras", icon: "shield", post: "admin",
        description: "Regras da comunidade e como ela funciona.",
        intro: [
          "Seja bem-vindo à comunidade NIZA INVEST!",
          "1. Respeito acima de tudo: sem ofensas, spam ou divulgação de terceiros.",
          "2. Nada aqui é recomendação de investimento. Cada um decide por conta própria.",
          "3. Não peça nem ofereça sinais, empréstimos ou “investimentos garantidos”.",
          "4. Nunca compartilhe senhas, frases de recuperação ou dados pessoais.",
          ...SECURITY,
        ],
      },
      { slug: "anuncios", name: "anuncios-do-canal", icon: "bell", post: "admin", description: "Avisos oficiais do Emerson e da equipe.", intro: SECURITY },
      { slug: "chat-geral", name: "chat-geral", icon: "users", post: "pro", free: true, description: "Bate-papo geral entre os membros." },
    ],
  },
  {
    id: "texto",
    label: "Canais de texto",
    channels: [
      { slug: "geral", name: "geral", icon: "trend", post: "pro", description: "Mercado, ativos e dúvidas do dia a dia." },
      { slug: "planejamento-de-reunioes", name: "planejamento-de-reuniões", icon: "calendar", post: "pro", description: "Sugestões de temas e horários para as reuniões ao vivo." },
    ],
  },
  {
    id: "mod",
    label: "Moderação",
    channels: [{ slug: "moderador", name: "moderator-only", icon: "lock", post: "admin", admin: true, description: "Canal privado da equipe de moderação." }],
  },
];

export const VOICE = [{ name: "Lounge", icon: "headset" }, { name: "Sala de reuniões", icon: "video" }];

export const MAX_BODY = 1000;

export function visibleCategories(isAdmin: boolean): Category[] {
  return CATEGORIES.map((c) => ({ ...c, channels: c.channels.filter((ch) => isAdmin || !ch.admin) })).filter((c) => c.channels.length);
}

export function findChannel(slug: string | undefined, isAdmin: boolean): Channel {
  const all = visibleCategories(isAdmin).flatMap((c) => c.channels);
  return all.find((c) => c.slug === slug) ?? all.find((c) => c.slug === "chat-geral")!;
}

/** Quem pode ler o canal: Pró vê todos; Grátis só os canais marcados como livres. */
export function canView(ch: Channel, user: { role: string; plan: string }): boolean {
  return user.role === "admin" || user.plan === "pro" || !!ch.free;
}

export function canPost(ch: Channel, user: { role: string; plan: string }): boolean {
  if (user.role === "admin") return true;
  return !ch.admin && ch.post === "pro" && canView(ch, user);
}

const FREE_SLUGS = () => CATEGORIES.flatMap((c) => c.channels).filter((c) => c.free).map((c) => c.slug);

/** Verdadeiro se a mensagem está em um canal aberto ao plano Grátis. */
export function messageIsFree(messageId: number): boolean {
  const m = db().prepare("SELECT channel FROM community_messages WHERE id = ?").get(messageId) as { channel: string } | undefined;
  return !!m && FREE_SLUGS().includes(m.channel);
}

/** Imagem/áudio visíveis ao plano Grátis: só os de mensagens de canais livres ou de publicações do feed. */
export function mediaIsFree(kind: "image" | "audio", id: number): boolean {
  if (!Number.isInteger(id)) return false;
  const col = kind === "image" ? "image_id" : "audio_id";
  const slugs = FREE_SLUGS();
  const inChat = db().prepare(`SELECT 1 FROM community_messages WHERE ${col} = ? AND channel IN (${slugs.map(() => "?").join(",")})`).get(id, ...slugs);
  if (inChat) return true;
  if (kind !== "image") return false;
  return !!db().prepare("SELECT 1 FROM community_posts WHERE image_id = ? UNION SELECT 1 FROM users WHERE avatar_id = ? OR banner_id = ?").get(id, id, id);
}

export const REACTIONS = ["👍", "🔥", "🚀", "💰", "👏", "😂"] as const;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export interface CommunityMessage {
  id: number;
  userId: number;
  author: string;
  isAdmin: boolean;
  banned: boolean;
  avatarId: number | null;
  body: string;
  createdAt: number;
  imageId: number | null;
  audioId: number | null;
  edited: boolean;
  reply: { id: number; author: string; body: string } | null;
  /** emoji -> quantidade, e quais o usuário atual marcou. */
  reactions: { emoji: string; count: number; mine: boolean }[];
}

export function listMessages(channel: string, viewerId: number, limit = 100): CommunityMessage[] {
  const rows = db()
    .prepare(
      `SELECT m.id, m.user_id userId, u.name author, u.role role, u.community_banned banned, u.avatar_id avatarId, m.body, m.created_at createdAt, m.image_id imageId, m.audio_id audioId, m.edited_at editedAt,
              r.id rid, ru.name rauthor, r.body rbody
       FROM community_messages m JOIN users u ON u.id = m.user_id
       LEFT JOIN community_messages r ON r.id = m.reply_to
       LEFT JOIN users ru ON ru.id = r.user_id
       WHERE m.channel = ? AND (m.user_id = ? OR m.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = ?)) ORDER BY m.id DESC LIMIT ?`,
    )
    .all(channel, viewerId, viewerId, limit) as { id: number; userId: number; author: string; role: string; banned: number; avatarId: number | null; body: string; createdAt: number; imageId: number | null; audioId: number | null; editedAt: number | null; rid: number | null; rauthor: string | null; rbody: string | null }[];
  rows.reverse();
  const ids = rows.map((r) => r.id);
  const reacts = ids.length
    ? (db()
        .prepare(`SELECT message_id mid, emoji, COUNT(*) c, SUM(user_id = ?) mine FROM community_reactions WHERE message_id IN (${ids.map(() => "?").join(",")}) GROUP BY message_id, emoji ORDER BY MIN(rowid)`)
        .all(viewerId, ...ids) as { mid: number; emoji: string; c: number; mine: number }[])
    : [];
  return rows.map((r) => ({
    id: r.id, userId: r.userId, author: r.author, isAdmin: r.role === "admin", banned: r.banned === 1, avatarId: r.avatarId, body: r.body, createdAt: r.createdAt, imageId: r.imageId, audioId: r.audioId, edited: r.editedAt !== null,
    reply: r.rid ? { id: r.rid, author: r.rauthor ?? "?", body: (r.rbody ?? "").slice(0, 120) } : null,
    reactions: reacts.filter((x) => x.mid === r.id).map((x) => ({ emoji: x.emoji, count: x.c, mine: x.mine > 0 })),
  }));
}

export function isBanned(userId: number): boolean {
  return (db().prepare("SELECT community_banned b FROM users WHERE id = ?").get(userId) as { b: number } | undefined)?.b === 1;
}

/** Só administradores banem; não dá para banir a si mesmo nem outro administrador. */
export function setBanned(admin: { id: number; role: string }, userId: number, banned: boolean): boolean {
  if (admin.role !== "admin" || admin.id === userId) return false;
  return db().prepare("UPDATE users SET community_banned = ? WHERE id = ? AND role != 'admin'").run(banned ? 1 : 0, userId).changes > 0;
}

/** Confere o tipo real pelos primeiros bytes (não confia no que o navegador diz). */
export function sniffImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString("latin1", 1, 4) === "PNG") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.toString("latin1", 0, 4) === "GIF8") return "image/gif";
  if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export function saveImage(userId: number, buf: Buffer): number | null {
  const mime = sniffImage(buf);
  if (!mime || buf.length > MAX_IMAGE_BYTES) return null;
  return Number(db().prepare("INSERT INTO community_images (user_id, mime, data) VALUES (?, ?, ?)").run(userId, mime, buf).lastInsertRowid);
}

export const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

/** Confere o tipo real do áudio pelos primeiros bytes (webm/opus do Chrome e Firefox, ogg, mp4/aac do Safari, mp3, wav). */
export function sniffAudio(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "audio/webm";
  if (buf.toString("latin1", 0, 4) === "OggS") return "audio/ogg";
  if (buf.toString("latin1", 4, 8) === "ftyp") return "audio/mp4";
  if (buf.toString("latin1", 0, 3) === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return "audio/mpeg";
  if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WAVE") return "audio/wav";
  return null;
}

export function saveAudio(userId: number, buf: Buffer): number | null {
  const mime = sniffAudio(buf);
  if (!mime || buf.length > MAX_AUDIO_BYTES) return null;
  return Number(db().prepare("INSERT INTO community_audios (user_id, mime, data) VALUES (?, ?, ?)").run(userId, mime, buf).lastInsertRowid);
}

export function getAudio(id: number): { mime: string; data: Buffer } | null {
  return (db().prepare("SELECT mime, data FROM community_audios WHERE id = ?").get(id) as { mime: string; data: Buffer } | undefined) ?? null;
}

export function getImage(id: number): { mime: string; data: Buffer } | null {
  return (db().prepare("SELECT mime, data FROM community_images WHERE id = ?").get(id) as { mime: string; data: Buffer } | undefined) ?? null;
}

/** Cria a mensagem. Resposta só vale para mensagem do mesmo canal; imagem só se for do próprio autor e ainda não usada. */
export function addMessage(channel: string, userId: number, body: string, opts: { replyTo?: number | null; imageId?: number | null; audioId?: number | null } = {}): number {
  let reply: number | null = null;
  if (opts.replyTo) reply = (db().prepare("SELECT id FROM community_messages WHERE id = ? AND channel = ?").get(opts.replyTo, channel) as { id: number } | undefined)?.id ?? null;
  let image: number | null = null;
  if (opts.imageId) {
    image = (db().prepare("SELECT id FROM community_images WHERE id = ? AND user_id = ? AND id NOT IN (SELECT image_id FROM community_messages WHERE image_id IS NOT NULL)").get(opts.imageId, userId) as { id: number } | undefined)?.id ?? null;
  }
  let audio: number | null = null;
  if (opts.audioId) {
    audio = (db().prepare("SELECT id FROM community_audios WHERE id = ? AND user_id = ? AND id NOT IN (SELECT audio_id FROM community_messages WHERE audio_id IS NOT NULL)").get(opts.audioId, userId) as { id: number } | undefined)?.id ?? null;
  }
  return Number(db().prepare("INSERT INTO community_messages (channel, user_id, body, reply_to, image_id, audio_id) VALUES (?, ?, ?, ?, ?, ?)").run(channel, userId, body, reply, image, audio).lastInsertRowid);
}

/** Marca ou desmarca uma reação. Devolve false para emoji fora da lista ou mensagem inexistente. */
export function toggleReaction(messageId: number, userId: number, emoji: string): boolean {
  if (!(REACTIONS as readonly string[]).includes(emoji)) return false;
  if (!db().prepare("SELECT 1 FROM community_messages WHERE id = ?").get(messageId)) return false;
  const del = db().prepare("DELETE FROM community_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?").run(messageId, userId, emoji);
  if (!del.changes) db().prepare("INSERT INTO community_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)").run(messageId, userId, emoji);
  return true;
}

/** Apaga a mensagem se for do próprio autor ou se quem pede for administrador. */
export function deleteMessage(id: number, user: { id: number; role: string }): boolean {
  const r =
    user.role === "admin"
      ? db().prepare("DELETE FROM community_messages WHERE id = ?").run(id)
      : db().prepare("DELETE FROM community_messages WHERE id = ? AND user_id = ?").run(id, user.id);
  return r.changes > 0;
}

/** Quebra o texto em pedaços comuns e menções (@nome). */
export function splitMentions(body: string): { text: string; mention: boolean }[] {
  return body.split(/(@[\p{L}\p{N}_.-]+)/u).filter(Boolean).map((t) => ({ text: t, mention: /^@[\p{L}\p{N}_.-]+$/u.test(t) }));
}

/** Só o autor edita a própria mensagem (administradores podem apagar, mas não reescrever o que outro disse). */
export function editMessage(id: number, userId: number, body: string): boolean {
  const text = body.trim();
  if (!text || text.length > MAX_BODY) return false;
  return db().prepare("UPDATE community_messages SET body = ?, edited_at = unixepoch() WHERE id = ? AND user_id = ?").run(text, id, userId).changes > 0;
}

export const REPORT_REASONS = ["Spam ou divulgação", "Golpe ou pedido de dinheiro", "Ofensa ou assédio", "Outro motivo"] as const;

/** Denúncia de uma mensagem de outro membro. Uma por pessoa e mensagem. */
export function reportMessage(messageId: number, reporterId: number, reason: string): boolean {
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return false;
  const m = db().prepare("SELECT user_id FROM community_messages WHERE id = ?").get(messageId) as { user_id: number } | undefined;
  if (!m || m.user_id === reporterId) return false;
  return db().prepare("INSERT OR IGNORE INTO community_reports (message_id, reporter_id, reason) VALUES (?, ?, ?)").run(messageId, reporterId, reason).changes > 0;
}

export interface ReportItem { id: number; reason: string; createdAt: number; reporter: string; messageId: number; body: string; authorId: number; author: string; authorBanned: boolean; channel: string }

export function listReports(): ReportItem[] {
  return db()
    .prepare(
      `SELECT r.id, r.reason, r.created_at createdAt, rp.name reporter, m.id messageId, m.body, m.channel, a.id authorId, a.name author, a.community_banned = 1 authorBanned
       FROM community_reports r JOIN community_messages m ON m.id = r.message_id
       JOIN users rp ON rp.id = r.reporter_id JOIN users a ON a.id = m.user_id
       ORDER BY r.id DESC LIMIT 100`,
    )
    .all() as ReportItem[];
}

export function dismissReport(id: number): boolean {
  return db().prepare("DELETE FROM community_reports WHERE id = ?").run(id).changes > 0;
}

/** Bloqueia ou desbloqueia um membro: as mensagens dele somem só para quem bloqueou. */
export function setBlocked(blockerId: number, blockedId: number, blocked: boolean): boolean {
  if (blockerId === blockedId) return false;
  if (!db().prepare("SELECT 1 FROM users WHERE id = ?").get(blockedId)) return false;
  // administradores não podem ser bloqueados: as regras e os avisos oficiais têm que chegar a todos
  if (blocked && db().prepare("SELECT 1 FROM users WHERE id = ? AND role = 'admin'").get(blockedId)) return false;
  if (blocked) db().prepare("INSERT OR IGNORE INTO community_blocks (blocker_id, blocked_id) VALUES (?, ?)").run(blockerId, blockedId);
  else db().prepare("DELETE FROM community_blocks WHERE blocker_id = ? AND blocked_id = ?").run(blockerId, blockedId);
  return true;
}

export function listBlocked(blockerId: number): { id: number; name: string }[] {
  return db().prepare("SELECT u.id, u.name FROM community_blocks b JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = ? ORDER BY u.name").all(blockerId) as { id: number; name: string }[];
}

export type RichToken = { type: "text" | "mention"; text: string } | { type: "link"; text: string; href: string };

const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;

/** Quebra o texto em pedaços comuns, menções (@nome) e links http(s). Pontuação no fim do link (.,;:!?)) fica fora dele. */
export function splitRich(body: string): RichToken[] {
  const out: RichToken[] = [];
  for (const part of body.split(URL_RE)) {
    if (!part) continue;
    if (/^https?:\/\//i.test(part)) {
      const m = /^(.*?)([.,;:!?)\]]*)$/.exec(part)!;
      const url = m[1];
      try {
        const u = new URL(url);
        if (u.protocol === "http:" || u.protocol === "https:") {
          out.push({ type: "link", text: url, href: u.toString() });
          if (m[2]) out.push({ type: "text", text: m[2] });
          continue;
        }
      } catch {
        /* não é um endereço válido: segue como texto */
      }
      out.push({ type: "text", text: part });
    } else {
      for (const t of splitMentions(part)) out.push({ type: t.mention ? "mention" : "text", text: t.text });
    }
  }
  return out;
}

/** Texto curto para mostrar no lugar de um link comprido: domínio e começo do caminho. */
export function shortUrl(url: string, max = 48): string {
  const t = url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
