"use client";
import { useState } from "react";

interface Opt { id: string; label: string }
/** Só admin: cadastra o ID do subgraph de uma rede/exchange. O servidor testa o ID antes de salvar. */
export function GraphSourcesForm({ networks, exchanges }: { networks: Opt[]; exchanges: Opt[] }) {
  const [chain, setChain] = useState(networks[0]?.id ?? "");
  const [dex, setDex] = useState(exchanges[0]?.id ?? "");
  const [id, setId] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/graph-source", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chain, dex, id }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setMsg({ ok: false, text: j.error ?? `Não consegui salvar (erro ${r.status}).` });
      else { setMsg({ ok: true, text: "Fonte testada e salva. Recarregando…" }); setTimeout(() => window.location.reload(), 800); }
    } catch { setMsg({ ok: false, text: "Falha de conexão." }); }
    setBusy(false);
  }
  return (
    <div className="mt-3 rounded-lg border border-gold/40 p-3">
      <p className="mb-2 text-sm font-semibold text-gold-soft">Cadastrar fonte de dados (somente administrador)</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
        <select className="input" value={chain} onChange={(e) => setChain(e.target.value)}>{networks.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}</select>
        <select className="input" value={dex} onChange={(e) => setDex(e.target.value)}>{exchanges.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}</select>
        <input className="input" value={id} onChange={(e) => setId(e.target.value)} placeholder="ID do subgraph (The Graph)" autoComplete="off" spellCheck={false} />
        <button type="button" onClick={save} disabled={busy || !id.trim()} className="btn btn-gold">Testar e salvar</button>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</p>}
      <p className="mt-2 text-xs text-muted">No The Graph Explorer, abra o subgraph da exchange naquela rede, copie o ID (as letras e números do endereço) e cole aqui. O servidor testa se ele tem pools e posições no formato da Uniswap v3.</p>
    </div>
  );
}
