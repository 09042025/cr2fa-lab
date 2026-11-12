import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Checkout, type CryptoOrderView } from "@/components/Checkout";
import { formatBRL, periodLabel, priceCents, PLAN_FEATURES } from "@/lib/plans";
import { mercadoPagoEnabled } from "@/lib/mercadopago";
import { enabledNetworks, findNetwork, formatUnits } from "@/lib/crypto";
import { expireStaleOrders, hasDiamond, listOrdersForUser } from "@/lib/orders";
import { Disclaimer, Logo, PageTitle } from "@/components/ui";
import { date, dateTime } from "@/lib/format";
import { now } from "@/lib/db";
import { TrialButton } from "@/components/TrialButton";
import { MentoriaCheckout, SoldOut, SpotsBadge } from "@/components/MentoriaCheckout";
import { spots as getSpots } from "@/lib/mentoria";
import { Diamond } from "@/components/Diamond";
import { mentoriaCheckoutProps } from "@/lib/mentoria-view";
import { MENTORIA_SESSIONS, DIAMOND_FEATURES, DIAMOND_NAME, diamondPriceCents } from "@/lib/plans";
import { trialDays } from "@/lib/trial";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planos e pagamento" };

export default async function PlansPage() {
  const user = await requireUser();
  expireStaleOrders();
  const orders = listOrdersForUser(user.id);
  const diamond = hasDiamond(user.id);
  const sp2 = getSpots();

  const pending: CryptoOrderView[] = orders
    .filter((o) => o.product === "premium" && o.method === "crypto" && o.status === "pending" && o.expires_at && o.expires_at > now() && o.crypto_network && o.crypto_amount)
    .map((o) => {
      const net = findNetwork(o.crypto_network!)!;
      const asset = net.assets.find((a) => a.symbol === o.crypto_asset)!;
      return { product: o.product, orderId: o.id, network: net.name, asset: asset.symbol, address: o.crypto_address!, amount: formatUnits(o.crypto_amount!, asset.decimals), expiresAt: o.expires_at };
    });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between"><Logo site /><Link href="/painel" className="btn btn-ghost">Voltar ao painel</Link></div>
      <PageTitle title="Planos e pagamento" subtitle="Pague por Pix, cartão de crédito ou cripto. O Premium é liberado assim que o pagamento é confirmado." />

      <div className="card mb-6 p-5">
        <p className="text-sm text-muted">Seu plano</p>
        <p className="text-xl font-bold text-gold-soft">
          {diamond ? "Diamond (Premium vitalício + Mentoria)" : user.plan === "pro" ? "Premium" : "Grátis"}
          {user.plan === "pro" && user.role !== "admin" && user.planExpiresAt ? <span className="text-sm font-normal text-muted"> · {user.onTrial ? "teste grátis até" : "ativo até"} {date(user.planExpiresAt)}</span> : null}
          {user.role === "admin" ? <span className="text-sm font-normal text-muted"> · acesso total (administrador)</span> : null}
        </p>
        <ul className="mt-3 grid gap-1 text-sm text-muted sm:grid-cols-2">{PLAN_FEATURES.pro.map((f) => <li key={f}>✓ {f}</li>)}</ul>
      </div>

      {user.trialAvailable && (
        <div className="card mb-6 border-gold/50 p-5">
          <h2 className="font-semibold text-gold-soft">Teste o Premium por {trialDays()} dias, sem pagar</h2>
          <p className="mb-3 mt-1 text-sm text-muted">Libera todos os recursos do Premium agora. Não pedimos cartão e nada é cobrado no fim: o plano volta para o Grátis, e você assina só se quiser.</p>
          <TrialButton days={trialDays()} />
        </div>
      )}

      <Checkout
        prices={{ monthly: formatBRL(priceCents("monthly")), yearly: formatBRL(priceCents("yearly")) }}
        mpEnabled={mercadoPagoEnabled()}
        networks={enabledNetworks().map((n) => ({ id: n.id, name: n.name, assets: n.assets.map((a) => a.symbol) }))}
        pending={pending}
      />

      <section id="mentoria" className="mt-10">
        <div className="card mb-4 border-sky-300/30 p-5">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-gold-soft"><Diamond size={26} /> Mentoria com Niza · Plano Diamond</h2>
          <p className="mt-2 text-sm text-muted">{MENTORIA_SESSIONS} aulas particulares de 1 hora (1 por mês) via Google Meet ou Teams, com foco em criptomoedas: da primeira corretora e do Pix até o Bitcoin na sua própria carteira, avaliação da sua carteira pelo Protocolo CR2FA e o racional dos pools de liquidez. A aula 01 avalia o seu nível de conhecimento. Pagamento único, à parte do Premium, e sem recomendação de ativos.</p>
          <p className="mt-3"><SpotsBadge left={sp2.left} limit={sp2.limit} turma={sp2.turma} /></p>
          <p className="mt-2 text-sm"><Link href="/painel/mentoria" className="text-gold-soft underline">Ver todos os detalhes da mentoria</Link></p>
        </div>
        {sp2.full ? <SoldOut /> : <MentoriaCheckout {...mentoriaCheckoutProps(orders)} />}
      </section>

      {!diamond && (
        <details id="diamond" className="group mt-8 overflow-hidden rounded-2xl border border-sky-300/40 bg-gradient-to-br from-panel-2 via-panel to-ink open:border-gold/60">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
            <Diamond size={72} className="shrink-0 drop-shadow-[0_0_18px_rgba(150,200,255,0.45)]" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-200/90">Vitalício · pagamento único</p>
              <h2 className="font-display text-xl font-bold text-gold-soft">Plano Diamond</h2>
              <p className="text-sm text-muted">Tudo do Premium, para sempre, mais a Mentoria com Niza.</p>
            </div>
            <div className="text-right"><p className="font-display text-2xl font-bold text-white">{formatBRL(diamondPriceCents())}</p><p className="text-xs text-gold-soft underline group-open:hidden">Clique para ver e contratar</p></div>
          </summary>
          <div className="space-y-4 border-t border-line p-5">
            <h3 className="font-display text-lg font-bold text-white">{DIAMOND_NAME}</h3>
            <ul className="grid gap-1 text-sm text-muted sm:grid-cols-2">{DIAMOND_FEATURES.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            <p className="text-xs text-muted">A mentoria vale uma vez, com {MENTORIA_SESSIONS} aulas, como descrita na página da <Link href="/painel/mentoria" className="underline">Mentoria com Niza</Link> (sem recomendação de ativos, riscos e decisões são sua responsabilidade). O Premium vitalício não tem renovação.</p>
            <MentoriaCheckout {...mentoriaCheckoutProps(orders, "diamond")} product="diamond" title={DIAMOND_NAME} subtitle="Pagamento único. Libera o Premium vitalício e a Mentoria com Niza assim que o pagamento for confirmado." />
          </div>
        </details>
      )}

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
                    <td>{o.product === "diamond" ? "Plano Diamond" : o.product === "mentoria" ? "Mentoria Diamond" : periodLabel(o.period)}</td>
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
