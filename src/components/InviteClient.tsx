"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RedeemInvite({ code, name }: { code: string; name: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function go() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/invites/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    setBusy(false);
    if (!res.ok) return setErr(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível ativar o convite.");
    setDone(true);
    setTimeout(() => { router.push("/painel"); router.refresh(); }, 1500);
  }

  if (done) return <p role="status" className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold-soft">Pronto! Seu acesso VIP ao Pró está ativo. Levando você ao painel…</p>;
  return (
    <div>
      <p className="mb-3 text-sm text-muted">Você está logado como <strong className="text-white">{name}</strong>.</p>
      <button className="btn btn-gold w-full" onClick={go} disabled={busy}>{busy ? "Ativando…" : "Ativar meu acesso VIP"}</button>
      {err && <p role="alert" className="mt-3 text-sm text-down">{err}</p>}
    </div>
  );
}

export interface InviteRow { id: number; code: string; email: string | null; note: string; days: number; status: string; expiresAt: string; createdAt: string; redeemedBy: string | null; emailed: boolean }

const DURATIONS = [{ d: 7, l: "7 dias" }, { d: 30, l: "30 dias" }, { d: 90, l: "90 dias" }, { d: 180, l: "6 meses" }, { d: 365, l: "1 ano" }, { d: 730, l: "2 anos" }];

/** Painel do administrador: cria convites VIP, copia o link, reenvia o e-mail e cancela. */
export function InvitesPanel({ invites, mailOn }: { invites: InviteRow[]; mailOn: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [days, setDays] = useState(30);
  const [validDays, setValidDays] = useState(14);
  const [msg, setMsg] = useState("");
  const [bad, setBad] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const link = (code: string) => `${window.location.origin}/convite/${code}`;
  const input = "mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:outline-none";

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(link(code)); setCopied(code); setTimeout(() => setCopied(null), 2000); } catch { window.prompt("Copie o link:", link(code)); }
  }

  async function create(send: boolean) {
    setBusy(true); setMsg(""); setFresh(null);
    const res = await fetch("/api/admin/invites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, note, days, validDays, send }) });
    setBusy(false);
    const data = (await res.json().catch(() => null)) as { code?: string; error?: string; emailed?: boolean; mailError?: string | null } | null;
    setBad(!res.ok);
    if (!res.ok || !data?.code) return setMsg(data?.error ?? "Não foi possível criar o convite.");
    setFresh(data.code);
    setMsg(send ? (data.emailed ? `Convite criado e enviado para ${email}.` : `Convite criado. ${data.mailError ?? ""}`) : "Convite criado. Copie o link abaixo e envie à pessoa.");
    setEmail(""); setNote("");
    router.refresh();
  }

  async function act(id: number, action: "revoke" | "resend") {
    if (action === "revoke" && !confirm("Cancelar este convite? O link deixa de funcionar.")) return;
    const res = await fetch("/api/admin/invites", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (!res.ok) alert(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Erro.");
    else if (action === "resend") alert("E-mail reenviado.");
    router.refresh();
  }

  const badge = (s: string) => ({ pendente: "bg-gold/20 text-gold-soft", usado: "bg-up/20 text-up", expirado: "bg-panel-2 text-muted", revogado: "bg-down/20 text-down" }[s] ?? "");

  return (
    <section className="card mb-6 p-4">
      <h2 className="mb-1 font-semibold">Convites VIP</h2>
      <p className="mb-4 text-sm text-muted">Gere um link de uso único que libera o plano Pró de graça pelo período escolhido. A pessoa abre o link, cria a conta (ou entra) e ativa. {mailOn ? "O envio por e-mail está ativo." : "O envio por e-mail não está configurado: copie o link e mande por WhatsApp ou onde preferir."}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-muted">E-mail do convidado (opcional)
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@email.com" className={input} />
          <span className="text-[11px]">Se informar, só esse e-mail consegue usar o convite.</span>
        </label>
        <label className="text-sm text-muted">Recado (opcional)
          <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Bem-vindo à turma fundadora!" className={input} />
        </label>
        <label className="text-sm text-muted">Duração do acesso Pró
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={input}>{DURATIONS.map((x) => <option key={x.d} value={x.d}>{x.l}</option>)}</select>
        </label>
        <label className="text-sm text-muted">Link vale por
          <select value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} className={input}>{[3, 7, 14, 30, 60].map((d) => <option key={d} value={d}>{d} dias</option>)}</select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className="btn btn-gold" onClick={() => create(false)} disabled={busy}>Gerar link do convite</button>
        <button className="btn btn-ghost" onClick={() => create(true)} disabled={busy || !email || !mailOn} title={!mailOn ? "E-mail não configurado" : !email ? "Informe o e-mail" : ""}>Gerar e enviar por e-mail</button>
      </div>
      {msg && <p className={`mt-3 text-sm ${bad ? "text-down" : "text-up"}`}>{msg}</p>}
      {fresh && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-panel-2 p-2 text-xs">
          <code className="min-w-0 flex-1 break-all text-gold-soft">{link(fresh)}</code>
          <button className="btn btn-gold !px-3 !py-1 text-xs" onClick={() => copy(fresh)}>{copied === fresh ? "Copiado!" : "Copiar link"}</button>
        </div>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="data">
          <thead><tr><th>Criado</th><th>Convidado</th><th>Duração</th><th>Status</th><th>Vale até</th><th></th></tr></thead>
          <tbody>
            {invites.length === 0 && <tr><td colSpan={6} className="text-muted">Nenhum convite criado ainda.</td></tr>}
            {invites.map((i) => (
              <tr key={i.id}>
                <td>{i.createdAt}</td>
                <td className="text-muted">{i.redeemedBy ?? i.email ?? "qualquer pessoa"}{i.note ? <span className="block text-[11px]">{i.note}</span> : null}</td>
                <td>{i.days >= 365 && i.days % 365 === 0 ? `${i.days / 365} ano(s)` : `${i.days} dias`}</td>
                <td><span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${badge(i.status)}`}>{i.status}</span>{i.emailed && i.status === "pendente" ? <span className="ml-1 text-[11px] text-muted">e-mail enviado</span> : null}</td>
                <td>{i.expiresAt}</td>
                <td className="whitespace-nowrap">
                  {i.status === "pendente" && (
                    <span className="flex gap-2">
                      <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => copy(i.code)}>{copied === i.code ? "Copiado!" : "Copiar link"}</button>
                      {i.email && mailOn && <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => act(i.id, "resend")}>Reenviar</button>}
                      <button className="btn btn-ghost !px-2 !py-1 text-xs !text-down" onClick={() => act(i.id, "revoke")}>Cancelar</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
