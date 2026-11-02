import Link from "next/link";
import { catLabel, type Listing } from "@/lib/business";

export const BIZ_DISCLAIMER =
  "A plataforma apenas divulga os negócios dos membros: não intermedeia a contratação, não recebe valores e não garante o resultado de nenhum serviço ou produto. Antes de fechar, avalie o histórico, peça cases e referências, converse com membros que já contrataram ou compraram e nunca pague adiantado sem confiança.";

export function Stars({ rating }: { rating: number }) {
  return <span className="font-semibold text-gold-soft" aria-label={`Nota ${rating} de 5`}>★ {rating.toFixed(1).replace(".", ",")}</span>;
}

export function Trust({ l }: { l: Listing }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      {l.googleRating !== null && <span><Stars rating={l.googleRating} /> no Google <span className="text-muted/70">(informada pelo anunciante)</span></span>}
      <span className={l.recs ? "text-up" : ""}>{l.recs} indicaç{l.recs === 1 ? "ão" : "ões"} de membros</span>
      {l.hired > 0 && <span>{l.hired} já contrataram/compraram</span>}
      {l.cases.length > 0 && <span>{l.cases.length} case{l.cases.length > 1 ? "s" : ""}</span>}
    </p>
  );
}

export function ListingCard({ l }: { l: Listing }) {
  return (
    <Link href={`/painel/negocios/${l.id}`} className="card group block space-y-2 border-gold/15 p-4 transition hover:border-gold/50">
      <p className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide">
        <span className={`rounded-md px-1.5 py-0.5 font-bold ${l.kind === "product" ? "bg-up/15 text-up" : "bg-gold/15 text-gold-soft"}`}>{l.kind === "product" ? "Produto" : "Serviço"}</span>
        <span className="text-muted">{catLabel(l.category)}</span>
      </p>
      <h3 className="font-display text-base font-bold text-white group-hover:text-gold-soft">{l.title}</h3>
      <p className="line-clamp-3 text-sm text-muted">{l.description}</p>
      <p className="text-xs text-muted">{l.owner}{l.city || l.state ? ` · ${[l.city, l.state].filter(Boolean).join("/")}` : " · online"}{l.priceNote ? ` · ${l.priceNote}` : ""}</p>
      <Trust l={l} />
    </Link>
  );
}
