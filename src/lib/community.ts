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

export interface CommunityMessage { id: number; userId: number; author: string; isAdmin: boolean; body: string; createdAt: number }

export function listMessages(channel: string, limit = 100): CommunityMessage[] {
  const rows = db()
    .prepare(
      `SELECT m.id, m.user_id userId, u.name author, u.role role, m.body, m.created_at createdAt
       FROM community_messages m JOIN users u ON u.id = m.user_id
       WHERE m.channel = ? ORDER BY m.id DESC LIMIT ?`,
    )
    .all(channel, limit) as { id: number; userId: number; author: string; role: string; body: string; createdAt: number }[];
  return rows.reverse().map((r) => ({ id: r.id, userId: r.userId, author: r.author, isAdmin: r.role === "admin", body: r.body, createdAt: r.createdAt }));
}

export function addMessage(channel: string, userId: number, body: string): number {
  return Number(db().prepare("INSERT INTO community_messages (channel, user_id, body) VALUES (?, ?, ?)").run(channel, userId, body).lastInsertRowid);
}

/** Apaga a mensagem se for do próprio autor ou se quem pede for administrador. */
export function deleteMessage(id: number, user: { id: number; role: string }): boolean {
  const r =
    user.role === "admin"
      ? db().prepare("DELETE FROM community_messages WHERE id = ?").run(id)
      : db().prepare("DELETE FROM community_messages WHERE id = ? AND user_id = ?").run(id, user.id);
  return r.changes > 0;
}
