import Link from "next/link";
import { TOPICS } from "@/lib/news";

export function NewsTabs({ active }: { active: string }) {
  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-line" aria-label="Temas das notícias">
      {TOPICS.map((t) => (
        <Link key={t.id} href={`/painel/comunidade/noticias?t=${t.id}`} aria-current={t.id === active ? "page" : undefined}
          className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition ${t.id === active ? "border-gold text-gold-soft" : "border-transparent text-muted hover:text-white"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
