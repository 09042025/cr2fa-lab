"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CryptoOrderCard, type CryptoOrderView, type NetworkOption } from "./Checkout";

export function MentoriaCheckout({ price, mpEnabled, networks, pending, product = "mentoria", title, subtitle }: { price: string; mpEnabled: boolean; networks: NetworkOption[]; pending: CryptoOrderView[]; product?: "mentoria" | "diamond" | "black"; title?: string; subtitle?: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<"mp" | "crypto">(mpEnabled ? "mp" : "crypto");
  const [networkId, setNetworkId] = useState(networks[0]?.id ?? "");
  const [asset, setAsset] = useState(networks[0]?.assets[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<CryptoOrderView[]>(pending);
  const net = networks.find((n) => n.id === networkId);

  async function payMp() {
    setBusy(true); setError(null);
    const res = await fetch("/api/checkout/mercadopago", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Erro ao iniciar o pagamento.");
    window.location.href = data.url;
  }
  async function payCrypto() {
    setBusy(true); setError(null);
    const res = await fetch("/api/checkout/crypto", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product, network: networkId, asset }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Erro ao criar o pedido.");
    setOrders((o) => [data as CryptoOrderView, ...o]);
  }

  return (
    <div className="space-y-4">
      <div className="card border-gold/40 p-5">
        <h2 className="font-display text-lg font-bold text-gold-soft">{title ?? "Contratar a mentoria"} · {price}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle ?? "Pagamento único, à parte do plano Premium. Não é assinatura e nada é renovado sozinho."}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setMethod("mp")} disabled={!mpEnabled} className={`btn ${method === "mp" ? "btn-gold" : "btn-ghost"}`}>Pix ou cartão (Mercado Pago)</button>
          <button onClick={() => setMethod("crypto")} disabled={networks.length === 0} className={`btn ${method === "crypto" ? "btn-gold" : "btn-ghost"}`}>Cripto</button>
        </div>
        {!mpEnabled && <p className="mt-2 text-xs text-muted">Pix e cartão ficam disponíveis quando o Mercado Pago é configurado no servidor.</p>}
        {networks.length === 0 && <p className="mt-2 text-xs text-muted">Pagamento em cripto fica disponível quando um endereço de recebimento é configurado.</p>}

        {method === "mp" && mpEnabled && (
          <div className="mt-4">
            <p className="mb-3 text-sm text-muted">Você será levado ao checkout seguro do Mercado Pago (Pix com aprovação na hora ou cartão de crédito em até 12x). O acesso é liberado automaticamente após a confirmação.</p>
            <button className="btn btn-gold" onClick={payMp} disabled={busy}>{busy ? "Aguarde..." : `Pagar ${price}`}</button>
          </div>
        )}
        {method === "crypto" && networks.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor={`${product}-net`}>Rede</label>
                <select id={`${product}-net`} className="input" value={networkId} onChange={(e) => { setNetworkId(e.target.value); setAsset(networks.find((n) => n.id === e.target.value)!.assets[0]); }}>
                  {networks.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor={`${product}-asset`}>Ativo</label>
                <select id={`${product}-asset`} className="input" value={asset} onChange={(e) => setAsset(e.target.value)}>
                  {net?.assets.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-gold" onClick={payCrypto} disabled={busy}>{busy ? "Gerando..." : "Gerar valor e endereço"}</button>
          </div>
        )}
        {error && <p role="alert" className="mt-3 rounded-lg border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">{error}</p>}
      </div>
      {orders.map((o) => <CryptoOrderCard key={o.orderId} order={{ ...o, product }} onPaid={() => router.refresh()} />)}
    </div>
  );
}

export function SessionsAdmin({ id, done }: { id: number; done: number }) {
  const router = useRouter();
  const set = async (n: number) => { await fetch("/api/admin/mentoria", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, done: n }) }); router.refresh(); };
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" aria-label="Menos uma aula" disabled={done <= 0} onClick={() => set(done - 1)} className="rounded border border-line px-2 disabled:opacity-40">−</button>
      <strong className="text-white">{done}/12</strong>
      <button type="button" aria-label="Mais uma aula" disabled={done >= 12} onClick={() => set(done + 1)} className="rounded border border-line px-2 disabled:opacity-40">+</button>
    </span>
  );
}

export function NewTurmaButton() {
  const router = useRouter();
  return (
    <button type="button" className="btn btn-ghost" onClick={async () => {
      if (!confirm("Abrir uma nova turma? As vagas voltam a ficar todas livres (a turma atual continua registrada).")) return;
      await fetch("/api/admin/mentoria", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "new-turma" }) });
      router.refresh();
    }}>Abrir nova turma</button>
  );
}

export function SoldOut() {
  return (
    <div className="card border-down/40 p-5 text-sm text-muted">
      <p className="font-semibold text-white">Vagas esgotadas nesta turma</p>
      <p className="mt-1">A Turma SPOT da Mentoria com Niza está completa por enquanto. Fale com a equipe para entrar na lista de espera, ou garanta já o <a href="/planos#diamond" className="text-gold-soft underline">Plano Diamond</a> (Premium vitalício + Mentoria), que não tem limite de vagas.</p>
    </div>
  );
}

export function SpotsBadge({ left, limit, turma }: { left: number; limit: number; turma: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${left === 0 ? "border-down/50 bg-down/10 text-down" : left <= 8 ? "border-gold/60 bg-gold/10 text-gold-soft" : "border-sky-300/40 bg-sky-400/10 text-sky-200"}`}>
      Turma SPOT {turma} · {left === 0 ? "vagas esgotadas" : `${left} de ${limit} vagas restantes`}
    </span>
  );
}

export function GuestForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/mentoria", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "add-guest", email }) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? { ok: true, t: "Convidado adicionado. Ocupa uma vaga da turma." } : { ok: false, t: d.error ?? "Não foi possível." });
    if (r.ok) { setEmail(""); router.refresh(); }
  }
  return (
    <form onSubmit={go} className="mb-4 flex flex-wrap items-center gap-2">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail do membro convidado (sem pagamento)" aria-label="E-mail do convidado" className="input min-w-[18rem] flex-1" />
      <button className="btn btn-gold" type="submit">Convidar para a mentoria</button>
      {msg && <span role="status" className={`text-sm ${msg.ok ? "text-up" : "text-down"}`}>{msg.t}</span>}
    </form>
  );
}
