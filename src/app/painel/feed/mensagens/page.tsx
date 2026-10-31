import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DirectMessages } from "@/components/DirectMessages";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mensagens" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ com?: string }> }) {
  await requireUser();
  const com = Number((await searchParams).com);
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="Mensagens" subtitle="Converse em particular com outros membros: texto, fotos e áudios." />
      <p className="mb-4 text-sm"><Link href="/painel/feed" className="text-gold-soft underline">← Voltar ao Feed</Link></p>
      <DirectMessages startWith={Number.isInteger(com) && com > 0 ? com : null} />
      <p className="mt-3 text-xs text-muted">Nunca envie senhas, frases de recuperação de carteira nem faça pagamentos a pedido de desconhecidos. Bloqueie quem insistir.</p>
    </div>
  );
}
