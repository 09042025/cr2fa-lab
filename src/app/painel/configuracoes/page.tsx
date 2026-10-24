import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import { PasswordForm, ProfileForm } from "@/components/AccountForms";
import { LogoutButton } from "@/components/LogoutButton";
import { date } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="max-w-2xl">
      <PageTitle title="Configurações" subtitle="Gerencie seu perfil, sua senha e seu plano." />

      <section className="card mb-6 p-5">
        <h2 className="mb-4 font-semibold">Perfil</h2>
        <ProfileForm name={user.name} email={user.email} />
      </section>

      <section className="card mb-6 p-5">
        <h2 className="mb-4 font-semibold">Alterar senha</h2>
        <PasswordForm />
      </section>

      <section className="card mb-6 p-5">
        <h2 className="mb-2 font-semibold">Plano</h2>
        <p className="text-sm text-muted">
          Plano atual: <span className={user.plan === "pro" ? "font-semibold text-gold-soft" : ""}>{user.plan === "pro" ? "Pró" : "Grátis"}</span>
          {user.role === "admin" ? " · acesso total (administrador)" : null}
          {user.plan === "pro" && user.role !== "admin" && user.planExpiresAt ? ` · ${user.onTrial ? "teste grátis até" : "ativo até"} ${date(user.planExpiresAt)}` : null}
        </p>
        <Link href="/planos" className="btn btn-ghost mt-4">Planos e pagamento</Link>
      </section>

      {user.role === "admin" && (
        <section className="card mb-6 p-5">
          <h2 className="mb-2 font-semibold">Administração</h2>
          <p className="mb-4 text-sm text-muted">Usuários, planos e pedidos.</p>
          <Link href="/painel/admin" className="btn btn-ghost">Abrir Administração</Link>
        </section>
      )}

      <section className="card mb-6 p-5">
        <h2 className="mb-4 font-semibold">Sessão</h2>
        <div className="sm:max-w-xs"><LogoutButton /></div>
      </section>
    </div>
  );
}
