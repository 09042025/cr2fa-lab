import Link from "next/link";
import { Avatar } from "./Avatar";
import { BanButton, BlockButton } from "./CommunityChat";
import { CommentForm, DeleteItem, LikeButton, PinButton, ReportPost } from "./FeedClient";
import { MAX_COMMENT, topicLabel, type Post } from "@/lib/feed";
import { REPORT_REASONS } from "@/lib/community";
import { RichText } from "./RichText";
import { LinkPreview } from "./LinkPreview";

const when = (t: number) => new Date(t * 1000).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

const Text = RichText;

export function PostCard({ p, viewer, showPin = false }: { p: Post; viewer: { id: number; role: string; name: string }; showPin?: boolean }) {
  const isAdmin = viewer.role === "admin";
  const first = viewer.name.split(" ")[0].toLowerCase();
  return (
    <article className="card p-4">
      {p.pinned && showPin && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-gold"><path d="M16 3a1 1 0 0 1 .7 1.7L15.4 6l.6 5 2.4 2.4a1 1 0 0 1-.7 1.6H13v5a1 1 0 0 1-2 0v-5H6.3a1 1 0 0 1-.7-1.7L8 11l.6-5-1.3-1.3A1 1 0 0 1 8 3h8Z" /></svg>
          Fixado
        </p>
      )}
      <header className="flex items-center gap-3">
        <Link href={`/painel/feed/membro/${p.userId}`}><Avatar name={p.author} id={p.authorAvatar} size={40} /></Link>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <Link href={`/painel/feed/membro/${p.userId}`} className="font-semibold hover:underline">{p.author}</Link>
            {p.authorIsAdmin && <span className="rounded bg-gold/20 px-1.5 text-[10px] font-semibold uppercase text-gold-soft">Admin</span>}
            {p.authorBanned && <span className="rounded bg-down/20 px-1.5 text-[10px] font-semibold uppercase text-down">Suspenso</span>}
          </p>
          <p className="text-xs text-muted">{when(p.createdAt)}</p>
        </div>
        <Link href={`/painel/feed?t=${p.topic}`} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted hover:border-gold/50">{topicLabel(p.topic)}</Link>
      </header>
      {p.body && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6"><Text body={p.body} first={first} /></p>}
      {p.body && <LinkPreview text={p.body} />}
      {p.imageId && (
        <a href={`/api/community/image?id=${p.imageId}`} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/community/image?id=${p.imageId}`} alt={`Imagem publicada por ${p.author}`} loading="lazy" className="mt-3 max-h-[28rem] max-w-full rounded-lg border border-line" />
        </a>
      )}
      <footer className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <LikeButton id={p.id} count={p.likes} liked={p.liked} />
        <span className="text-xs text-muted">{p.comments.length} {p.comments.length === 1 ? "comentário" : "comentários"}</span>
        <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
          {p.userId === viewer.id && <PinButton postId={p.id} pinned={p.pinned} />}
          {(isAdmin || p.userId === viewer.id) && <DeleteItem id={p.id} kind="post" />}
          {p.userId !== viewer.id && <ReportPost postId={p.id} reasons={REPORT_REASONS} />}
          {p.userId !== viewer.id && !p.authorIsAdmin && <BlockButton userId={p.userId} />}
          {isAdmin && !p.authorIsAdmin && p.userId !== viewer.id && <BanButton userId={p.userId} banned={p.authorBanned} />}
        </span>
      </footer>
      <div className="mt-3 border-t border-line pt-3">
        <ul className="space-y-2">
          {p.comments.map((c) => (
            <li key={c.id} className="flex gap-2 text-sm">
              <Avatar name={c.author} id={c.authorAvatar} size={26} />
              <p className="min-w-0 flex-1 break-words rounded-lg bg-panel-2 px-3 py-1.5">
                <Link href={`/painel/feed/membro/${c.userId}`} className="font-semibold hover:underline">{c.author}</Link>
                {c.authorIsAdmin && <span className="ml-1 rounded bg-gold/20 px-1 text-[9px] font-semibold uppercase text-gold-soft">Admin</span>}{" "}
                <span className="whitespace-pre-wrap text-muted"><Text body={c.body} first={first} /></span>
                <span className="ml-2 text-[11px] text-muted/70">{when(c.createdAt)}</span>
                {(isAdmin || c.userId === viewer.id) && <span className="ml-2"><DeleteItem id={c.id} kind="comment" /></span>}
              </p>
            </li>
          ))}
        </ul>
        <CommentForm postId={p.id} max={MAX_COMMENT} />
      </div>
    </article>
  );
}
