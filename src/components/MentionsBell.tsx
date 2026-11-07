"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "./Avatar";

function ago(t: number): string {
  const m = Math.max(0, Math.floor((Date.now() / 1000 - t) / 60));
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

interface Item { id: number; byId: number; by: string; avatarId: number | null; kind: string; postId: number; snippet: string; createdAt: number; read: boolean }

/** Sininho amarelo: avisa quando alguém marca você com @ num post ou comentário. */
export function MentionsBell({ className = "" }: { className?: string }) {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);

  const count = useCallback(async () => {
    const r = await fetch("/api/community/mentions?count=1").then((x) => x.json()).catch(() => null);
    if (r && typeof r.unread === "number") setUnread(r.unread);
  }, []);
  useEffect(() => {
    void count();
    const t = setInterval(() => { if (!document.hidden) void count(); }, 60_000);
    return () => clearInterval(t);
  }, [count]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setItems(null);
    const r = await fetch("/api/community/mentions").then((x) => x.json()).catch(() => null);
    setItems(r?.items ?? []);
    if ((r?.unread ?? 0) > 0) {
      await fetch("/api/community/mentions", { method: "POST" }).catch(() => null);
      setUnread(0);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button type="button" onClick={toggle} aria-label={unread > 0 ? `${unread} marcações novas` : "Marcações"} aria-expanded={open} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line text-gold hover:bg-panel-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill={unread > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-gold px-1 text-center text-[11px] font-bold leading-[18px] text-ink">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-panel shadow-xl" role="dialog" aria-label="Marcações">
            <p className="border-b border-line px-4 py-3 text-sm font-bold text-white">Marcações</p>
            <div className="max-h-[60vh] overflow-y-auto">
              {items === null && <p className="p-4 text-sm text-muted">Carregando…</p>}
              {items?.length === 0 && <p className="p-4 text-sm text-muted">Ninguém marcou você ainda.</p>}
              {(items ?? []).map((m) => (
                <Link key={m.id} href={`/painel/feed/post/${m.postId}`} onClick={() => setOpen(false)} className={`flex gap-3 border-b border-line/60 px-4 py-3 hover:bg-panel-2 ${m.read ? "" : "bg-gold/10"}`}>
                  <Avatar name={m.by} id={m.avatarId} size={36} />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold text-white">{m.by}</span> <span className="text-muted">marcou você {m.kind === "comment" ? "em um comentário" : "em um post"} · {ago(m.createdAt)}</span>
                    <span className="mt-0.5 block truncate text-muted">{m.snippet}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
