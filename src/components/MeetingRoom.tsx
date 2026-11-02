import Link from "next/link";
import { plataforma, type MeetingEvent } from "@/lib/agenda";

const fmtDay = (t: number) => new Date(t * 1000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long" });
const fmtHm = (t: number) => new Date(t * 1000).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

function countdown(sec: number): string {
  if (sec < 3600) return `em ${Math.max(1, Math.round(sec / 60))} min`;
  if (sec < 86400) return `em ${Math.round(sec / 3600)} h`;
  return `em ${Math.round(sec / 86400)} dia(s)`;
}

/** Sala de Reuniões: as reuniões online da Agenda, com cabeçalho (dia, hora, plataforma) e o botão para entrar. */
export function MeetingRoom({ meetings, nowTs }: { meetings: MeetingEvent[]; nowTs: number }) {
  const live = meetings.filter((m) => nowTs >= m.startsAt - 10 * 60 && nowTs <= m.endsAt);
  const next = meetings.filter((m) => !live.includes(m));
  return (
    <div className="space-y-5">
      {meetings.length === 0 ? (
        <div className="rounded-xl border border-line p-6 text-center text-sm text-muted">
          <p className="font-semibold text-white">Nenhuma reunião marcada no momento</p>
          <p className="mt-1">Assim que o Niza cadastrar uma reunião na Agenda, ela aparece aqui sozinha, com o dia, a hora e o botão para entrar.</p>
          <Link href="/painel/comunidade?c=planejamento-de-reunioes" className="mt-3 inline-block text-gold-soft underline">Ver a Agenda (Reuniões e Eventos)</Link>
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <section aria-label="Reuniões ao vivo">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-up">Acontecendo agora</p>
              <ul className="space-y-3">{live.map((m) => <Card key={m.id} m={m} live nowTs={nowTs} />)}</ul>
            </section>
          )}
          {next.length > 0 && (
            <section aria-label="Próximas reuniões">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/80">Próximas reuniões</p>
              <ul className="space-y-3">{next.map((m) => <Card key={m.id} m={m} nowTs={nowTs} />)}</ul>
            </section>
          )}
        </>
      )}
      <p className="rounded-lg bg-panel-2 p-3 text-xs text-muted">Aqui entram as reuniões online da comunidade (Google Meet, Teams ou Zoom). Eventos especiais têm uma divulgação própria na Agenda.</p>
    </div>
  );
}

function Card({ m, live, nowTs }: { m: MeetingEvent; live?: boolean; nowTs: number }) {
  const mins = Math.round((m.endsAt - m.startsAt) / 60);
  return (
    <li className={`rounded-xl border p-4 ${live ? "border-up/60 bg-up/5" : "border-gold/25 bg-ink/50"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-display text-lg font-bold text-white">
            {m.title}
            {live && <span className="rounded-md bg-up/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-up">Ao vivo</span>}
          </p>
          <p className="mt-1 text-sm text-gold-soft first-letter:uppercase">{fmtDay(m.startsAt)}</p>
          <p className="text-sm text-muted">{fmtHm(m.startsAt)} às {fmtHm(m.endsAt)} (Brasília) · {mins} min{m.link ? ` · ${plataforma(m.link)}` : ""}{!live && ` · começa ${countdown(m.startsAt - nowTs)}`}</p>
          {m.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">{m.notes}</p>}
        </div>
        {m.link ? (
          <a href={m.link} target="_blank" rel="noopener noreferrer" className={`shrink-0 rounded-lg px-5 py-2.5 text-sm font-bold ${live ? "bg-up text-black" : "bg-gradient-to-b from-gold-soft to-gold text-black"}`}>Entrar na reunião ↗</a>
        ) : <span className="shrink-0 rounded-lg border border-line px-4 py-2 text-xs text-muted">Link em breve</span>}
      </div>
    </li>
  );
}
