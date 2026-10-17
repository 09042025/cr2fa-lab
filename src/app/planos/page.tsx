import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Checkout, type CryptoOrderView } from "@/components/Checkout";
import { formatBRL, periodLabel, priceCents, PLAN_FEATURES } from "@/lib/plans";
import { mercadoPagoEnabled } from "@/lib/mercadopago";
import { enabledNetworks, findNetwork, formatUnits } from "@/lib/crypto";
import { expireStaleOrders, listOrdersForUser } from "@/lib/orders";
import { Disclaimer, Logo, PageTitle } from "@/components/ui";
import { date, dateTime } from "@/lib/format";
import { now } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planos e pagamento" };

export default async function PlansPage() {
  const user = await requireUser();
  expireStaleOrders();
  const orders = listOrdersForUser(user.id);

  const pending: CryptoOrderView[] = orders
    .filter((o) => o.method === "crypto" && o.status === "pending" && o.expires_at && o.expires_at > now() && o.crypto_network && o.crypto_amount)
    .map((o) => {
      const net = findNetwork(o.crypto_network!)!;
      const asset = net.assets.find((a) => a.symbol === o.crypto_asset)!;
      return { orderId: o.id, network: net.name, asset: asset.symbol, address: o.crypto_address!, amount: formatUnits(o.crypto_amount!, asset.decimals), expiresAt: o.expires_at };
    });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between"><Logo /><Link href="/painel" className="btn btn-ghost">Voltar ao painel</Link></div>
      <PageTitle title="Planos e pagamento" subtitle="Pague por Pix, cartão de crédito ou cripto. O Pró é liberado assim que o pagamento é confirmado." />

      <div className="card mb-6 p-5">
        <p className="text-sm text-muted">Seu plano</p>
        <p className="text-xl font-bold text-gold-soft">
          {user.plan === "pro" ? "Pró" : "Grátis"}
          {user.plan === "pro" && user.role !== "admin" && user.planExpiresAt ? <span className="text-sm font-normal text-muted"> · ativo até {date(user.planExpiresAt)}</span> : null}
          {user.role === "admin" ? <span className="text-sm font-normal text-muted"> · acesso total (administrador)</span> : null}
        </p>
        <ul className="mt-3 grid gap-1 text-sm text-muted sm:grid-cols-2">{PLAN_FEATURES.pro.map((f) => <li key={f}>✓ {f}</li>)}</ul>
      </div>

      <Checkout
        prices={{ monthly: formatBRL(priceCents("monthly")), yearly: formatBRL(priceCents("yearly")) }}
        mpEnabled={mercadoPagoEnabled()}
        networks={enabledNetworks().map((n) => ({ id: n.id, name: n.name, assets: n.assets.map((a) => a.symbol) }))}
        pending={pending}
      />

      {orders.length > 0 && (
        <section className="card mt-8 p-4">
          <h2 className="mb-3 font-semibold">Seus pedidos</h2>
          <div className="overflow-x-auto">
            <table className="data">
              <thead><tr><th>Data</th><th>Plano</th><th>Forma</th><th className="num">Valor</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{dateTime(o.created_at)}</td>
                    <td>{periodLabel(o.period)}</td>
                    <td>{o.method === "crypto" ? `${o.crypto_asset} (${findNetwork(o.crypto_network || "")?.name ?? ""})` : "Pix/cartão"}</td>
                    <td className="num">{formatBRL(o.amount_cents)}</td>
                    <td className={o.status === "paid" ? "text-up" : o.status === "expired" ? "text-muted" : "text-gold-soft"}>{o.status === "paid" ? "Pago" : o.status === "expired" ? "Expirado" : "Aguardando"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <Disclaimer />
    </div>
  );
}
