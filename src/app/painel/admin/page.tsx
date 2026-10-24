import { requireAdmin } from "@/lib/auth";
import { db, effectivePlan, type OrderRow, type UserRow } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { AdminPlanButtons } from "@/components/AdminPlanButtons";
import { date, dateTime } from "@/lib/format";
import { formatBRL } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração" };

export default async function AdminPage() {
  await requireAdmin();
  const users = db().prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 300").all() as UserRow[];
  const orders = db()
    .prepare("SELECT o.*, u.email AS email FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 100")
    .all() as (OrderRow & { email: string })[];
  const paid = orders.filter((o) => o.status === "paid");
  const revenue = paid.reduce((a, o) => a + o.amount_cents, 0);
  const pros = users.filter((u) => effectivePlan(u) === "pro" && u.role !== "admin").length;

  return (
    <>
      <PageTitle title="Administração" subtitle="Usuários, planos e pedidos." />
      <section className="mb-6 grid gap-4 sm:grid-cols-4">
        {[["Usuários", users.length], ["Assinantes Pró", pros], ["Pedidos pagos", paid.length], ["Receita (BRL, pedidos listados)", formatBRL(revenue)]].map(([l, v]) => (
          <div key={l as string} className="card p-4"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-2xl font-bold text-gold-soft">{v}</p></div>
        ))}
      </section>

      <section className="card mb-6 p-4">
        <h2 className="mb-3 font-semibold">Usuários</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Plano</th><th>Pró até</th><th>Cadastro</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td><td className="text-muted">{u.email}</td><td>{u.role === "admin" ? "admin" : "usuário"}</td>
                  <td>{effectivePlan(u) === "pro" ? "Pró" : "Grátis"}</td><td>{u.role === "admin" ? "—" : date(u.plan_expires_at)}</td><td>{date(u.created_at)}</td>
                  <td>{u.role !== "admin" && <AdminPlanButtons userId={u.id} isPro={effectivePlan(u) === "pro"} email={u.email} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Pedidos recentes</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>Data</th><th>Usuário</th><th>Forma</th><th className="num">Valor</th><th>Status</th><th>Referência</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{dateTime(o.created_at)}</td><td className="text-muted">{o.email}</td>
                  <td>{o.method === "crypto" ? `${o.crypto_asset} ${o.crypto_network}` : "Pix/cartão"}</td>
                  <td className="num">{formatBRL(o.amount_cents)}</td><td>{o.status}</td>
                  <td className="max-w-[180px] truncate font-mono text-xs text-muted">{o.tx_hash || o.provider_ref || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
