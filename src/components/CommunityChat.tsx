"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ChatForm({ channel, max }: { channel: string; max: number }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/community", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel, body }) });
    setBusy(false);
    if (!res.ok) return setErr(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível enviar.");
    setBody("");
    router.refresh();
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <textarea
          value={body}
          maxLength={max}
          rows={2}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Conversar neste canal… (Enter envia, Shift+Enter quebra a linha)"
          className="min-h-[3rem] flex-1 resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm"
        />
        <button className="btn btn-gold self-end" onClick={send} disabled={busy}>Enviar</button>
      </div>
      {err && <p className="mt-1 text-xs text-down">{err}</p>}
    </div>
  );
}

/** Apaga uma mensagem (do próprio autor ou, para administradores, de qualquer um). */
export function DeleteMessage({ id }: { id: number }) {
  const router = useRouter();
  return (
    <button
      className="text-xs text-down opacity-70 hover:opacity-100"
      onClick={async () => {
        if (!confirm("Apagar esta mensagem?")) return;
        await fetch(`/api/community?id=${id}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      apagar
    </button>
  );
}

/** Atualiza a lista sozinha a cada 20 segundos e mantém a rolagem no fim. */
export function AutoRefresh({ count }: { count: number }) {
  const router = useRouter();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [count]);
  return <div ref={end} />;
}
