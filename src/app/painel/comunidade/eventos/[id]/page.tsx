import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { Locked } from "@/components/ui";
import { DecideButtons, RegisterButton } from "@/components/EventActions";
import { costLabel, counts, getDetails, getEvent, getRsvp, listRsvps } from "@/lib/events";
import { hasBlack, hasDiamond } from "@/lib/orders";
import { now } from "@/lib/db";

export const dynamic = "force-dynamic";

const day = (t: number) => new Date(t * 1000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long", year: "numeric" });
const hm = (t: number) => new Date(t * 1000).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const STATUS: Record<string, string> = { confirmed: "Confirmados", pending: "Aguardando aprovação", waitlist: "Lista de espera", declined: "Recusados", cancelled: "Cancelados" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  if (user.plan !== "pro" && !isAdmin) return <Locked feature="Eventos (exclusivo do plano Premium)" />;
  const id = Number((await params).id);
  const ev = getEvent(id), d = getDetails(id);
  if (!ev || !d || ev.kind !== "evento") notFound();
  const mine = getRsvp(id, user.id);
  const c = counts(id);
  const past = ev.endsAt < now();
  const blockedAudience = !isAdmin && ((d.audience === "diamond" && !hasDiamond(user.id)) || (d.audience === "black" && !hasBlack(user.id)));
  const showAddress = isAdmin || mine?.status === "confirmed";
  const spotsLeft = d.capacity === null ? null : Math.max(0, d.capacity - c.confirmed);

  let qr = "";
  if (mine?.status === "confirmed") {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "nizainvest.com.br";
    const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    qr = await QRCode.toString(`${proto}://${host}/painel/comunidade/eventos/checkin/${mine.code}`, { type: "svg", margin: 1, width: 220, color: { dark: "#0b1020", light: "#ffffff" } });
  }
  const rsvps = isAdmin ? listRsvps(id) : [];

  return (
    <>
      <p className="mb-3 text-sm"><Link href="/painel/comunidade?c=planejamento-de-reunioes" className="text-muted underline hover:text-white">← Voltar para Reuniões e Eventos</Link></p>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {d.bannerId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/community/image?id=${d.bannerId}`} alt={`Banner: ${ev.title}`} className="aspect-[16/9] w-full rounded-2xl border border-gold/30 object-cover" />
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl border border-gold/30 bg-gradient-to-br from-panel-2 to-ink font-display text-2xl font-bold text-gold-soft">White Flame Society</div>
          )}
          <section className="card space-y-3 border-gold/20 p-5">
            <h2 className="font-display text-lg font-bold text-gold-soft">Sobre o evento</h2>
            {ev.notes ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{ev.notes}</p> : <p className="text-sm text-muted">Encontro presencial da White Flame Society.</p>}
          </section>
          {isAdmin && (
            <section className="card space-y-3 border-gold/20 p-5">
              <h2 className="font-display text-lg font-bold text-gold-soft">Inscrições (só você vê)</h2>
              <p className="text-sm text-muted">Confirmados: <strong className="text-white">{c.confirmed}</strong>{d.capacity ? ` de ${d.capacity}` : ""} · Aguardando: <strong className="text-white">{c.pending}</strong> · Lista de espera: <strong className="text-white">{c.waitlist}</strong> · Já entraram: <strong className="text-white">{c.checkedIn}</strong></p>
              {rsvps.length === 0 ? <p className="text-sm text-muted">Ninguém se inscreveu ainda.</p> : (
                <div className="overflow-x-auto">
                  <table className="data">
                    <thead><tr><th>Membro</th><th>E-mail</th><th>Situação</th><th>Entrada</th><th></th></tr></thead>
                    <tbody>{rsvps.map((r) => (
                      <tr key={r.id}><td>{r.name}</td><td>{r.email}</td><td>{STATUS[r.status] ?? r.status}</td><td>{r.checkedInAt ? "✓ presente" : "-"}</td>
                        <td>{(r.status === "pending" || r.status === "waitlist" || r.status === "confirmed" || r.status === "declined") && <DecideButtons rsvpId={r.id} status={r.status} />}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-muted">Na porta, escaneie o QR code do convite com a câmera do celular: abre a página de entrada, onde você confirma.</p>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="card space-y-3 border-gold/30 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/80">Evento presencial · White Flame Society</p>
            <h1 className="font-display text-2xl font-bold text-white">{ev.title}</h1>
            <p className="text-sm text-gold-soft first-letter:uppercase">{day(ev.startsAt)}</p>
            <p className="text-sm text-muted">{hm(ev.startsAt)} às {hm(ev.endsAt)} (Brasília)</p>
            <div className="rounded-lg border border-line p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted">Local</p>
              {showAddress ? <p className="mt-0.5 font-semibold text-white">{d.location}</p> : <p className="mt-0.5 text-muted">O endereço completo é liberado depois da sua confirmação de presença.</p>}
            </div>
            <div className="rounded-lg border border-line p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted">Custo</p>
              {d.costMode === "none" ? <p className="mt-0.5 text-muted">Informações de custo serão passadas aos aprovados.</p> : <p className="mt-0.5 font-semibold text-white">{costLabel(d.costMode)}</p>}
              {d.costNote && <p className="text-muted">{d.costNote}</p>}
            </div>
            <p className="flex flex-wrap gap-2 text-xs">
              {d.audience === "black" && <span className="rounded bg-black px-2 py-0.5 font-bold text-gold-soft ring-1 ring-gold/50">DIAMOND BLACK VIP</span>}
              {d.audience === "diamond" && <span className="rounded bg-sky-400/15 px-2 py-0.5 font-bold text-sky-200">EXCLUSIVO DIAMOND</span>}
              {d.approval && <span className="rounded bg-gold/20 px-2 py-0.5 font-bold text-gold-soft">VIP · MEDIANTE APROVAÇÃO</span>}
              {spotsLeft !== null && <span className={`rounded px-2 py-0.5 font-bold ${spotsLeft === 0 ? "bg-down/15 text-down" : "bg-up/15 text-up"}`}>{d.approval ? `${d.capacity} vagas` : spotsLeft === 0 ? "Lotado (lista de espera)" : `${spotsLeft} vaga(s) restante(s)`}</span>}
            </p>
          </section>

          <section className="card space-y-3 border-gold/30 p-5">
            <h2 className="font-display text-lg font-bold text-gold-soft">Sua presença</h2>
            {past ? <p className="text-sm text-muted">Este evento já aconteceu.</p> : blockedAudience ? (
              d.audience === "black" ? <p className="text-sm text-muted">Este evento é exclusivo para membros do <Link href="/painel/black" className="text-gold-soft underline">Diamond Black VIP</Link>.</p> : <p className="text-sm text-muted">Este evento é exclusivo para membros do <Link href="/planos#diamond" className="text-gold-soft underline">Plano Diamond</Link>.</p>
            ) : (
              <>
                {mine?.status === "confirmed" && (
                  <div className="space-y-2 text-center">
                    <p className="text-sm font-semibold text-up">Presença confirmada ✓</p>
                    <div className="mx-auto w-[220px] overflow-hidden rounded-xl bg-white p-1" dangerouslySetInnerHTML={{ __html: qr }} />
                    <p className="text-xs text-muted">Apresente este QR code na entrada. Ele é pessoal e vale uma única vez.{mine.checkedInAt ? " Entrada já registrada." : ""}</p>
                  </div>
                )}
                {mine?.status === "pending" && <p className="text-sm text-gold-soft">Solicitação enviada. Você será avisado aqui assim que o organizador responder.</p>}
                {mine?.status === "waitlist" && <p className="text-sm text-gold-soft">Evento lotado: você está na lista de espera e será confirmado se abrir vaga.</p>}
                {mine?.status === "declined" && <p className="text-sm text-down">Sua participação não foi aprovada para este evento.</p>}
                {mine?.status === "cancelled" && <p className="text-sm text-muted">Você cancelou a sua presença. Pode se inscrever de novo se ainda houver vaga.</p>}
                <RegisterButton eventId={id} approval={d.approval} status={mine?.status ?? null} />
              </>
            )}
            {d.approval && <p className="text-xs text-muted">Este evento tem vagas limitadas e a presença só é confirmada mediante aprovação do organizador.</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
