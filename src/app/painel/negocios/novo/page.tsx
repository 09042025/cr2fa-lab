import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Locked, PageTitle } from "@/components/ui";
import { ListingForm } from "@/components/Business";
import { CATEGORIES, MAX_LISTINGS, STATES, countMine, getListing } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  if (user.plan !== "pro" && !isAdmin) return <Locked feature="Negócios (exclusivo do plano Premium)" />;
  const sp = await searchParams;
  const l = sp.id ? getListing(Number(sp.id)) : null;
  if (sp.id && (!l || (l.userId !== user.id && !isAdmin))) return <p className="text-sm text-muted">Anúncio não encontrado. <Link href="/painel/negocios" className="underline">Voltar</Link></p>;
  if (!l && !isAdmin && countMine(user.id) >= MAX_LISTINGS) {
    return <><PageTitle title="Anunciar meu negócio" /><p className="card p-5 text-sm text-muted">Você já tem {MAX_LISTINGS} anúncios, o limite por membro. Apague ou edite um deles em <Link href="/painel/negocios" className="underline">Negócios</Link>.</p></>;
  }
  return (
    <>
      <p className="mb-3 text-sm"><Link href="/painel/negocios" className="text-muted underline hover:text-white">← Voltar para Negócios</Link></p>
      <PageTitle title={l ? "Editar anúncio" : "Anunciar meu negócio"} subtitle="Serviço ou produto: quanto mais completo, com cases e nota do Google, mais confiança você passa." />
      <ListingForm categories={CATEGORIES} states={STATES} initial={{
        id: l?.id, kind: l?.kind ?? "service", category: l?.category ?? CATEGORIES[0].id, title: l?.title ?? "", description: l?.description ?? "",
        city: l?.city ?? "", state: l?.state ?? "", priceNote: l?.priceNote ?? "", whatsapp: l?.whatsapp ?? "", instagram: l?.instagram ?? "", website: l?.website ?? "",
        googleRating: l?.googleRating != null ? String(l.googleRating).replace(".", ",") : "", googleUrl: l?.googleUrl ?? "", cases: l?.cases ?? [],
      }} />
    </>
  );
}
