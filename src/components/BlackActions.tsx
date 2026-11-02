"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const post = (b: unknown) => fetch("/api/community/black", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });

export function RequestInvite() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button type="button" disabled={busy} onClick={async () => { setBusy(true); await post({ action: "request" }); router.refresh(); }} className="rounded-lg bg-gradient-to-b from-gold-soft to-gold px-5 py-3 text-sm font-bold text-black disabled:opacity-60">{busy ? "Enviando…" : "Solicitar convite"}</button>;
}

export function InviteRow({ userId, status }: { userId: number; status: string }) {
  const router = useRouter();
  const go = async (s: "invited" | "declined") => { await post({ action: "set", userId, status: s }); router.refresh(); };
  return (
    <span className="inline-flex gap-2">
      {status !== "invited" && <button type="button" onClick={() => go("invited")} className="rounded bg-up/20 px-2 py-0.5 text-xs font-semibold text-up">Convidar</button>}
      {status !== "declined" && <button type="button" onClick={() => go("declined")} className="rounded bg-down/15 px-2 py-0.5 text-xs font-semibold text-down">Recusar</button>}
    </span>
  );
}

export function InviteByEmail() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await post({ action: "invite-email", email });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? { ok: true, t: "Convite liberado." } : { ok: false, t: d.error ?? "Não foi possível." });
    if (r.ok) { setEmail(""); router.refresh(); }
  }
  return (
    <form onSubmit={go} className="flex flex-wrap items-center gap-2">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail de um membro cadastrado" aria-label="E-mail do convidado" className="input min-w-[16rem] flex-1" />
      <button className="btn btn-gold" type="submit">Convidar</button>
      {msg && <span role="status" className={`text-sm ${msg.ok ? "text-up" : "text-down"}`}>{msg.t}</span>}
    </form>
  );
}
