import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMember, listPosts } from "@/lib/feed";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FeedClient";
import { PostCard } from "@/components/PostCard";
import { date } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const m = getMember(Number((await params).id), user.id);
  if (!m) notFound();
  const { posts } = listPosts({ viewerId: user.id, authorId: m.id, limit: 20 });
  const host = m.website ? new URL(m.website).hostname.replace(/^www\./, "") : "";
  return (
    <div className="mx-auto max-w-2xl">
      <section className="card mb-5 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-panel-2 to-ink sm:h-40">
          {m.bannerId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/community/image?id=${m.bannerId}`} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between gap-3">
            <div className="-mt-12 rounded-full border-4 border-panel bg-panel"><Avatar name={m.name} id={m.avatarId} size={96} /></div>
            <div className="pb-1">
              {m.id === user.id ? <Link href="/painel/configuracoes" className="btn btn-ghost">Editar perfil</Link> : <FollowButton userId={m.id} following={m.iFollow} />}
            </div>
          </div>
          <h1 className="mt-3 flex flex-wrap items-center gap-2 text-xl font-bold">
            {m.name}
            {m.isAdmin && <span className="rounded bg-gold/20 px-1.5 text-[10px] font-semibold uppercase text-gold-soft">Admin</span>}
            {m.banned && <span className="rounded bg-down/20 px-1.5 text-[10px] font-semibold uppercase text-down">Suspenso</span>}
          </h1>
          <p className="text-sm text-muted">@{m.handle}</p>
          {m.bio && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{m.bio}</p>}
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {m.location && <span>📍 {m.location}</span>}
            {m.website && <a href={m.website} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-gold-soft underline">🔗 {host}</a>}
            <span>Membro desde {date(m.since)}</span>
          </p>
          <p className="mt-3 flex gap-5 text-sm">
            <span><strong>{m.posts}</strong> <span className="text-muted">{m.posts === 1 ? "publicação" : "publicações"}</span></span>
            <span><strong>{m.following}</strong> <span className="text-muted">seguindo</span></span>
            <span><strong>{m.followers}</strong> <span className="text-muted">{m.followers === 1 ? "seguidor" : "seguidores"}</span></span>
          </p>
        </div>
      </section>
      <div className="space-y-4">
        {posts.length === 0 && <p className="card p-6 text-sm text-muted">Nenhuma publicação ainda.</p>}
        {posts.map((p) => <PostCard key={p.id} p={p} viewer={{ id: user.id, role: user.role, name: user.name }} />)}
      </div>
    </div>
  );
}
