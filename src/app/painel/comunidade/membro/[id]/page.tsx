import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMember, listFollows, listPosts, pinnedPostId } from "@/lib/feed";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FeedClient";
import { PostCard } from "@/components/PostCard";
import { date } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const user = await requireUser();
  const m = getMember(Number((await params).id), user.id);
  if (!m) notFound();
  const aba = (await searchParams).aba === "seguindo" ? "seguindo" : (await searchParams).aba === "seguidores" ? "seguidores" : "posts";
  const pinId = pinnedPostId(m.id);
  const pinned = pinId ? listPosts({ viewerId: user.id, authorId: m.id, onlyId: pinId }).posts[0] : undefined;
  const { posts } = aba === "posts" ? listPosts({ viewerId: user.id, authorId: m.id, limit: 20, excludeId: pinned?.id }) : { posts: [] };
  const follows = aba === "posts" ? [] : listFollows(m.id, aba === "seguindo" ? "following" : "followers", user.id);
  const viewer = { id: user.id, role: user.role, name: user.name };
  const base = `/painel/comunidade/membro/${m.id}`;
  const tab = (id: string, label: string) => (
    <Link key={id} href={id === "posts" ? base : `${base}?aba=${id}`} aria-current={aba === id ? "page" : undefined} className={`flex-1 border-b-2 px-4 py-3 text-center text-sm font-medium ${aba === id ? "border-gold text-white" : "border-transparent text-muted hover:text-white"}`}>{label}</Link>
  );
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
            <Link href={`${base}?aba=seguindo`} className="hover:underline"><strong>{m.following}</strong> <span className="text-muted">seguindo</span></Link>
            <Link href={`${base}?aba=seguidores`} className="hover:underline"><strong>{m.followers}</strong> <span className="text-muted">{m.followers === 1 ? "seguidor" : "seguidores"}</span></Link>
          </p>
        </div>
        <nav className="flex border-t border-line" aria-label="Seções do perfil">{tab("posts", "Publicações")}{tab("seguindo", "Seguindo")}{tab("seguidores", "Seguidores")}</nav>
      </section>
      {aba === "posts" ? (
        <div className="space-y-4">
          {pinned && <PostCard p={pinned} viewer={viewer} showPin />}
          {!pinned && posts.length === 0 && <p className="card p-6 text-sm text-muted">Nenhuma publicação ainda.</p>}
          {posts.map((p) => <PostCard key={p.id} p={p} viewer={viewer} showPin />)}
        </div>
      ) : (
        <ul className="card divide-y divide-line">
          {follows.length === 0 && <li className="p-6 text-sm text-muted">{aba === "seguindo" ? "Não segue ninguém ainda." : "Ainda não tem seguidores."}</li>}
          {follows.map((f) => (
            <li key={f.id} className="flex items-center gap-3 p-4">
              <Link href={`/painel/comunidade/membro/${f.id}`}><Avatar name={f.name} id={f.avatarId} size={44} /></Link>
              <div className="min-w-0 flex-1">
                <Link href={`/painel/comunidade/membro/${f.id}`} className="font-semibold hover:underline">{f.name}</Link>
                <p className="text-xs text-muted">@{f.handle}</p>
                {f.bio && <p className="mt-1 truncate text-sm text-muted">{f.bio}</p>}
              </div>
              {!f.isMe && <FollowButton userId={f.id} following={f.iFollow} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
