"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VipSeal } from "./WfmShell";

const TABS = [
  { href: "/painel/black", label: "Visão geral", vip: false },
  { href: "/painel/black/protocolo", label: "Protocolo", vip: true },
  { href: "/painel/black/jornada", label: "Jornada", vip: true },
  { href: "/painel/black/radar", label: "Radar", vip: true },
  { href: "/painel/black/doutrina", label: "Doutrina", vip: true },
  { href: "/painel/black/juramento", label: "Juramento", vip: true },
  { href: "/painel/black/ciclo", label: "Ciclo", vip: true },
];

/** Abas internas do Black Diamond VIP. As três da White Flame levam o selo VIP. */
export function WfsTabs() {
  const path = usePathname() || "";
  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-gold/30" aria-label="Seções do Black Diamond VIP">
      {TABS.map((t) => {
        const active = t.href === "/painel/black" ? path === t.href : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${active ? "border-gold text-gold-soft" : "border-transparent text-muted hover:text-white"}`}>
            {t.label}{t.vip && <VipSeal />}
          </Link>
        );
      })}
    </nav>
  );
}
