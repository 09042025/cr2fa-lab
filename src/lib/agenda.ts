import { db, now } from "./db";

/** Agenda de reuniões e lives (estilo Outlook): o administrador cadastra, os membros Premium veem e entram pelo link. */
export interface MeetingEvent { id: number; title: string; startsAt: number; endsAt: number; link: string; notes: string }

/** Aceita só endereços http(s); devolve o link limpo ou "" se for inválido. */
export function cleanLink(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export function plataforma(link: string): string {
  const h = (() => { try { return new URL(link).hostname.toLowerCase(); } catch { return ""; } })();
  if (h.includes("meet.google")) return "Google Meet";
  if (h.includes("zoom.")) return "Zoom";
  if (h.includes("teams.microsoft") || h.includes("teams.live")) return "Microsoft Teams";
  if (h.includes("youtube") || h === "youtu.be") return "YouTube";
  if (h.includes("instagram")) return "Instagram";
  if (h.includes("discord")) return "Discord";
  return link ? "Link da reunião" : "";
}

type Row = { id: number; title: string; starts_at: number; ends_at: number; link: string; notes: string };
const map = (r: Row): MeetingEvent => ({ id: r.id, title: r.title, startsAt: r.starts_at, endsAt: r.ends_at, link: r.link, notes: r.notes });

/** Eventos a partir de `from` (padrão: 45 dias atrás), em ordem de data. */
export function listEvents(from = now() - 45 * 86400): MeetingEvent[] {
  return (db().prepare("SELECT id, title, starts_at, ends_at, link, notes FROM meeting_events WHERE ends_at >= ? ORDER BY starts_at, id LIMIT 500").all(from) as Row[]).map(map);
}

export function addEvent(userId: number, input: { title: string; startsAt: number; durationMin: number; link: string; notes: string }): MeetingEvent | null {
  const title = input.title.trim().slice(0, 120);
  const durationMin = Math.min(24 * 60, Math.max(5, Math.round(input.durationMin) || 60));
  if (!title || !Number.isInteger(input.startsAt) || input.startsAt < 946684800 || input.startsAt > 4102444800) return null;
  const link = cleanLink(input.link);
  if (input.link.trim() && !link) return null;
  const r = db()
    .prepare("INSERT INTO meeting_events (title, starts_at, ends_at, link, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)")
    .run(title, input.startsAt, input.startsAt + durationMin * 60, link.slice(0, 500), input.notes.trim().slice(0, 600), userId);
  return map(db().prepare("SELECT id, title, starts_at, ends_at, link, notes FROM meeting_events WHERE id = ?").get(r.lastInsertRowid) as Row);
}

export function deleteEvent(id: number): boolean {
  return db().prepare("DELETE FROM meeting_events WHERE id = ?").run(id).changes > 0;
}
