"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/painel/comunidade", label: "Chat" },
  { href: "/painel/comunidade/lives", label: "Lives VIP" },
  { href: "/painel/cursos", label: "Cursos" },
  { href: "/painel/links", label: "Links Essenciais" },
  { href: "/painel/portfolio", label: "Portfólio" },
  { href: "/painel/financiamento", label: "Financiamentos" },
  { href: "/painel/protocolo", label: "Protocolo CR2FA" },
];
const AREA = ["/painel/comunidade", "/painel/cursos", "/painel/links", "/painel/portfolio", "/painel/financiamento", "/painel/protocolo"];

/** Abas da área Pró (Comunidade): aparecem em todas as páginas dela. */
export function CommunityTabs(_props: { pro?: boolean }) {
  const path = usePathname() || "";
  if (!AREA.some((a) => path === a || path.startsWith(a + "/"))) return null;
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Seções da Comunidade">
      {TABS.map((t) => {
        const active = t.href === "/painel/comunidade" ? path === t.href : path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${active ? "border-gold text-gold-soft" : "border-transparent text-muted hover:text-white"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
