import { db, now } from "./db";

/** Agenda de reuniões e lives (estilo Outlook): o administrador cadastra, os membros Premium veem e entram pelo link. */
export interface MeetingEvent { id: number; title: string; startsAt: number; endsAt: number; link: string; notes: string; kind: "reuniao" | "evento" }

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

type Row = { id: number; title: string; starts_at: number; ends_at: number; link: string; notes: string; kind: string };
const map = (r: Row): MeetingEvent => ({ id: r.id, title: r.title, startsAt: r.starts_at, endsAt: r.ends_at, link: r.link, notes: r.notes, kind: r.kind === "evento" ? "evento" : "reuniao" });

/** Eventos a partir de `from` (padrão: 45 dias atrás), em ordem de data. */
export function listEvents(from = now() - 45 * 86400): MeetingEvent[] {
  return (db().prepare("SELECT id, title, starts_at, ends_at, link, notes, kind FROM meeting_events WHERE ends_at >= ? ORDER BY starts_at, id LIMIT 500").all(from) as Row[]).map(map);
}

export function addEvent(userId: number, input: { title: string; startsAt: number; durationMin: number; link: string; notes: string; kind?: string }): MeetingEvent | null {
  const title = input.title.trim().slice(0, 120);
  const durationMin = Math.min(24 * 60, Math.max(5, Math.round(input.durationMin) || 60));
  if (!title || !Number.isInteger(input.startsAt) || input.startsAt < 946684800 || input.startsAt > 4102444800) return null;
  const link = cleanLink(input.link);
  if (input.link.trim() && !link) return null;
  const r = db()
    .prepare("INSERT INTO meeting_events (title, starts_at, ends_at, link, notes, kind, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(title, input.startsAt, input.startsAt + durationMin * 60, link.slice(0, 500), input.notes.trim().slice(0, 600), input.kind === "evento" ? "evento" : "reuniao", userId);
  return map(db().prepare("SELECT id, title, starts_at, ends_at, link, notes, kind FROM meeting_events WHERE id = ?").get(r.lastInsertRowid) as Row);
}

export function deleteEvent(id: number): boolean {
  return db().prepare("DELETE FROM meeting_events WHERE id = ?").run(id).changes > 0;
}

/* ---------- Aviso diário por e-mail (08:00 de Brasília) até a data da reunião ---------- */
import { effectivePlan, type UserRow } from "./db";
import { mailEnabled, meetingEmail, sendMail } from "./mail";

const brDay = (ts: number) => new Date((ts - 3 * 3600) * 1000).toISOString().slice(0, 10);
const brHour = (ts: number) => new Date((ts - 3 * 3600) * 1000).getUTCHours();

type Sender = (to: string, mail: { subject: string; html: string; text: string }) => Promise<void>;

/**
 * A partir das 08:00 (Brasília), manda a cada membro Premium um aviso por evento ainda não realizado, uma vez por dia,
 * até o dia da reunião (inclusive, enquanto ela não terminou). Depois disso não envia mais; evento novo reinicia o ciclo.
 * Só registra como enviado se o e-mail saiu, então uma falha é tentada de novo na próxima rodada.
 */
export async function runAgendaMail(send: Sender = (to, m) => sendMail({ to, ...m }), t: number = now(), pauseMs = 600): Promise<number> {
  if (brHour(t) < 8) return 0;
  const today = brDay(t);
  const events = (db().prepare("SELECT id, title, starts_at, ends_at, link, notes, kind FROM meeting_events WHERE ends_at > ? ORDER BY starts_at").all(t) as Row[]).map(map).filter((e) => brDay(e.startsAt) >= today);
  if (!events.length) return 0;
  const users = (db().prepare("SELECT * FROM users WHERE role = 'user'").all() as UserRow[]).filter((u) => effectivePlan(u) === "pro");
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const url = `${base}/painel/comunidade?c=planejamento-de-reunioes`;
  const done = db().prepare("SELECT 1 FROM meeting_mail_log WHERE event_id = ? AND user_id = ? AND day = ?");
  const mark = db().prepare("INSERT OR IGNORE INTO meeting_mail_log (event_id, user_id, day) VALUES (?, ?, ?)");
  let sent = 0;
  for (const ev of events) {
    for (const u of users) {
      if (done.get(ev.id, u.id, today)) continue;
      try {
        await send(u.email, meetingEmail(u.name, ev, url));
        mark.run(ev.id, u.id, today);
        sent += 1;
        if (pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
      } catch (e) {
        console.error("[agenda] falha ao enviar aviso para o usuário", u.id, e);
      }
    }
  }
  return sent;
}

const g = globalThis as unknown as { __agendaTimer?: NodeJS.Timeout };

/** Verifica a cada 10 minutos; o controle de "uma vez por dia" fica no banco. */
export function startAgendaMailJob(): void {
  if (g.__agendaTimer) return;
  if (!mailEnabled()) {
    console.log("[agenda] E-mail não configurado (RESEND_API_KEY e MAIL_FROM): avisos da agenda desativados.");
    return;
  }
  const tick = () => runAgendaMail().then((n) => n > 0 && console.log(`[agenda] ${n} aviso(s) de reunião enviado(s).`)).catch((e) => console.error("[agenda] erro:", e));
  setTimeout(tick, 90 * 1000).unref?.();
  g.__agendaTimer = setInterval(tick, 10 * 60 * 1000);
  g.__agendaTimer.unref?.();
}

/** Reuniões online (não eventos) que ainda não terminaram, em ordem: aparecem na Sala de Reuniões. */
export function roomMeetings(t: number = now()): MeetingEvent[] {
  return (db().prepare("SELECT id, title, starts_at, ends_at, link, notes, kind FROM meeting_events WHERE kind = 'reuniao' AND ends_at >= ? ORDER BY starts_at, id LIMIT 50").all(t) as Row[]).map(map);
}
