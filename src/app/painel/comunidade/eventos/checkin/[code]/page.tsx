import { requireUser } from "@/lib/auth";
import { CheckInButton } from "@/components/EventActions";
import { getEvent, getRsvpByCode } from "@/lib/events";

export const dynamic = "force-dynamic";
const when = (t: number) => new Date(t * 1000).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Aberta ao escanear o QR code do convite. Só o administrador consegue confirmar a entrada. */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser();
  const r = getRsvpByCode((await params).code);
  const ev = r ? getEvent(r.eventId) : null;
  if (!r || !ev) return <p className="card p-5 text-sm text-down">QR code inválido ou evento não encontrado.</p>;
  if (user.role !== "admin") return <p className="card p-5 text-sm text-muted">Este é o convite de um membro. Apenas a organização faz a conferência na porta.</p>;
  const ok = r.status === "confirmed" && !r.checkedInAt;
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className={`card p-5 ${ok ? "border-up/50" : "border-down/50"}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/80">Conferência de entrada</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-white">{ev.title}</h1>
        <p className="mt-3 text-lg font-semibold text-gold-soft">{r.name}</p>
        <p className="text-sm text-muted">{r.email}</p>
        {r.status !== "confirmed" && <p className="mt-3 rounded-lg bg-down/10 p-3 text-sm font-semibold text-down">Presença NÃO confirmada ({r.status === "pending" ? "aguardando aprovação" : r.status === "waitlist" ? "lista de espera" : r.status === "declined" ? "recusada" : "cancelada"}). Não liberar.</p>}
        {r.status === "confirmed" && r.checkedInAt && <p className="mt-3 rounded-lg bg-down/10 p-3 text-sm font-semibold text-down">Ingresso já usado em {when(r.checkedInAt)}.</p>}
        {ok && <div className="mt-4"><CheckInButton code={r.code} name={r.name} /></div>}
      </div>
    </div>
  );
}
