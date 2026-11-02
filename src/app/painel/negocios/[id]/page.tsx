import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Locked, PageTitle } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { BIZ_DISCLAIMER, Trust } from "@/components/BizBits";
import { ListingActions, RecForm, RemoveRec } from "@/components/Business";
import { catLabel, getListing, listRecs, listReports } from "@/lib/business";

export const dynamic = "force-dynamic";
const when = (t: number) => new Date(t * 1000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  if (user.plan !== "pro" && !isAdmin) return <Locked feature="Negócios (exclusivo do plano Premium)" />;
  const l = getListing(Number((await params).id));
  if (!l) notFound();
  const recs = listRecs(l.id);
  const mine = recs.find((r) => r.userId === user.id);
  const isOwner = l.userId === user.id;
  const reports = isAdmin ? listReports(l.id) : [];
  const wa = l.whatsapp ? `https://wa.me/${l.whatsapp.length <= 11 ? "55" + l.whatsapp : l.whatsapp}?text=${encodeURIComponent(`Olá! Vi o seu anúncio "${l.title}" na White Flame Society.`)}` : "";
  const btn = "rounded-lg px-4 py-2 text-sm font-semibold";

  return (
    <>
      <p className="mb-3 text-sm"><Link href="/painel/negocios" className="text-muted underline hover:text-white">← Voltar para Negócios</Link></p>
      <PageTitle title={l.title} subtitle={`${l.kind === "product" ? "Produto" : "Serviço"} · ${catLabel(l.category)} · ${[l.city, l.state].filter(Boolean).join("/") || "online / todo o Brasil"}${l.priceNote ? ` · ${l.priceNote}` : ""}`} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="card space-y-3 border-gold/20 p-5">
            <Trust l={l} />
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{l.description}</p>
            <p className="flex items-center gap-2 text-xs text-muted"><Avatar name={l.owner} id={null} size={24} /> Anunciado por <Link href={`/painel/feed/membro/${l.userId}`} className="text-white underline">{l.owner}</Link> em {when(l.createdAt)}</p>
            <ListingActions id={l.id} canEdit={isOwner || isAdmin} canReport={!isOwner} />
          </section>

          <section className="card space-y-3 border-gold/20 p-5">
            <h2 className="font-display text-lg font-bold text-gold-soft">Cases de sucesso</h2>
            {l.cases.length === 0 ? <p className="text-sm text-muted">O anunciante ainda não cadastrou cases. Peça exemplos e referências antes de contratar.</p> : (
              <ul className="space-y-3">{l.cases.map((c, i) => (
                <li key={i} className="rounded-lg border border-line p-3 text-sm">
                  <p className="font-semibold text-white">{c.title}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-muted">{c.text}</p>
                  {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-block text-xs text-gold-soft underline">ver comprovação ↗</a>}
                </li>
              ))}</ul>
            )}
          </section>

          <section className="card space-y-3 border-gold/20 p-5">
            <h2 className="font-display text-lg font-bold text-gold-soft">Indicações de membros ({recs.length})</h2>
            {recs.length === 0 && <p className="text-sm text-muted">Ainda não há indicações. Se você já contratou ou comprou, conte como foi.</p>}
            <ul className="space-y-3">{recs.map((r) => (
              <li key={r.id} className="rounded-lg border border-line p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2"><Link href={`/painel/feed/membro/${r.userId}`} className="font-semibold text-white hover:underline">{r.author}</Link>
                  {r.hired && <span className="rounded bg-up/15 px-1.5 text-[10px] font-bold uppercase text-up">Já contratou/comprou</span>}
                  <span className="text-xs text-muted">{when(r.createdAt)}</span>
                  {(r.userId === user.id || isAdmin) && <RemoveRec id={r.id} />}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-muted">{r.comment}</p>
              </li>
            ))}</ul>
            {!isOwner && <RecForm listingId={l.id} mine={mine ? { hired: mine.hired, comment: mine.comment } : undefined} />}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card space-y-3 border-gold/20 p-5">
            <h2 className="font-display text-lg font-bold text-gold-soft">Contato</h2>
            <div className="flex flex-col gap-2">
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btn} bg-up/20 text-center text-up hover:bg-up/30`}>Chamar no WhatsApp</a>}
              {l.instagram && <a href={`https://instagram.com/${l.instagram}`} target="_blank" rel="noopener noreferrer" className={`${btn} border border-line text-center text-white hover:border-gold/50`}>Instagram @{l.instagram}</a>}
              {l.website && <a href={l.website} target="_blank" rel="noopener noreferrer nofollow" className={`${btn} border border-line text-center text-white hover:border-gold/50`}>Visitar o site</a>}
              {l.googleUrl && <a href={l.googleUrl} target="_blank" rel="noopener noreferrer nofollow" className={`${btn} border border-line text-center text-white hover:border-gold/50`}>Conferir perfil no Google{l.googleRating !== null ? ` (★ ${l.googleRating.toFixed(1).replace(".", ",")})` : ""}</a>}
            </div>
          </section>
          <section className="rounded-xl border border-down/40 bg-down/5 p-4 text-xs leading-relaxed text-muted">
            <p className="mb-1 font-semibold text-white">Antes de contratar</p>
            <p>{BIZ_DISCLAIMER}</p>
          </section>
          {isAdmin && reports.length > 0 && (
            <section className="rounded-xl border border-down/40 p-4 text-xs text-muted">
              <p className="mb-1 font-semibold text-down">Denúncias ({reports.length})</p>
              <ul className="space-y-1">{reports.map((r, i) => <li key={i}><strong className="text-white">{r.author}</strong>: {r.reason}</li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
