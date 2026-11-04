import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMember, listFollows, listPosts, pinnedPostId } from "@/lib/feed";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FeedClient";
import { PostCard } from "@/components/PostCard";
import { RichText } from "@/components/RichText";
import { date } from "@/lib/format";
import { CashpillButton, CashpillGrid } from "@/components/Cashpills";
import { listCashpills, listPhotos } from "@/lib/cashpills";
import { ProfilePanes, type PaneTab } from "@/components/ProfilePanes";

export const dynamic = "force-dynamic";

export default async function MemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const user = await requireUser();
  const m = getMember(Number((await params).id), user.id);
  if (!m) notFound();
  const abaQ = (await searchParams).aba;
  const aba = abaQ === "seguindo" || abaQ === "seguidores" ? abaQ : abaQ === "fotos" || abaQ === "cashpills" ? abaQ : "posts";
  const lista = aba === "seguindo" || aba === "seguidores";
  const pinId = pinnedPostId(m.id);
  const pinned = pinId ? listPosts({ viewerId: user.id, authorId: m.id, onlyId: pinId }).posts[0] : undefined;
  const { posts } = lista ? { posts: [] } : listPosts({ viewerId: user.id, authorId: m.id, limit: 20, excludeId: pinned?.id });
  const follows = lista ? listFollows(m.id, aba === "seguindo" ? "following" : "followers", user.id) : [];
  const photos = lista ? [] : listPhotos(m.id);
  const pills = lista ? [] : listCashpills(m.id);
  const viewer = { id: user.id, role: user.role, name: user.name };
  const base = `/painel/feed/membro/${m.id}`;
  const host = m.website ? new URL(m.website).hostname.replace(/^www\./, "") : "";
  const header = (
    <>
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
            {m.id === user.id ? <Link href="/painel/configuracoes" className="btn btn-ghost">Editar perfil</Link> : <div className="flex gap-2"><Link href={`/painel/feed/mensagens?com=${m.id}`} className="btn btn-ghost">Mensagem</Link><FollowButton userId={m.id} following={m.iFollow} /></div>}
          </div>
        </div>
        <h1 className="mt-3 flex flex-wrap items-center gap-2 text-xl font-bold">
          {m.name}
          {m.isAdmin && <span className="rounded bg-gold/20 px-1.5 text-[10px] font-semibold uppercase text-gold-soft">Admin</span>}
          {m.banned && <span className="rounded bg-down/20 px-1.5 text-[10px] font-semibold uppercase text-down">Suspenso</span>}
        </h1>
        <p className="text-sm text-muted">@{m.handle}</p>
        {m.bio && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6"><RichText body={m.bio} /></p>}
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
    </>
  );

  if (lista) {
    return (
      <div className="mx-auto max-w-2xl">
        <section className="card mb-5 overflow-hidden">
          {header}
          <nav className="border-t border-line px-5 py-3 text-sm"><Link href={base} className="text-gold-soft underline">← Voltar ao perfil</Link> <span className="ml-3 font-semibold">{aba === "seguindo" ? "Seguindo" : "Seguidores"}</span></nav>
        </section>
        <ul className="card divide-y divide-line">
          {follows.length === 0 && <li className="p-6 text-sm text-muted">{aba === "seguindo" ? "Não segue ninguém ainda." : "Ainda não tem seguidores."}</li>}
          {follows.map((f) => (
            <li key={f.id} className="flex items-center gap-3 p-4">
              <Link href={`/painel/feed/membro/${f.id}`}><Avatar name={f.name} id={f.avatarId} size={44} /></Link>
              <div className="min-w-0 flex-1">
                <Link href={`/painel/feed/membro/${f.id}`} className="font-semibold hover:underline">{f.name}</Link>
                <p className="text-xs text-muted">@{f.handle}</p>
                {f.bio && <p className="mt-1 truncate text-sm text-muted">{f.bio}</p>}
              </div>
              {!f.isMe && <FollowButton userId={f.id} following={f.iFollow} />}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const tabs: PaneTab[] = [
    {
      id: "posts", label: "Publicações", node: (
        <div className="space-y-4">
          {pinned && <PostCard p={pinned} viewer={viewer} showPin />}
          {!pinned && posts.length === 0 && <p className="card p-6 text-sm text-muted">Nenhuma publicação ainda.</p>}
          {posts.map((p) => <PostCard key={p.id} p={p} viewer={viewer} showPin />)}
        </div>
      ),
    },
    {
      id: "fotos", label: "Fotos", node: photos.length === 0 ? <p className="card p-6 text-sm text-muted">Nenhuma foto ainda.</p> : (
        <ul className="grid grid-cols-3 gap-1.5">
          {photos.map((f) => (
            <li key={f.postId}>
              <Link href={`/painel/feed/post/${f.postId}`} className="block aspect-square overflow-hidden rounded-lg border border-line bg-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/community/image?id=${f.imageId}`} alt="Foto publicada" loading="lazy" className="h-full w-full object-cover" />
              </Link>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "cashpills", label: pills.length ? `Cashpills (${pills.length})` : "Cashpills", node: (
        <div className="space-y-3">
          {m.id === user.id && <div className="flex items-center gap-3"><CashpillButton /><span className="text-xs text-muted">Vídeos curtos de 15, 30, 45 ou 60 segundos.</span></div>}
          <CashpillGrid pills={pills} canDelete={m.id === user.id || user.role === "admin"} />
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <ProfilePanes header={header} tabs={tabs} initial={aba} />
    </div>
  );
}
