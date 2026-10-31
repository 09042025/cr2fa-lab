import { db } from "./db";
import { MAX_BODY } from "./community";

/** Mensagens diretas entre membros (estilo WhatsApp). Imagens e áudios são privados: só os dois da conversa abrem. */

export interface DmMessage {
  id: number; senderId: number; recipientId: number; body: string;
  imageId: number | null; audioId: number | null; createdAt: number; readAt: number | null;
}
export interface Conversation {
  userId: number; name: string; avatarId: number | null; isAdmin: boolean;
  lastBody: string; lastKind: "text" | "image" | "audio"; lastAt: number; lastMine: boolean; unread: number;
}

type Result = { ok: true; id: number } | { ok: false; error: string; status?: number };

const isBlockedEitherWay = (a: number, b: number) =>
  !!db().prepare("SELECT 1 FROM community_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)").get(a, b, b, a);

/** Anexo só vale se for do próprio remetente, marcado como privado e ainda não usado em outra mensagem. */
function ownPrivateMedia(kind: "image" | "audio", id: number | null | undefined, userId: number): number | null {
  if (!id) return null;
  const t = kind === "image" ? "community_images" : "community_audios";
  const col = kind === "image" ? "image_id" : "audio_id";
  const row = db().prepare(`SELECT id FROM ${t} WHERE id = ? AND user_id = ? AND private = 1 AND id NOT IN (SELECT ${col} FROM dm_messages WHERE ${col} IS NOT NULL)`).get(id, userId);
  return row ? id : null;
}

export function sendDm(senderId: number, recipientId: number, bodyRaw: string, opts: { imageId?: number | null; audioId?: number | null } = {}): Result {
  const body = bodyRaw.trim();
  if (senderId === recipientId) return { ok: false, error: "Escolha outro membro." };
  if (body.length > MAX_BODY) return { ok: false, error: `A mensagem pode ter até ${MAX_BODY} caracteres.` };
  const to = db().prepare("SELECT id, role FROM users WHERE id = ?").get(recipientId) as { id: number; role: string } | undefined;
  if (!to) return { ok: false, error: "Membro não encontrado.", status: 404 };
  const me = db().prepare("SELECT role, community_banned b FROM users WHERE id = ?").get(senderId) as { role: string; b: number } | undefined;
  if (!me) return { ok: false, error: "Faça login.", status: 401 };
  if (me.b === 1) return { ok: false, error: "Você foi suspenso da comunidade pela moderação.", status: 403 };
  // administradores sempre podem receber (avisos oficiais e suporte); os demais respeitam o bloqueio
  if (to.role !== "admin" && me.role !== "admin" && isBlockedEitherWay(senderId, recipientId)) return { ok: false, error: "Não é possível enviar mensagem para este membro.", status: 403 };
  const image = ownPrivateMedia("image", opts.imageId, senderId);
  const audio = ownPrivateMedia("audio", opts.audioId, senderId);
  if (opts.imageId && !image) return { ok: false, error: "Imagem inválida. Envie de novo." };
  if (opts.audioId && !audio) return { ok: false, error: "Áudio inválido. Grave de novo." };
  if (!body && !image && !audio) return { ok: false, error: "Escreva uma mensagem ou anexe algo." };
  const id = Number(db().prepare("INSERT INTO dm_messages (sender_id, recipient_id, body, image_id, audio_id) VALUES (?, ?, ?, ?, ?)").run(senderId, recipientId, body, image, audio).lastInsertRowid);
  return { ok: true, id };
}

const MSG_COLS = "id, sender_id senderId, recipient_id recipientId, body, image_id imageId, audio_id audioId, created_at createdAt, read_at readAt";

/** Conversa com um membro (ordem cronológica). Marca como lidas as mensagens recebidas. */
export function listConversation(me: number, other: number, afterId = 0, limit = 200): DmMessage[] {
  const rows = db().prepare(
    `SELECT ${MSG_COLS} FROM dm_messages
     WHERE id > ? AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
     ORDER BY id DESC LIMIT ?`,
  ).all(afterId, me, other, other, me, limit) as DmMessage[];
  db().prepare("UPDATE dm_messages SET read_at = unixepoch() WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL").run(me, other);
  return rows.reverse();
}

export function listConversations(me: number): Conversation[] {
  const rows = db().prepare(
    `SELECT u.id userId, u.name, u.avatar_id avatarId, u.role = 'admin' isAdmin,
            m.body lastBody, m.image_id lastImage, m.audio_id lastAudio, m.created_at lastAt, m.sender_id = ? lastMine,
            (SELECT COUNT(*) FROM dm_messages x WHERE x.recipient_id = ? AND x.sender_id = u.id AND x.read_at IS NULL) unread
     FROM dm_messages m
     JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END
     WHERE m.id IN (
       SELECT MAX(id) FROM dm_messages WHERE sender_id = ? OR recipient_id = ?
       GROUP BY CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END
     )
     ORDER BY m.id DESC`,
  ).all(me, me, me, me, me, me) as (Omit<Conversation, "lastKind" | "lastMine" | "isAdmin"> & { lastImage: number | null; lastAudio: number | null; lastMine: number; isAdmin: number })[];
  return rows.map(({ lastImage, lastAudio, ...r }) => ({
    ...r, isAdmin: !!r.isAdmin, lastMine: !!r.lastMine,
    lastKind: r.lastBody ? "text" : lastImage ? "image" : lastAudio ? "audio" : "text",
  }));
}

export const unreadCount = (me: number): number =>
  (db().prepare("SELECT COUNT(*) c FROM dm_messages WHERE recipient_id = ? AND read_at IS NULL").get(me) as { c: number }).c;

/** Apaga a própria mensagem (some para os dois). */
export function deleteDm(id: number, userId: number): boolean {
  return db().prepare("DELETE FROM dm_messages WHERE id = ? AND sender_id = ?").run(id, userId).changes > 0;
}

/** Busca de membros para começar uma conversa (por nome). */
export function searchMembers(me: number, q: string): { id: number; name: string; avatarId: number | null }[] {
  const term = q.trim().slice(0, 40).replace(/[%_\\]/g, "");
  if (term.length < 2) return [];
  return db().prepare("SELECT id, name, avatar_id avatarId FROM users WHERE id != ? AND name LIKE ? ESCAPE '\\' ORDER BY name LIMIT 8").all(me, `%${term}%`) as { id: number; name: string; avatarId: number | null }[];
}

/** Mídia privada de conversa: só abre para quem enviou ou recebeu a mensagem que a usa. */
export function privateMediaAllowed(kind: "image" | "audio", id: number, userId: number): boolean | null {
  const t = kind === "image" ? "community_images" : "community_audios";
  const col = kind === "image" ? "image_id" : "audio_id";
  const row = db().prepare(`SELECT user_id, private FROM ${t} WHERE id = ?`).get(id) as { user_id: number; private: number } | undefined;
  if (!row || row.private !== 1) return null; // não é mídia privada: vale a regra normal
  if (row.user_id === userId) return true;
  return !!db().prepare(`SELECT 1 FROM dm_messages WHERE ${col} = ? AND (sender_id = ? OR recipient_id = ?)`).get(id, userId, userId);
}
