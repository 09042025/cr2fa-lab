"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { compact, postUrl, shareTargets, shareText } from "@/lib/share";

const post = (body: unknown) => fetch("/api/community/feed", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const I = {
  comment: <path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 20.5l1.6-5.3A8.5 8.5 0 1 1 21 11.5Z" />,
  repost: <><path d="m17 2 4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="m7 22-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>,
  heart: <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21.7l8.8-8.7a5.2 5.2 0 0 0 0-7.4Z" />,
  views: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-8" /><path d="M22 20H2" /></>,
  bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z" />,
  share: <><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>,
};
const Icon = ({ d, fill = false }: { d: keyof typeof I; fill?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{I[d]}</svg>
);

const base = "group inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs transition";

// Visualizações: cada publicação é contada quando fica na tela por 1 segundo; envia em lotes.
const sent = new Set<number>();
let queue: number[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
function queueView(id: number) {
  if (sent.has(id)) return;
  sent.add(id);
  queue.push(id);
  if (timer) return;
  timer = setTimeout(() => {
    const ids = queue; queue = []; timer = null;
    void post({ action: "views", postIds: ids }).catch(() => {});
  }, 2000);
}

export function PostActions(props: {
  id: number; comments: number; reposts: number; reposted: boolean; likes: number; liked: boolean;
  views: number; bookmarked: boolean; own: boolean; author: string; body: string;
}) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [share, setShare] = useState(false);
  const [likers, setLikers] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { t = setTimeout(() => queueView(props.id), 1000); } else if (t) { clearTimeout(t); t = null; }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); if (t) clearTimeout(t); };
  }, [props.id]);

  async function act(action: "like" | "repost" | "bookmark") {
    await post({ action, postId: props.id });
    router.refresh();
  }

  return (
    <div ref={root} className="-mx-2 mt-3 flex items-center justify-between text-muted">
      <button type="button" className={`${base} hover:bg-sky-500/10 hover:text-sky-400`} aria-label={`${props.comments} comentários. Comentar`}
        onClick={() => { const i = document.getElementById(`comment-${props.id}`) as HTMLInputElement | null; i?.scrollIntoView({ block: "center", behavior: "smooth" }); i?.focus(); }}>
        <Icon d="comment" /><span>{compact(props.comments)}</span>
      </button>
      <button type="button" disabled={props.own} onClick={() => act("repost")} aria-pressed={props.reposted}
        title={props.own ? "Você não pode repostar a sua publicação" : props.reposted ? "Desfazer repost" : "Repostar"} aria-label={`${props.reposts} reposts. Repostar`}
        className={`${base} ${props.reposted ? "text-up" : "hover:bg-up/10 hover:text-up"} disabled:cursor-not-allowed disabled:opacity-50`}>
        <Icon d="repost" /><span>{compact(props.reposts)}</span>
      </button>
      <button type="button" onClick={() => (props.own ? setLikers(true) : act("like"))} aria-pressed={props.own ? undefined : props.liked}
        aria-label={props.own ? `${props.likes} curtidas. Ver quem curtiu` : `${props.likes} curtidas. Curtir`} title={props.own ? "Ver quem curtiu" : "Curtir"}
        className={`${base} ${props.liked ? "text-pink-400" : "hover:bg-pink-500/10 hover:text-pink-400"}`}>
        <Icon d="heart" fill={props.liked} /><span>{compact(props.likes)}</span>
      </button>
      <span className={`${base}`} title="Visualizações" aria-label={`${props.views} visualizações`}>
        <Icon d="views" /><span>{compact(props.views)}</span>
      </span>
      <span className="flex items-center">
        <button type="button" onClick={() => act("bookmark")} aria-pressed={props.bookmarked} aria-label={props.bookmarked ? "Remover dos salvos" : "Salvar"} title={props.bookmarked ? "Remover dos salvos" : "Salvar"}
          className={`${base} ${props.bookmarked ? "text-gold-soft" : "hover:bg-sky-500/10 hover:text-sky-400"}`}>
          <Icon d="bookmark" fill={props.bookmarked} />
        </button>
        <button type="button" onClick={() => setShare(true)} aria-label="Compartilhar" title="Compartilhar" className={`${base} hover:bg-sky-500/10 hover:text-sky-400`}>
          <Icon d="share" />
        </button>
      </span>
      {likers && <LikersSheet id={props.id} onClose={() => setLikers(false)} />}
      {share && <ShareSheet id={props.id} author={props.author} body={props.body} onClose={() => setShare(false)} />}
    </div>
  );
}

function ShareSheet({ id, author, body, onClose }: { id: number; author: string; body: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = postUrl(location.origin, id);
  const text = shareText(body, author);
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function copy() {
    try { await navigator.clipboard.writeText(url); } catch {
      const t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return createPortal(
    <div className="notranslate fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" translate="no" role="dialog" aria-modal="true" aria-label="Compartilhar publicação" onClick={onClose}>
      <div className="card w-full max-w-sm rounded-b-none p-4 sm:rounded-b-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Compartilhar</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="px-2 text-2xl leading-none text-muted hover:text-white">×</button>
        </div>
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-ink px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-xs text-muted">{url}</span>
          <button type="button" onClick={copy} className="btn btn-gold !px-3 !py-1 text-xs">{copied ? "Copiado!" : "Copiar link"}</button>
        </div>
        {canNative && (
          <button type="button" onClick={() => { void navigator.share({ title: "NIZA INVEST", text, url }).then(onClose).catch(() => {}); }} className="btn btn-ghost mb-3 w-full text-sm">Abrir os apps do meu aparelho…</button>
        )}
        <ul className="grid grid-cols-3 gap-2 text-center text-xs">
          {shareTargets(url, text).map((t) => (
            <li key={t.id}>
              <a href={t.href} target={t.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" onClick={onClose} className="block rounded-lg border border-line px-2 py-3 hover:border-gold/50 hover:text-gold-soft">{t.label}</a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Só quem tem conta no NIZA INVEST consegue abrir a publicação.</p>
      </div>
    </div>,
    document.body,
  );
}

interface Liker { id: number; name: string; handle: string; avatarId: number | null; isAdmin: boolean; iFollow: boolean; isMe: boolean }

/** Lista de quem curtiu (só o autor da publicação vê). */
function LikersSheet({ id, onClose }: { id: number; onClose: () => void }) {
  const [list, setList] = useState<Liker[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    fetch(`/api/community/feed?likes=${id}`, { cache: "no-store" }).then(async (r) => {
      const d = (await r.json().catch(() => null)) as { likers?: Liker[]; error?: string } | null;
      if (dead) return;
      if (!r.ok) setErr(d?.error ?? "Não foi possível carregar."); else setList(d?.likers ?? []);
    }).catch(() => { if (!dead) setErr("Não foi possível carregar."); });
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => { dead = true; window.removeEventListener("keydown", k); };
  }, [id, onClose]);

  return createPortal(
    <div className="notranslate fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Quem curtiu" onClick={onClose}>
      <div className="card flex max-h-[80vh] w-full max-w-sm flex-col rounded-b-none p-4 sm:rounded-b-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Curtido por</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="px-2 text-2xl leading-none text-muted hover:text-white">×</button>
        </div>
        {err && <p className="text-sm text-down">{err}</p>}
        {!err && list === null && <p className="text-sm text-muted">Carregando…</p>}
        {list && list.length === 0 && <p className="py-4 text-sm text-muted">Ninguém curtiu ainda. Você não pode curtir a sua própria publicação, mas pode ver aqui quem curtir.</p>}
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {(list ?? []).map((l) => (
            <li key={l.id}>
              <Link href={`/painel/feed/membro/${l.id}`} onClick={onClose} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-panel-2">
                <Avatar name={l.name} id={l.avatarId} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5"><span className="truncate text-sm font-semibold">{l.name}</span>{l.isAdmin && <span className="rounded bg-gold/20 px-1 text-[9px] font-semibold uppercase text-gold-soft">Admin</span>}</span>
                  <span className="block truncate text-xs text-muted">@{l.handle}</span>
                </span>
                {l.iFollow && <span className="text-xs text-muted">Seguindo</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
