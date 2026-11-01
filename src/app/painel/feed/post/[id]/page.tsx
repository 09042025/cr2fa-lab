import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPosts } from "@/lib/feed";
import { PostCard } from "@/components/PostCard";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Publicação" };

/** Endereço fixo de uma publicação (usado no "Compartilhar"). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  const post = Number.isInteger(id) ? listPosts({ viewerId: user.id, onlyId: id, limit: 1 }).posts[0] : undefined;
  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-3 text-sm"><Link href="/painel/feed" className="text-muted hover:text-white">← Feed</Link></p>
      {post ? <PostCard p={post} viewer={{ id: user.id, role: user.role, name: user.name }} /> : (
        <>
          <PageTitle title="Publicação não encontrada" subtitle="Ela pode ter sido apagada ou vir de alguém que você bloqueou." />
          <Link href="/painel/feed" className="btn btn-gold">Voltar ao Feed</Link>
        </>
      )}
    </div>
  );
}
