"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const post = (body: unknown) => fetch("/api/community/eventos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export function RegisterButton({ eventId, approval, status }: { eventId: number; approval: boolean; status: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function run(action: "register" | "cancel") {
    if (action === "cancel" && !confirm("Cancelar a sua presença neste evento?")) return;
    setBusy(true); setErr("");
    const r = await post({ action, eventId });
    setBusy(false);
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Não foi possível concluir.");
    router.refresh();
  }
  const active = status === "confirmed" || status === "pending" || status === "waitlist";
  return (
    <div className="space-y-2">
      {!active && status !== "declined" && (
        <button disabled={busy} onClick={() => run("register")} className="w-full rounded-lg bg-gradient-to-b from-gold-soft to-gold px-4 py-3 text-sm font-bold text-black disabled:opacity-60">
          {busy ? "Enviando…" : approval ? "Solicitar participação" : "Confirmar minha presença"}
        </button>
      )}
      {active && <button disabled={busy} onClick={() => run("cancel")} className="text-xs text-muted underline hover:text-white">Cancelar minha presença</button>}
      {err && <p role="alert" className="text-sm text-down">{err}</p>}
    </div>
  );
}

export function DecideButtons({ rsvpId, status }: { rsvpId: number; status: string }) {
  const router = useRouter();
  const go = async (s: "confirmed" | "declined") => { await post({ action: "decide", rsvpId, status: s }); router.refresh(); };
  return (
    <span className="inline-flex gap-2">
      {status !== "confirmed" && <button type="button" onClick={() => go("confirmed")} className="rounded bg-up/20 px-2 py-0.5 text-xs font-semibold text-up">Aprovar</button>}
      {status !== "declined" && <button type="button" onClick={() => go("declined")} className="rounded bg-down/15 px-2 py-0.5 text-xs font-semibold text-down">Recusar</button>}
    </span>
  );
}

export function CheckInButton({ code, name }: { code: string; name: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await post({ action: "checkin", code });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(d.ok ? { ok: true, text: `Entrada liberada: ${name}` } : { ok: false, text: d.reason ?? d.error ?? "Não foi possível." });
    router.refresh();
  }
  return (
    <div className="space-y-2">
      <button disabled={busy || msg?.ok} onClick={go} className="w-full rounded-lg bg-gradient-to-b from-gold-soft to-gold px-4 py-3 text-sm font-bold text-black disabled:opacity-60">{busy ? "Registrando…" : "Confirmar entrada"}</button>
      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</p>}
    </div>
  );
}
