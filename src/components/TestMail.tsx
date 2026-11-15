"use client";

import { useState } from "react";

/** Envia agora o e-mail de alerta para o próprio investidor (para conferir que o aviso chega). */
export function TestMail() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-2 text-xs">
      <button disabled={busy} className="text-gold-soft underline" onClick={async () => {
        setBusy(true); setMsg(null);
        const r = await fetch("/api/portfolio/alerts", { method: "POST" });
        const j = await r.json().catch(() => ({}));
        setMsg(r.ok ? j.message : j.error || "Não foi possível enviar.");
        setBusy(false);
      }}>Enviar o e-mail de alerta agora (teste)</button>
      {msg && <p className="mt-1 text-muted">{msg}</p>}
    </div>
  );
}
