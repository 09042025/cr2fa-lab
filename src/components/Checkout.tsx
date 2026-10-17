"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface NetworkOption { id: string; name: string; assets: string[] }
export interface CryptoOrderView { orderId: string; network: string; asset: string; address: string; amount: string; expiresAt: number | null }

type Period = "monthly" | "yearly";
type Method = "pix_card" | "crypto";

export function Checkout({
  prices,
  mpEnabled,
  networks,
  pending,
}: {
  prices: Record<Period, string>;
  mpEnabled: boolean;
  networks: NetworkOption[];
  pending: CryptoOrderView[];
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("monthly");
  const [method, setMethod] = useState<Method>(mpEnabled ? "pix_card" : "crypto");
  const [networkId, setNetworkId] = useState(networks[0]?.id ?? "");
  const [asset, setAsset] = useState(networks[0]?.assets[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<CryptoOrderView[]>(pending);

  const net = networks.find((n) => n.id === networkId);

  async function payMp() {
    setBusy(true); setError(null);
    const res = await fetch("/api/checkout/mercadopago", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ period }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Erro ao iniciar o pagamento.");
    window.location.href = data.url;
  }

  async function payCrypto() {
    setBusy(true); setError(null);
    const res = await fetch("/api/checkout/crypto", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ period, network: networkId, asset }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Erro ao criar o pedido.");
    setOrders((o) => [data as CryptoOrderView, ...o]);
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Assinar o Pró</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["monthly", "yearly"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`rounded-xl border p-4 text-left ${period === p ? "border-gold bg-gold/10" : "border-line"}`}>
              <p className="text-sm text-muted">{p === "monthly" ? "Mensal" : "Anual"}</p>
              <p className="text-2xl font-bold">{prices[p]}</p>
              <p className="text-xs text-muted">{p === "monthly" ? "renovação manual a cada mês" : "um pagamento por ano"}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={() => setMethod("pix_card")} disabled={!mpEnabled} className={`btn ${method === "pix_card" ? "btn-gold" : "btn-ghost"}`}>Pix ou cartão</button>
          <button onClick={() => setMethod("crypto")} disabled={networks.length === 0} className={`btn ${method === "crypto" ? "btn-gold" : "btn-ghost"}`}>Cripto</button>
        </div>
        {!mpEnabled && <p className="mt-2 text-xs text-muted">Pix e cartão ficam disponíveis quando o Mercado Pago é configurado no servidor.</p>}
        {networks.length === 0 && <p className="mt-2 text-xs text-muted">Pagamento em cripto fica disponível quando um endereço de recebimento é configurado.</p>}

        {method === "pix_card" && mpEnabled && (
          <div className="mt-5">
            <p className="mb-3 text-sm text-muted">Você será levado ao checkout seguro do Mercado Pago, onde escolhe Pix (aprovação na hora) ou cartão de crédito. O Pró é liberado automaticamente após a confirmação.</p>
            <button className="btn btn-gold" onClick={payMp} disabled={busy}>{busy ? "Aguarde..." : `Pagar ${prices[period]}`}</button>
          </div>
        )}

        {method === "crypto" && networks.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="net">Rede</label>
                <select id="net" className="input" value={networkId} onChange={(e) => { setNetworkId(e.target.value); setAsset(networks.find((n) => n.id === e.target.value)!.assets[0]); }}>
                  {networks.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="asset">Ativo</label>
                <select id="asset" className="input" value={asset} onChange={(e) => setAsset(e.target.value)}>
                  {net?.assets.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-gold" onClick={payCrypto} disabled={busy}>{busy ? "Gerando..." : "Gerar valor e endereço"}</button>
          </div>
        )}
        {error && <p role="alert" className="mt-3 rounded-lg border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">{error}</p>}
      </div>

      {orders.map((o) => <CryptoOrderCard key={o.orderId} order={o} onPaid={() => router.refresh()} />)}
    </div>
  );
}

function CryptoOrderCard({ order, onPaid }: { order: CryptoOrderView; onPaid: () => void }) {
  const [hash, setHash] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(order.expiresAt ? order.expiresAt * 1000 - Date.now() : null);

  useEffect(() => {
    if (!order.expiresAt) return;
    const t = setInterval(() => setLeft(order.expiresAt! * 1000 - Date.now()), 1000);
    return () => clearInterval(t);
  }, [order.expiresAt]);

  const expired = left !== null && left <= 0;

  async function verify() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/checkout/crypto/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: order.orderId, txHash: hash }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data.ok) { setMsg({ ok: true, text: "Pagamento confirmado! O plano Pró foi liberado." }); setTimeout(onPaid, 1200); }
    else setMsg({ ok: false, text: data.reason || data.error || "Não foi possível confirmar." });
  }

  const mm = left !== null && left > 0 ? `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}` : null;

  return (
    <div className="card border-gold/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Pagamento em {order.asset} na rede {order.network}</h3>
        {mm && <span className="text-sm text-gold-soft">Valor válido por {mm}</span>}
        {expired && <span className="text-sm text-down">Expirado, gere um novo valor</span>}
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-muted">Envie exatamente</dt>
          <dd className="break-all font-mono text-lg font-bold text-gold-soft">{order.amount} {order.asset}</dd>
          <dd className="text-xs text-muted">O valor tem casas extras que identificam o seu pedido. Envie o número completo, sem arredondar.</dd>
        </div>
        <div>
          <dt className="text-muted">Para o endereço ({order.network})</dt>
          <dd className="break-all font-mono">{order.address}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <label className="label" htmlFor={`h-${order.orderId}`}>Hash da transação (depois de enviar)</label>
        <div className="flex gap-2">
          <input id={`h-${order.orderId}`} className="input font-mono text-sm" value={hash} onChange={(e) => setHash(e.target.value)} placeholder="cole o hash aqui" disabled={expired} />
          <button className="btn btn-gold" onClick={verify} disabled={busy || expired || hash.length < 40}>{busy ? "..." : "Confirmar"}</button>
        </div>
      </div>
      {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</p>}
      <p className="mt-3 text-xs text-muted">Confira a rede antes de enviar: valores enviados por rede errada não podem ser recuperados.</p>
    </div>
  );
}
