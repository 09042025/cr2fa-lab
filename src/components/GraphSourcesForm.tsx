"use client";
import { useState } from "react";

interface Opt { id: string; label: string }
/** Só admin: cadastra o ID do subgraph de uma rede/exchange. O servidor testa o ID antes de salvar. */
export function GraphSourcesForm({ networks, exchanges, saved = [] }: { networks: Opt[]; exchanges: Opt[]; saved?: { chain: string; dex: string; id: string }[] }) {
  const [chain, setChain] = useState(networks[0]?.id ?? "");
  const [dex, setDex] = useState(exchanges[0]?.id ?? "");
  const [id, setId] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<string | null>(null); // fonte esperando confirmação de remoção
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
  async function remove(c: string, d: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/graph-source", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ chain: c, dex: d }) });
      if (r.ok) window.location.reload(); else setMsg({ ok: false, text: `Não consegui remover (erro ${r.status}).` });
    } catch { setMsg({ ok: false, text: "Falha de conexão." }); }
    setBusy(false);
  }
  const label = (list: Opt[], id: string) => list.find((x) => x.id === id)?.label ?? id;
  return (
    <div className="mt-3 rounded-lg border border-gold/40 p-3">
      {saved.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-sm font-semibold text-gold-soft">Fontes cadastradas</p>
          <ul className="grid gap-1 text-sm">
            {saved.map((x) => (
              <li key={`${x.chain}-${x.dex}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-2 py-1">
                <span>{label(networks, x.chain)} · {label(exchanges, x.dex)} <span className="text-xs text-muted">· {x.id.slice(0, 8)}…{x.id.slice(-4)}</span></span>
                {ask === `${x.chain}:${x.dex}`
                  ? <span className="flex gap-1"><button type="button" disabled={busy} onClick={() => remove(x.chain, x.dex)} className="rounded border border-down bg-down/20 px-2 py-0.5 text-xs font-semibold text-down">Confirmar remoção</button><button type="button" onClick={() => setAsk(null)} className="rounded border border-line px-2 py-0.5 text-xs text-muted">Cancelar</button></span>
                  : <button type="button" disabled={busy} onClick={() => setAsk(`${x.chain}:${x.dex}`)} className="rounded border border-down/60 px-2 py-0.5 text-xs text-down hover:bg-down/10">Remover</button>}
              </li>
            ))}
          </ul>
        </div>
      )}
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
