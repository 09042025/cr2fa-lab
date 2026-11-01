"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import { compact } from "@/lib/share";

interface Person { id: number; name: string; handle: string; bio: string; avatarId: number | null; followers: number; iFollow: boolean; isAdmin: boolean }

/** Busca de membros (como o Search do X): por nome ou @usuário, com botão Seguir; sem texto, sugere quem seguir. */
export function PeopleSearch() {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const r = await fetch(`/api/community/feed?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal, cache: "no-store" }).catch(() => null);
      if (!r) return;
      const d = (await r.json().catch(() => null)) as { people?: Person[]; error?: string } | null;
      if (!r.ok) return setErr(d?.error ?? "Não foi possível buscar.");
      setErr("");
      setPeople(d?.people ?? []);
    }, q.trim() ? 250 : 0);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  async function toggle(p: Person) {
    setPeople((l) => l?.map((x) => (x.id === p.id ? { ...x, iFollow: !x.iFollow, followers: x.followers + (x.iFollow ? -1 : 1) } : x)) ?? l);
    const r = await fetch("/api/community/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: p.id, follow: !p.iFollow }) });
    if (!r.ok) setPeople((l) => l?.map((x) => (x.id === p.id ? p : x)) ?? l);
    router.refresh();
  }

  const typing = q.trim().length > 0;
  return (
    <div ref={box} className="relative mb-4">
      <label className="sr-only" htmlFor="people-search">Buscar membros</label>
      <div className="flex items-center gap-2 rounded-full border border-line bg-panel px-4 focus-within:border-gold/60">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="shrink-0 text-muted"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input id="people-search" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Buscar membros para seguir (nome ou @usuário)" autoComplete="off" maxLength={40} className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none focus:outline-none" />
        {q && <button type="button" onClick={() => { setQ(""); setOpen(true); }} aria-label="Limpar busca" className="px-1 text-lg leading-none text-muted hover:text-white">×</button>}
      </div>
      {open && (
        <div className="card absolute inset-x-0 top-full z-30 mt-2 max-h-[26rem] overflow-y-auto p-2 shadow-xl">
          <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">{typing ? "Membros" : "Quem seguir"}</p>
          {err && <p className="px-2 py-3 text-sm text-down">{err}</p>}
          {!err && people === null && <p className="px-2 py-3 text-sm text-muted">Buscando…</p>}
          {!err && people !== null && people.length === 0 && (
            <p className="px-2 py-3 text-sm text-muted">{typing && q.trim().length < 2 ? "Digite pelo menos 2 letras." : typing ? "Nenhum membro encontrado." : "Você já segue todo mundo por aqui."}</p>
          )}
          <ul>
            {(people ?? []).map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-panel-2">
                <Link href={`/painel/feed/membro/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3" onClick={() => setOpen(false)}>
                  <Avatar name={p.name} id={p.avatarId} size={40} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5"><span className="truncate text-sm font-semibold">{p.name}</span>{p.isAdmin && <span className="rounded bg-gold/20 px-1 text-[9px] font-semibold uppercase text-gold-soft">Admin</span>}</span>
                    <span className="block truncate text-xs text-muted">@{p.handle} · {compact(p.followers)} {p.followers === 1 ? "seguidor" : "seguidores"}</span>
                    {p.bio && <span className="block truncate text-xs text-muted/80">{p.bio}</span>}
                  </span>
                </Link>
                <button type="button" onClick={() => toggle(p)} className={`shrink-0 ${p.iFollow ? "btn btn-ghost" : "btn btn-gold"} !px-3 !py-1.5 text-xs`}>{p.iFollow ? "Seguindo" : "Seguir"}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
