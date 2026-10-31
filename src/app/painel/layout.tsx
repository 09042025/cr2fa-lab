import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { Logo, ProBadge } from "@/components/ui";
import { date } from "@/lib/format";
import { unreadCount } from "@/lib/dm";
import { TrialButton } from "@/components/TrialButton";
import { trialDays } from "@/lib/trial";

type NavItem = { href: string; label: string; pro?: boolean; sub?: boolean };

/** O Feed é sempre o primeiro (e a página inicial). O resto segue a ordem alfabética. */
const FEED: NavItem = { href: "/painel/feed", label: "Feed" };
const OTHERS: NavItem[] = [
  { href: "/painel/acoes", label: "Ações" },
  { href: "/painel/comunidade", label: "Comunidade" },
  { href: "/painel/cripto", label: "Cripto" },
  { href: "/painel/cursos", label: "Cursos", pro: true },
  { href: "/painel/fiis", label: "Fundos imobiliários" },
  { href: "/painel/links", label: "Links Essenciais", pro: true },
  { href: "/painel/noticias", label: "Notícias" },
  { href: "/planos", label: "Planos e pagamento" },
  { href: "/painel/portfolio", label: "Portfólio", pro: true },
  { href: "/painel/protocolo", label: "Protocolo CR2FA" },
  { href: "/painel/renda-fixa", label: "Renda fixa" },
  { href: "/painel/visao-geral", label: "Visão geral" },
].sort((x, y) => x.label.localeCompare(y.label, "pt-BR"));
const NAV: NavItem[] = [FEED, ...OTHERS];
const ITEM = "flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-panel-2";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = unreadCount(user.id);
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 md:flex-row">
      <aside className="md:sticky md:top-5 md:h-[calc(100vh-2.5rem)] md:w-60 md:shrink-0">
        <div className="card flex h-full flex-col overflow-hidden p-4">
          <Logo />
          <nav className="mt-5 flex gap-1 overflow-x-auto md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden" aria-label="Principal">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`${ITEM} text-muted hover:text-white`}>
                {n.label}
                {n.pro && <ProBadge />}
                {n.href === "/painel/feed" && unread > 0 && <span className="rounded-full bg-gold px-1.5 text-[11px] font-bold text-ink" aria-label={`${unread} mensagens não lidas`}>{unread}</span>}
              </Link>
            ))}
            {user.role === "admin" && (
              <Link href="/painel/admin" className={ITEM + " text-gold-soft"}>Administração</Link>
            )}
            <Link href="/painel/configuracoes" className={ITEM + " text-muted hover:text-white"}>Configurações</Link>
            <LogoutButton variant="nav" />
          </nav>
          <div className="mt-4 shrink-0 border-t border-line pt-4 md:mt-auto">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="mt-2 text-xs">
              Plano: <span className={user.plan === "pro" ? "font-semibold text-gold-soft" : "text-muted"}>{user.plan === "pro" ? "Pró" : "Grátis"}</span>
              {user.plan === "pro" && user.role !== "admin" && user.planExpiresAt ? <span className="text-muted"> {user.onTrial ? "(teste) " : ""}até {date(user.planExpiresAt)}</span> : null}
            </p>
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
