import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { Logo, ProBadge } from "@/components/ui";
import { date } from "@/lib/format";
import { unreadCount } from "@/lib/dm";
import { TrialButton } from "@/components/TrialButton";
import { trialDays } from "@/lib/trial";
import { db } from "@/lib/db";
import { getMember } from "@/lib/feed";
import { Avatar } from "@/components/Avatar";
import { MobileDrawer } from "@/components/MobileDrawer";

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
  { href: "/painel/lives", label: "Lives Abertas" },
  { href: "/painel/feed/mensagens", label: "Mensagens" },
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
  const me = getMember(user.id, user.id)!;
  const avatarId = (db().prepare("SELECT avatar_id a FROM users WHERE id = ?").get(user.id) as { a: number | null } | undefined)?.a ?? null;
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 md:flex-row">
      <MobileDrawer name={user.name} avatarId={avatarId} logo={<Logo />}>
        <div className="card flex h-full flex-col overflow-hidden rounded-l-none p-4 md:rounded-l-2xl">
          <Logo />
          <div className="mt-4 flex items-center gap-3 border-b border-line pb-4">
            <Link href={`/painel/feed/membro/${user.id}`} aria-label="Meu perfil" className="shrink-0"><Avatar name={user.name} id={me.avatarId} size={48} /></Link>
            <div className="min-w-0">
              <Link href={`/painel/feed/membro/${user.id}`} className="block truncate text-sm font-semibold hover:underline">{user.name}</Link>
              <p className="truncate text-xs text-muted">@{me.handle}</p>
              <p className="mt-1 flex flex-wrap gap-x-3 text-[11px]">
                <Link href={`/painel/feed/membro/${user.id}?aba=seguindo`} className="hover:underline"><strong>{me.following}</strong> <span className="text-muted">seguindo</span></Link>
                <Link href={`/painel/feed/membro/${user.id}?aba=seguidores`} className="hover:underline"><strong>{me.followers}</strong> <span className="text-muted">seguidores</span></Link>
              </p>
            </div>
          </div>
          <nav className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden" aria-label="Principal">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`${ITEM} text-muted hover:text-white`}>
                {n.label}
                {n.pro && <ProBadge />}
                {n.href === "/painel/feed/mensagens" && unread > 0 && <span className="rounded-full bg-gold px-1.5 text-[11px] font-bold text-ink" aria-label={`${unread} mensagens não lidas`}>{unread}</span>}
              </Link>
            ))}
            {user.role === "admin" && (
              <Link href="/painel/admin" className={ITEM + " text-gold-soft"}>Administração</Link>
            )}
            <Link href="/painel/configuracoes" className={ITEM + " text-muted hover:text-white"}>Configurações</Link>
            <LogoutButton variant="nav" />
          </nav>
          <div className="mt-4 shrink-0 border-t border-line pt-4">
            <p className="text-xs">
              Plano: <span className={user.plan === "pro" ? "font-semibold text-gold-soft" : "text-muted"}>{user.plan === "pro" ? "Pró" : "Grátis"}</span>
              {user.plan === "pro" && user.role !== "admin" && user.planExpiresAt ? <span className="text-muted"> {user.onTrial ? "(teste) " : ""}até {date(user.planExpiresAt)}</span> : null}
            </p>
          </div>
        </div>
      </MobileDrawer>
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
