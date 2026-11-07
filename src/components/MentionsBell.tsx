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

/** Sino dourado cheio, com relevo (luz no alto, sombra embaixo) e sombra projetada. */
function GoldBell() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden style={{ filter: "drop-shadow(0 2px 1.5px rgba(0,0,0,0.65))" }}>
      <defs>
        <linearGradient id="bell-g" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#fff3b8" /><stop offset="0.35" stopColor="#f0c24a" /><stop offset="0.7" stopColor="#c8901a" /><stop offset="1" stopColor="#8a5a08" />
        </linearGradient>
        <linearGradient id="bell-h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M9.4 19.4a2.6 2.6 0 0 0 5.2 0Z" fill="url(#bell-g)" stroke="#7a4f06" strokeWidth="0.5" />
      <path d="M12 2.5c-.9 0-1.6.7-1.6 1.5v.5C7.5 5.2 5.7 7.6 5.7 10.5v3.2c0 .9-.4 1.7-1 2.3l-.8.9c-.5.6-.1 1.6.7 1.6h14.8c.8 0 1.2-1 .7-1.6l-.8-.9c-.6-.6-1-1.4-1-2.3v-3.2c0-2.9-1.8-5.3-4.7-6V4c0-.8-.7-1.5-1.6-1.5Z" fill="url(#bell-g)" stroke="#7a4f06" strokeWidth="0.55" strokeLinejoin="round" />
      <path d="M8 10.2c0-1.9 1.1-3.5 2.9-4.2" fill="none" stroke="url(#bell-h)" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6.4 16.9h11.2" stroke="#7a4f06" strokeOpacity="0.45" strokeWidth="0.6" />
      <path d="M6.2 16.2h11.6" stroke="#fff3b8" strokeOpacity="0.5" strokeWidth="0.4" />
    </svg>
  );
}

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
      <button type="button" onClick={toggle} aria-label={unread > 0 ? `${unread} marcações novas` : "Marcações"} aria-expanded={open} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gold/60 bg-gradient-to-b from-[#1b2750] to-[#0a1233] shadow-[0_3px_8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,236,170,0.25),0_0_10px_rgba(217,165,32,0.25)] hover:brightness-110">
        <GoldBell />
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
