import { randomBytes } from "node:crypto";
import { db, now } from "./db";
import { addEvent, type MeetingEvent } from "./agenda";
import { hasBlack, hasDiamond } from "./orders";

/** Eventos presenciais (estilo Luma): confirmação de presença, aprovação do admin (VIP), capacidade e QR code de entrada. */
export const COST_MODES: { id: string; label: string }[] = [
  { id: "free", label: "Gratuito" },
  { id: "each", label: "Cada um paga o seu consumo (ex.: comanda)" },
  { id: "sponsored", label: "Financiado pela Niza Invest" },
  { id: "ticket", label: "Valor por pessoa (ingresso)" },
];
export const costLabel = (id: string) => COST_MODES.find((c) => c.id === id)?.label ?? "";

export type RsvpStatus = "confirmed" | "pending" | "waitlist" | "declined" | "cancelled";
export interface EventDetails { eventId: number; bannerId: number | null; location: string; costMode: string; costNote: string; capacity: number | null; approval: boolean; audience: "premium" | "diamond" | "black" }
export interface Rsvp { id: number; eventId: number; userId: number; status: RsvpStatus; code: string; checkedInAt: number | null; createdAt: number; name?: string; email?: string }
export interface EventInput { bannerId: number | null; location: string; costMode: string; costNote: string; capacity: number | null; approval: boolean; audience: string }

export function cleanDetails(i: EventInput): { error: string } | { data: EventInput } {
  const location = i.location.trim().slice(0, 200);
  if (location.length < 5) return { error: "Informe o endereço do evento." };
  const approval = !!i.approval;
  const costMode = COST_MODES.some((c) => c.id === i.costMode) ? i.costMode : "";
  if (!costMode && !approval) return { error: "Informe se o evento tem custo para os participantes (gratuito, cada um paga o seu, financiado ou ingresso)." };
  const costNote = i.costNote.trim().slice(0, 300);
  if ((costMode === "ticket") && !costNote) return { error: "Informe o valor do ingresso." };
  let capacity: number | null = null;
  if (i.capacity !== null && i.capacity !== undefined && String(i.capacity) !== "") {
    const n = Math.round(Number(i.capacity));
    if (!(n >= 1 && n <= 5000)) return { error: "A capacidade deve ficar entre 1 e 5000 pessoas." };
    capacity = n;
  }
  return { data: { bannerId: i.bannerId && Number.isInteger(i.bannerId) ? i.bannerId : null, location, costMode: costMode || "none", costNote, capacity, approval, audience: i.audience === "black" ? "black" : i.audience === "diamond" ? "diamond" : "premium" } };
}

export function createPresencial(userId: number, base: { title: string; startsAt: number; durationMin: number; notes: string }, d: EventInput): MeetingEvent | { error: string } {
  const v = cleanDetails(d);
  if ("error" in v) return v;
  const ev = addEvent(userId, { ...base, link: "", kind: "evento" });
  if (!ev) return { error: "Confira o título e a data." };
  const x = v.data;
  db().prepare("INSERT INTO event_details (event_id, banner_id, location, cost_mode, cost_note, capacity, approval, audience) VALUES (?,?,?,?,?,?,?,?)").run(ev.id, x.bannerId, x.location, x.costMode, x.costNote, x.capacity, x.approval ? 1 : 0, x.audience);
  return ev;
}

type DRow = { event_id: number; banner_id: number | null; location: string; cost_mode: string; cost_note: string; capacity: number | null; approval: number; audience: string };
const mapD = (r: DRow): EventDetails => ({ eventId: r.event_id, bannerId: r.banner_id, location: r.location, costMode: r.cost_mode, costNote: r.cost_note, capacity: r.capacity, approval: r.approval === 1, audience: r.audience === "black" ? "black" : r.audience === "diamond" ? "diamond" : "premium" });
export function getDetails(eventId: number): EventDetails | null {
  const r = db().prepare("SELECT * FROM event_details WHERE event_id = ?").get(eventId) as DRow | undefined;
  return r ? mapD(r) : null;
}
export function detailsMap(ids: number[]): Map<number, EventDetails> {
  const m = new Map<number, EventDetails>();
  if (!ids.length) return m;
  for (const r of db().prepare(`SELECT * FROM event_details WHERE event_id IN (${ids.map(() => "?").join(",")})`).all(...ids) as DRow[]) m.set(r.event_id, mapD(r));
  return m;
}

export function getEvent(id: number): MeetingEvent | null {
  const r = db().prepare("SELECT id, title, starts_at, ends_at, link, notes, kind FROM meeting_events WHERE id = ?").get(id) as { id: number; title: string; starts_at: number; ends_at: number; link: string; notes: string; kind: string } | undefined;
  return r ? { id: r.id, title: r.title, startsAt: r.starts_at, endsAt: r.ends_at, link: r.link, notes: r.notes, kind: r.kind === "evento" ? "evento" : "reuniao" } : null;
}

type RRow = { id: number; event_id: number; user_id: number; status: string; code: string; checked_in_at: number | null; created_at: number; name?: string; email?: string };
const mapR = (r: RRow): Rsvp => ({ id: r.id, eventId: r.event_id, userId: r.user_id, status: r.status as RsvpStatus, code: r.code, checkedInAt: r.checked_in_at, createdAt: r.created_at, name: r.name, email: r.email });

export function getRsvp(eventId: number, userId: number): Rsvp | null {
  const r = db().prepare("SELECT * FROM event_rsvps WHERE event_id = ? AND user_id = ?").get(eventId, userId) as RRow | undefined;
  return r ? mapR(r) : null;
}
export function getRsvpByCode(code: string): (Rsvp & { name: string; email: string }) | null {
  const r = db().prepare("SELECT r.*, u.name, u.email FROM event_rsvps r JOIN users u ON u.id = r.user_id WHERE r.code = ?").get(code) as RRow | undefined;
  return r ? (mapR(r) as Rsvp & { name: string; email: string }) : null;
}
export function listRsvps(eventId: number): Rsvp[] {
  return (db().prepare("SELECT r.*, u.name, u.email FROM event_rsvps r JOIN users u ON u.id = r.user_id WHERE r.event_id = ? ORDER BY r.id").all(eventId) as RRow[]).map(mapR);
}
export function counts(eventId: number): { confirmed: number; pending: number; waitlist: number; checkedIn: number } {
  const r = db().prepare("SELECT SUM(status='confirmed') c, SUM(status='pending') p, SUM(status='waitlist') w, SUM(status='confirmed' AND checked_in_at IS NOT NULL) k FROM event_rsvps WHERE event_id = ?").get(eventId) as { c: number | null; p: number | null; w: number | null; k: number | null };
  return { confirmed: r.c ?? 0, pending: r.p ?? 0, waitlist: r.w ?? 0, checkedIn: r.k ?? 0 };
}

/** Pedido de presença. Evento aberto confirma na hora (ou vai para a lista de espera se lotar); evento com aprovação fica pendente. */
export function register(eventId: number, user: { id: number; role: string; plan: string }): { status: RsvpStatus } | { error: string } {
  const ev = getEvent(eventId), d = getDetails(eventId);
  if (!ev || !d || ev.kind !== "evento") return { error: "Evento não encontrado." };
  if (ev.endsAt < now()) return { error: "Este evento já aconteceu." };
  const isAdmin = user.role === "admin";
  if (!isAdmin && !(user.plan === "pro")) return { error: "Exclusivo para membros Premium." };
  if (d.audience === "black" && !isAdmin && !hasBlack(user.id)) return { error: "Este evento é exclusivo para membros Diamond Black VIP." };
  if (d.audience === "diamond" && !isAdmin && !hasDiamond(user.id)) return { error: "Este evento é exclusivo para membros Diamond." };
  const cur = getRsvp(eventId, user.id);
  if (cur && (cur.status === "confirmed" || cur.status === "pending" || cur.status === "waitlist")) return { status: cur.status };
  if (cur?.status === "declined") return { error: "Sua participação não foi aprovada para este evento." };
  let status: RsvpStatus;
  if (d.approval) status = "pending";
  else status = d.capacity !== null && counts(eventId).confirmed >= d.capacity ? "waitlist" : "confirmed";
  if (cur) db().prepare("UPDATE event_rsvps SET status = ?, created_at = unixepoch() WHERE id = ?").run(status, cur.id);
  else db().prepare("INSERT INTO event_rsvps (event_id, user_id, status, code) VALUES (?,?,?,?)").run(eventId, user.id, status, randomBytes(9).toString("hex"));
  return { status };
}

/** O membro cancela a presença; se havia lista de espera, a primeira pessoa é confirmada. */
export function cancel(eventId: number, userId: number): boolean {
  const cur = getRsvp(eventId, userId);
  if (!cur || cur.status === "cancelled" || cur.status === "declined") return false;
  db().prepare("UPDATE event_rsvps SET status = 'cancelled', checked_in_at = NULL WHERE id = ?").run(cur.id);
  promoteWaitlist(eventId);
  return true;
}

function promoteWaitlist(eventId: number): void {
  const d = getDetails(eventId);
  if (!d || d.approval || d.capacity === null) return;
  while (counts(eventId).confirmed < d.capacity) {
    const next = db().prepare("SELECT id FROM event_rsvps WHERE event_id = ? AND status = 'waitlist' ORDER BY created_at, id LIMIT 1").get(eventId) as { id: number } | undefined;
    if (!next) break;
    db().prepare("UPDATE event_rsvps SET status = 'confirmed' WHERE id = ?").run(next.id);
  }
}

/** Admin aprova ou recusa (eventos VIP). */
export function decide(rsvpId: number, status: "confirmed" | "declined"): boolean {
  return db().prepare("UPDATE event_rsvps SET status = ?, checked_in_at = CASE WHEN ? = 'declined' THEN NULL ELSE checked_in_at END WHERE id = ? AND status IN ('pending','waitlist','confirmed','declined')").run(status, status, rsvpId).changes > 0;
}

/** Check-in na porta: só vale para presença confirmada e só uma vez. */
export function checkIn(code: string): { ok: true; rsvp: Rsvp & { name: string } } | { ok: false; reason: string; rsvp?: Rsvp & { name: string } } {
  const r = getRsvpByCode(code);
  if (!r) return { ok: false, reason: "QR code inválido." };
  if (r.status !== "confirmed") return { ok: false, reason: "Esta presença não está confirmada.", rsvp: r };
  if (r.checkedInAt) return { ok: false, reason: "Este ingresso já foi usado.", rsvp: r };
  db().prepare("UPDATE event_rsvps SET checked_in_at = ? WHERE id = ?").run(now(), r.id);
  return { ok: true, rsvp: { ...r, checkedInAt: now() } };
}
