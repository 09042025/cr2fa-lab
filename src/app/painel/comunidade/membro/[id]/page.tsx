import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMember, listPosts } from "@/lib/feed";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { date } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const m = getMember(Number((await params).id));
  if (!m) notFound();
  const { posts } = listPosts({ viewerId: user.id, authorId: m.id, limit: 20 });
  return (
    <div className="mx-auto max-w-2xl">
      <section className="card mb-5 flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-left">
        <Avatar name={m.name} id={m.avatarId} size={96} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center justify-center gap-2 font-display text-2xl font-bold text-gold-soft sm:justify-start">
            {m.name}
            {m.isAdmin && <span className="rounded bg-gold/20 px-1.5 text-[10px] font-semibold uppercase text-gold-soft">Admin</span>}
          </h1>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted">{m.bio || "Este membro ainda não escreveu uma bio."}</p>
          <p className="mt-2 text-xs text-muted">Membro desde {date(m.since)} · {m.posts} {m.posts === 1 ? "publicação" : "publicações"}</p>
          {m.id === user.id && <Link href="/painel/configuracoes" className="btn btn-ghost mt-3 !py-1.5 text-sm">Editar meu perfil</Link>}
        </div>
      </section>
      <div className="space-y-4">
        {posts.length === 0 && <p className="card p-6 text-sm text-muted">Nenhuma publicação ainda.</p>}
        {posts.map((p) => <PostCard key={p.id} p={p} viewer={{ id: user.id, role: user.role, name: user.name }} />)}
      </div>
    </div>
  );
}
