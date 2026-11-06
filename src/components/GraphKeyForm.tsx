"use client";
import { useState } from "react";

/** Só para admin: cola a chave do The Graph para o servidor guardar. A chave não volta para a tela. */
export function GraphKeyForm() {
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/graph-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setMsg(j.error ?? `Não consegui salvar (erro ${r.status}).`); else { setKey(""); window.location.reload(); }
    } catch { setMsg("Falha de conexão."); }
    setBusy(false);
  }
  return (
    <div className="mt-3 rounded-lg border border-gold/40 p-3">
      <p className="mb-2 text-sm font-semibold text-gold-soft">Configurar a chave do The Graph aqui (somente administrador)</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} className="input flex-1" placeholder="Cole a chave" autoComplete="off" spellCheck={false} />
        <button type="button" onClick={save} disabled={busy || !key.trim()} className="btn btn-gold">Salvar chave</button>
      </div>
      {msg && <p className="mt-2 text-sm text-down">{msg}</p>}
      <p className="mt-2 text-xs text-muted">A chave fica guardada no banco do servidor e nunca é mostrada de volta nem enviada ao navegador de outros usuários.</p>
    </div>
  );
}
