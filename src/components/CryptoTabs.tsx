"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; pro?: boolean }[] = [
  { href: "/painel/cripto", label: "Visão de mercado" },
  { href: "/painel/cripto/mercado", label: "Mercado" },
  { href: "/painel/cripto/defi", label: "HUB DEFI", pro: true },
  { href: "/painel/cripto/rwa", label: "RWA" },
  { href: "/painel/cripto/futuros", label: "Futuros" },
  { href: "/painel/cripto/etf", label: "ETFs de Cripto" },
  { href: "/painel/cripto/onchain", label: "Análise on Chain", pro: true },
  { href: "/painel/cripto/plataformas", label: "DEX e Plataformas DeFi" },
];

export function CryptoTabs() {
  const path = usePathname() || "";
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Seções de cripto">
      {TABS.map((t) => {
        const active = t.href === "/painel/cripto" ? path === t.href : path.startsWith(t.href);
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
