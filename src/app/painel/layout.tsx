import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { Logo, ProBadge } from "@/components/ui";
import { date } from "@/lib/format";
import { TrialButton } from "@/components/TrialButton";
import { trialDays } from "@/lib/trial";

const NAV: { href: string; label: string; pro?: boolean; sub?: boolean }[] = [
  { href: "/painel", label: "Visão geral" },
  { href: "/painel/protocolo", label: "Protocolo CR2FA" },
  { href: "/painel/cripto", label: "Cripto" },
  { href: "/painel/fiis", label: "Fundos imobiliários" },
  { href: "/painel/acoes", label: "Ações" },
  { href: "/painel/renda-fixa", label: "Renda fixa" },
  { href: "/painel/portfolio", label: "Portfólio", pro: true },
  { href: "/painel/cursos", label: "Cursos", pro: true },
  { href: "/painel/comunidade", label: "Comunidade", pro: true },
  { href: "/planos", label: "Planos e pagamento" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 md:flex-row">
      <aside className="md:sticky md:top-5 md:h-[calc(100vh-2.5rem)] md:w-60 md:shrink-0">
        <div className="card flex h-full flex-col p-4">
          <Logo />
          <nav className="mt-5 flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Principal">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-lg py-2 text-sm text-muted hover:bg-panel-2 hover:text-white ${n.sub ? "px-3 md:pl-7 md:text-[13px]" : "px-3"}`}>
                {n.label}
                {n.pro && <ProBadge />}
              </Link>
            ))}
            {user.role === "admin" && (
              <Link href="/painel/admin" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-gold-soft hover:bg-panel-2">
                Administração
              </Link>
            )}
          </nav>
          <div className="mt-4 border-t border-line pt-4 md:mt-auto">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <p className="mt-2 text-xs">
              Plano: <span className={user.plan === "pro" ? "font-semibold text-gold-soft" : "text-muted"}>{user.plan === "pro" ? "Pró" : "Grátis"}</span>
              {user.plan === "pro" && user.role !== "admin" && user.planExpiresAt ? <span className="text-muted"> {user.onTrial ? "(teste) " : ""}até {date(user.planExpiresAt)}</span> : null}
            </p>
            <div className="mt-3 space-y-2">
              <Link href="/painel/configuracoes" className="btn btn-ghost w-full">Configurações</Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {user.trialAvailable && (
          <div className="card mb-5 flex flex-col gap-3 border-gold/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm"><span className="font-semibold text-gold-soft">Teste o Pró por {trialDays()} dias, sem pagar.</span> <span className="text-muted">Sem cartão e sem cobrança no fim.</span></p>
            <TrialButton days={trialDays()} className="btn btn-gold whitespace-nowrap" />
          </div>
        )}
        {user.onTrial && user.planExpiresAt ? (
          <p className="mb-5 rounded-lg border border-line bg-panel-2 px-4 py-2 text-sm text-muted">
            Você está no teste grátis do Pró até <span className="text-gold-soft">{date(user.planExpiresAt)}</span>. <Link href="/planos" className="text-gold-soft underline">Ver planos</Link>
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}
