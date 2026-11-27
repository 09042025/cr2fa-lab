import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Locked } from "@/components/ui";
import { getInvite } from "@/lib/black";
import { hasBlack } from "@/lib/orders";
import { BLACK_NAME } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata = { title: `Niza Wallet | ${BLACK_NAME}` };

export default async function Page() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  if (user.plan !== "pro" && !isAdmin && getInvite(user.id) !== "invited") return <Locked feature={`${BLACK_NAME} (exclusivo da White Flame Society)`} />;
  const member = hasBlack(user.id);

  if (!member && !isAdmin) {
    return (
      <section className="card mb-6 border-gold/30 p-5">
        <h2 className="font-display text-lg font-bold text-gold-soft">Niza Wallet</h2>
        <p className="mt-1 text-sm text-muted">A Niza Wallet é exclusiva de quem tem o Black Diamond VIP ativo. Veja como participar na <Link href="/painel/black" className="underline">Visão geral</Link>.</p>
      </section>
    );
  }

  return (
    <section className="card mb-6 border-gold/40 p-5">
      <h2 className="font-display text-lg font-bold text-gold-soft">Niza Wallet</h2>
      <p className="mt-1 text-sm text-muted">Carteira de criptomoedas exclusiva do Black Diamond. As suas chaves ficam só no seu aparelho: a Niza Wallet não é ligada à sua conta do Niza Invest.</p>
      {/* Link comum (não <Link>): a rota confere o plano no servidor e redireciona para outro domínio. */}
      <a href="/api/wallet/pass" className="btn-gold mt-3 inline-block rounded-full px-5 py-2 font-semibold">Abrir Niza Wallet</a>
      {isAdmin && <p className="mt-3 text-xs text-muted">Admin: a chave pública para a variável VIP_PUBLIC_KEY da Railway fica em <a href="/api/admin/wallet-key" className="underline">/api/admin/wallet-key</a>.</p>}
    </section>
  );
}
