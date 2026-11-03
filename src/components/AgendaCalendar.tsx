"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Ev { id: number; title: string; startsAt: number; endsAt: number; link: string; notes: string; kind: "reuniao" | "evento"; detail?: { bannerId: number | null; location: string; costLabel: string; costNote: string; capacity: number | null; approval: boolean; audience: string } }

// Horário de Brasília (UTC-3, sem horário de verão): trabalhamos com "relógio de Brasília" deslocando 3h.
const OFF = 3 * 3600;
const key = (ts: number) => new Date((ts - OFF) * 1000).toISOString().slice(0, 10);
const hm = (ts: number) => new Date((ts - OFF) * 1000).toISOString().slice(11, 16);
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function plataforma(link: string) {
  let h = "";
  try { h = new URL(link).hostname.toLowerCase(); } catch { /* */ }
  if (h.includes("meet.google")) return "Google Meet";
  if (h.includes("zoom.")) return "Zoom";
  if (h.includes("teams.")) return "Microsoft Teams";
  if (h.includes("youtube") || h === "youtu.be") return "YouTube";
  return link ? "Link da reunião" : "";
}

function ics(e: Ev) {
  const f = (t: number) => new Date(t * 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//White Flame Society//Agenda//PT", "BEGIN:VEVENT", `UID:wfs-${e.id}@nizainvest.com.br`, `DTSTAMP:${f(Math.floor(Date.now() / 1000))}`, `DTSTART:${f(e.startsAt)}`, `DTEND:${f(e.endsAt)}`, `SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc([e.notes, e.link].filter(Boolean).join("\n"))}`, ...(e.link ? [`URL:${e.link}`] : []), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" }));
  a.download = "evento.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function AgendaCalendar({ events, isAdmin }: { events: Ev[]; isAdmin: boolean }) {
  const router = useRouter();
  const today = key(Math.floor(Date.now() / 1000));
  const [ym, setYm] = useState(today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const [form, setForm] = useState({ title: "", date: today, time: "20:00", dur: "60", link: "", notes: "", kind: "reuniao" });
  const [pres, setPres] = useState({ location: "", costMode: "free", costNote: "", capacity: "", approval: false, audience: "premium", bannerId: null as number | null, bannerName: "" });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const byDay = useMemo(() => {
    const m = new Map<string, Ev[]>();
    for (const e of events) { const k = key(e.startsAt); m.set(k, [...(m.get(k) ?? []), e]); }
    return m;
  }, [events]);

  const [y, mo] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const lead = first.getUTCDay();
  const total = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);
  const move = (d: number) => { const n = new Date(Date.UTC(y, mo - 1 + d, 1)); setYm(n.toISOString().slice(0, 7)); };
  const nowTs = Math.floor(Date.now() / 1000);

  const upcoming = events.filter((e) => e.endsAt >= nowTs).slice(0, 4);
  const dayEvents = byDay.get(sel) ?? [];

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    const startsAt = Math.floor(new Date(`${form.date}T${form.time}:00-03:00`).getTime() / 1000);
    if (!form.title.trim() || Number.isNaN(startsAt)) return setErr("Preencha o título, a data e a hora.");
    setBusy(true);
    const r = await fetch("/api/community/agenda", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, startsAt, durationMin: Number(form.dur) || 60, link: form.kind === "evento" ? "" : form.link, notes: form.notes, kind: form.kind, details: form.kind === "evento" ? { bannerId: pres.bannerId, location: pres.location, costMode: pres.costMode, costNote: pres.costNote, capacity: pres.capacity.trim() ? Number(pres.capacity) : null, approval: pres.approval, audience: pres.audience } : undefined }) });
    setBusy(false);
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Erro ao salvar.");
    setForm({ ...form, title: "", link: "", notes: "" });
    setPres({ location: "", costMode: "free", costNote: "", capacity: "", approval: false, audience: "premium", bannerId: null, bannerName: "" });
    setSel(form.date); setYm(form.date.slice(0, 7)); setOpen(false);
    router.refresh();
  }
  async function uploadBanner(file: File | undefined) {
    if (!file) return;
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/community/image", { method: "POST", body: fd });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(d.error ?? "Não foi possível enviar o banner.");
    setPres((p) => ({ ...p, bannerId: d.id, bannerName: file.name }));
  }
  async function remove(id: number) {
    if (!confirm("Apagar este evento da agenda?")) return;
    await fetch(`/api/community/agenda?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const inp = "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-white outline-none focus:border-gold/60";

  return (
    <div className="mb-4 rounded-xl border border-gold/25 bg-panel-2/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-bold text-gold-soft">{MESES[mo - 1]} {y}</h3>
        <div className="ml-auto flex items-center gap-1 text-sm">
          <button type="button" onClick={() => move(-1)} aria-label="Mês anterior" className="rounded-lg border border-line px-3 py-1 hover:border-gold/50">‹</button>
          <button type="button" onClick={() => { setYm(today.slice(0, 7)); setSel(today); }} className="rounded-lg border border-line px-3 py-1 hover:border-gold/50">Hoje</button>
          <button type="button" onClick={() => move(1)} aria-label="Próximo mês" className="rounded-lg border border-line px-3 py-1 hover:border-gold/50">›</button>
          {isAdmin && <button type="button" onClick={() => { setForm((f) => ({ ...f, date: sel })); setOpen((o) => !o); }} className="ml-2 rounded-lg bg-gradient-to-b from-gold-soft to-gold px-3 py-1 font-semibold text-black">+ Novo evento</button>}
        </div>
      </div>

      {isAdmin && open && (
        <form onSubmit={save} className="mb-4 grid gap-2 rounded-lg border border-gold/30 bg-ink/60 p-3 sm:grid-cols-6">
          <label className="text-xs text-muted sm:col-span-6">Tipo
            <select className={inp} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "reuniao" | "evento" })}>
              <option value="reuniao">Reunião online (aparece automaticamente na Sala de Reuniões)</option>
              <option value="evento">Evento presencial (inscrição com confirmação e QR code, não vai para a Sala de Reuniões)</option>
            </select>
          </label>
          <input className={`${inp} sm:col-span-6`} placeholder="Título (ex.: Live de análise semanal)" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label className="text-xs text-muted sm:col-span-2">Data<input type="date" className={inp} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label className="text-xs text-muted sm:col-span-2">Hora (Brasília)<input type="time" className={inp} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
          <label className="text-xs text-muted sm:col-span-2">Duração
            <select className={inp} value={form.dur} onChange={(e) => setForm({ ...form, dur: e.target.value })}>
              {[30, 45, 60, 90, 120, 180].map((d) => <option key={d} value={d}>{d} min</option>)}
            </select>
          </label>
          {form.kind === "reuniao" && <input className={`${inp} sm:col-span-6`} placeholder="Link da reunião (Meet, Zoom, Teams…)" maxLength={500} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />}
          {form.kind === "evento" && (
            <fieldset className="space-y-2 rounded-lg border border-gold/30 p-3 sm:col-span-6">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gold/80">Evento presencial</legend>
              <input className={inp} placeholder="Endereço completo (ex.: Bar do Zé, Rua X, 123, São Paulo)" maxLength={200} value={pres.location} onChange={(e) => setPres({ ...pres, location: e.target.value })} />
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-muted">Custo para os participantes{pres.approval ? " (opcional neste evento VIP)" : ""}
                  <select className={inp} value={pres.costMode} onChange={(e) => setPres({ ...pres, costMode: e.target.value })}>
                    {pres.approval && <option value="none">Não informar</option>}
                    <option value="free">Gratuito</option>
                    <option value="each">Cada um paga o seu consumo (ex.: comanda)</option>
                    <option value="sponsored">Financiado pela Niza Invest</option>
                    <option value="ticket">Valor por pessoa (ingresso)</option>
                  </select>
                </label>
                <label className="text-xs text-muted">Detalhe do custo (ex.: “R$ 50 por pessoa” ou “cada um paga a sua comanda”)
                  <input className={inp} maxLength={300} value={pres.costNote} onChange={(e) => setPres({ ...pres, costNote: e.target.value })} />
                </label>
                <label className="text-xs text-muted">Limite de pessoas (opcional)
                  <input className={inp} inputMode="numeric" placeholder="ex.: 40" value={pres.capacity} onChange={(e) => setPres({ ...pres, capacity: e.target.value.replace(/\D/g, "") })} />
                </label>
                <label className="text-xs text-muted">Quem pode se inscrever
                  <select className={inp} value={pres.audience} onChange={(e) => setPres({ ...pres, audience: e.target.value })}>
                    <option value="premium">Todos os membros Premium</option>
                    <option value="diamond">Somente membros Diamond</option>
                    <option value="black">Evento Black Diamond VIP</option>
                  </select>
                </label>
              </div>
              <label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" className="mt-1" checked={pres.approval} onChange={(e) => setPres({ ...pres, approval: e.target.checked, costMode: e.target.checked && pres.costMode === "free" ? "none" : pres.costMode })} /> Evento VIP: a presença só vale mediante a sua aprovação (sem isso, quem se inscreve é confirmado na hora, até o limite)</label>
              <label className="block text-xs text-muted">Banner do evento (imagem até 2 MB)
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inp} onChange={(e) => uploadBanner(e.target.files?.[0])} />
              </label>
              {pres.bannerId && <p className="text-xs text-up">Banner enviado: {pres.bannerName}</p>}
            </fieldset>
          )}
          <textarea className={`${inp} sm:col-span-6`} rows={2} placeholder="Observações (opcional)" maxLength={600} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex items-center gap-3 sm:col-span-6">
            <button disabled={busy} className="rounded-lg bg-gradient-to-b from-gold-soft to-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">{busy ? "Salvando…" : "Salvar na agenda"}</button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted underline">cancelar</button>
            {err && <span role="alert" className="text-sm text-down">{err}</span>}
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted">{DIAS.map((d) => <span key={d}>{d}</span>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c) return <span key={i} />;
              const n = byDay.get(c)?.length ?? 0;
              const isSel = c === sel, isToday = c === today;
              return (
                <button key={c} type="button" onClick={() => setSel(c)} aria-label={`${Number(c.slice(8))} de ${MESES[mo - 1]}${n ? `, ${n} evento(s)` : ""}`} aria-pressed={isSel}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition ${isSel ? "border-gold bg-gold/15 text-gold-soft" : isToday ? "border-gold/50 text-white" : "border-line/60 text-muted hover:border-gold/40 hover:text-white"}`}>
                  {Number(c.slice(8))}
                  {n > 0 && <span className="absolute bottom-1 flex gap-0.5">{Array.from({ length: Math.min(n, 3) }).map((_, k) => <i key={k} className="h-1.5 w-1.5 rounded-full bg-up" />)}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/70">{Number(sel.slice(8))} de {MESES[Number(sel.slice(5, 7)) - 1]}</p>
            {dayEvents.length === 0 ? <p className="text-sm text-muted">Nenhum evento neste dia.</p> : (
              <ul className="space-y-2">{dayEvents.map((e) => <EventCard key={e.id} e={e} isAdmin={isAdmin} onDelete={remove} />)}</ul>
            )}
          </div>
          {upcoming.length > 0 && (
            <div className="border-t border-line pt-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/70">Próximos</p>
              <ul className="space-y-1 text-sm">
                {upcoming.map((e) => (
                  <li key={e.id}><button type="button" onClick={() => { setSel(key(e.startsAt)); setYm(key(e.startsAt).slice(0, 7)); }} className="text-left text-muted hover:text-white"><span className="text-gold-soft">{key(e.startsAt).split("-").reverse().slice(0, 2).join("/")} {hm(e.startsAt)}</span> · {e.title}</button></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({ e, isAdmin, onDelete }: { e: Ev; isAdmin: boolean; onDelete: (id: number) => void }) {
  return (
    <li className="rounded-lg border border-gold/25 bg-ink/60 p-3 text-sm">
      {e.kind === "evento" && e.detail?.bannerId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/community/image?id=${e.detail.bannerId}`} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
      )}
      <p className="font-semibold text-white">{e.title} <span className={`ml-1 rounded px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase ${e.kind === "evento" ? "bg-gold/20 text-gold-soft" : "bg-up/15 text-up"}`}>{e.kind === "evento" ? "Evento" : "Reunião"}</span></p>
      <p className="text-xs text-gold-soft">{hm(e.startsAt)} – {hm(e.endsAt)} (Brasília)</p>
      {e.kind === "evento" && e.detail && (
        <p className="mt-1 text-xs text-muted">📍 {e.detail.location}{e.detail.costLabel ? ` · ${e.detail.costLabel}` : ""}{e.detail.approval ? " · mediante aprovação" : ""}{e.detail.audience === "diamond" ? " · só Diamond" : ""}{e.detail.audience === "black" ? " · Black Diamond VIP" : ""}</p>
      )}
      {e.notes && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted">{e.notes}</p>}
      <p className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        {e.kind === "evento" && <a href={`/painel/comunidade/eventos/${e.id}`} className="rounded-md bg-gold/20 px-3 py-1 font-semibold text-gold-soft hover:bg-gold/30">Ver evento e confirmar presença →</a>}
        {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="rounded-md bg-up/20 px-3 py-1 font-semibold text-up hover:bg-up/30">Entrar · {plataforma(e.link)}</a>}
        <button type="button" onClick={() => ics(e)} className="text-muted underline hover:text-white">Adicionar ao meu calendário</button>
        {isAdmin && <button type="button" onClick={() => onDelete(e.id)} className="text-down underline">apagar</button>}
      </p>
    </li>
  );
}
