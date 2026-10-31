import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { findCategory, LEVELS, LINK_CATEGORIES, type Level } from "@/lib/links";

export const metadata = { title: "Links Essenciais" };

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

export default async function LinksPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await requireUser();
  if (user.plan !== "pro") {
    return (
      <>
        <PageTitle title="Links Essenciais" subtitle="Os sites que usamos para acompanhar cripto, DeFi e economia, organizados por categoria e importância." />
        <Locked feature="Links Essenciais" text="Este recurso faz parte do plano Pró. Assine para ver a seleção completa de sites, com para que serve cada um." />
      </>
    );
  }
  const cat = findCategory((await searchParams).c);

  return (
    <>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Categorias de links">
        {LINK_CATEGORIES.map((c) => {
          const active = c.slug === cat.slug;
          return (
            <Link key={c.slug} href={`/painel/links?c=${c.slug}`} aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${active ? "border-gold text-gold-soft" : "border-transparent text-muted hover:text-white"}`}>
              {c.label}
            </Link>
          );
        })}
      </nav>
      <PageTitle title={cat.label} subtitle={cat.intro} />

      {cat.links.length === 0 ? (
        <div className="card p-6 text-sm text-muted">Em breve: estamos reunindo os melhores links desta categoria.</div>
      ) : (
        ([1, 2, 3] as Level[]).map((lv) => {
          const items = cat.links.filter((l) => l.level === lv);
          if (!items.length) return null;
          return (
            <section key={lv} className="mb-8">
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className={`font-display text-lg font-bold ${lv === 1 ? "text-gold-soft" : "text-white"}`}>{LEVELS[lv].name}</h2>
                <span className="text-xs text-muted">{LEVELS[lv].hint} · {items.length}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                    className={`card block p-4 transition hover:border-gold/60 ${lv === 1 ? "border-gold/40" : ""}`}>
                    <p className="font-semibold text-white">{l.name} <span aria-hidden className="text-gold-soft">↗</span></p>
                    <p className="mt-1 text-sm text-muted">{l.use}</p>
                    <p className="mt-2 truncate text-xs text-gold-soft/80">{hostOf(l.url)}</p>
                  </a>
                ))}
              </div>
            </section>
          );
        })
      )}
      <p className="mt-2 text-xs text-muted">Sites de terceiros, sem vínculo com a NIZA INVEST. Confira sempre o endereço antes de conectar sua carteira, e nunca informe sua frase de recuperação.</p>
      <Disclaimer />
    </>
  );
}
