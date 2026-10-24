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
        slug: "boas-vindas-e-regras", name: "boas-vindas-e-regras", icon: "✅", post: "admin",
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
      { slug: "anuncios", name: "anuncios-do-canal", icon: "📢", post: "admin", description: "Avisos oficiais do Emerson e da equipe.", intro: SECURITY },
      { slug: "chat-geral", name: "chat-geral", icon: "💬", post: "pro", description: "Bate-papo geral entre os membros Pró." },
    ],
  },
  {
    id: "texto",
    label: "Canais de texto",
    channels: [
      { slug: "geral", name: "geral", icon: "#", post: "pro", description: "Mercado, ativos e dúvidas do dia a dia." },
      { slug: "planejamento-de-reunioes", name: "planejamento-de-reuniões", icon: "#", post: "pro", description: "Sugestões de temas e horários para as reuniões ao vivo." },
    ],
  },
  {
    id: "mod",
    label: "Moderação",
    channels: [{ slug: "moderador", name: "moderator-only", icon: "🔒", post: "admin", admin: true, description: "Canal privado da equipe de moderação." }],
  },
];

export const VOICE = ["Lounge", "Sala de reuniões"];

export const MAX_BODY = 1000;

export function visibleCategories(isAdmin: boolean): Category[] {
  return CATEGORIES.map((c) => ({ ...c, channels: c.channels.filter((ch) => isAdmin || !ch.admin) })).filter((c) => c.channels.length);
}

export function findChannel(slug: string | undefined, isAdmin: boolean): Channel {
  const all = visibleCategories(isAdmin).flatMap((c) => c.channels);
  return all.find((c) => c.slug === slug) ?? all.find((c) => c.slug === "chat-geral")!;
}

export function canPost(ch: Channel, user: { role: string; plan: string }): boolean {
  if (user.role === "admin") return true;
  return !ch.admin && ch.post === "pro" && user.plan === "pro";
}

export const REACTIONS = ["👍", "🔥", "🚀", "💰", "👏", "😂"] as const;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export interface CommunityMessage {
  id: number;
  userId: number;
  author: string;
  isAdmin: boolean;
  banned: boolean;
  body: string;
  createdAt: number;
  imageId: number | null;
  reply: { id: number; author: string; body: string } | null;
  /** emoji -> quantidade, e quais o usuário atual marcou. */
  reactions: { emoji: string; count: number; mine: boolean }[];
}

export function listMessages(channel: string, viewerId: number, limit = 100): CommunityMessage[] {
  const rows = db()
    .prepare(
      `SELECT m.id, m.user_id userId, u.name author, u.role role, u.community_banned banned, m.body, m.created_at createdAt, m.image_id imageId,
              r.id rid, ru.name rauthor, r.body rbody
       FROM community_messages m JOIN users u ON u.id = m.user_id
       LEFT JOIN community_messages r ON r.id = m.reply_to
       LEFT JOIN users ru ON ru.id = r.user_id
       WHERE m.channel = ? ORDER BY m.id DESC LIMIT ?`,
    )
    .all(channel, limit) as { id: number; userId: number; author: string; role: string; banned: number; body: string; createdAt: number; imageId: number | null; rid: number | null; rauthor: string | null; rbody: string | null }[];
  rows.reverse();
  const ids = rows.map((r) => r.id);
  const reacts = ids.length
    ? (db()
        .prepare(`SELECT message_id mid, emoji, COUNT(*) c, SUM(user_id = ?) mine FROM community_reactions WHERE message_id IN (${ids.map(() => "?").join(",")}) GROUP BY message_id, emoji ORDER BY MIN(rowid)`)
        .all(viewerId, ...ids) as { mid: number; emoji: string; c: number; mine: number }[])
    : [];
  return rows.map((r) => ({
    id: r.id, userId: r.userId, author: r.author, isAdmin: r.role === "admin", banned: r.banned === 1, body: r.body, createdAt: r.createdAt, imageId: r.imageId,
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

export function getImage(id: number): { mime: string; data: Buffer } | null {
  return (db().prepare("SELECT mime, data FROM community_images WHERE id = ?").get(id) as { mime: string; data: Buffer } | undefined) ?? null;
}

/** Cria a mensagem. Resposta só vale para mensagem do mesmo canal; imagem só se for do próprio autor e ainda não usada. */
export function addMessage(channel: string, userId: number, body: string, opts: { replyTo?: number | null; imageId?: number | null } = {}): number {
  let reply: number | null = null;
  if (opts.replyTo) reply = (db().prepare("SELECT id FROM community_messages WHERE id = ? AND channel = ?").get(opts.replyTo, channel) as { id: number } | undefined)?.id ?? null;
  let image: number | null = null;
  if (opts.imageId) {
    image = (db().prepare("SELECT id FROM community_images WHERE id = ? AND user_id = ? AND id NOT IN (SELECT image_id FROM community_messages WHERE image_id IS NOT NULL)").get(opts.imageId, userId) as { id: number } | undefined)?.id ?? null;
  }
  return Number(db().prepare("INSERT INTO community_messages (channel, user_id, body, reply_to, image_id) VALUES (?, ?, ?, ?, ?)").run(channel, userId, body, reply, image).lastInsertRowid);
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
