"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/painel/comunidade", label: "Chat" },
  { href: "/painel/comunidade/lives", label: "Lives VIP", pro: true },
];

export function CommunityTabs(_props: { pro?: boolean }) {
  const path = usePathname() || "";
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Seções da comunidade">
      {TABS.map((t) => {
        const active = t.href === "/painel/comunidade" ? path === t.href : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${active ? "border-gold text-gold-soft" : "border-transparent text-muted hover:text-white"}`}>
            {t.label}{t.pro && <span className="ml-1.5 rounded bg-gold/20 px-1 text-[9px] font-semibold uppercase text-gold-soft">Pró</span>}
          </Link>
        );
      })}
    </nav>
  );
}
