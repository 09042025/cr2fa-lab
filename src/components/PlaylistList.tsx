"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SortableList } from "./SortableList";

interface P { id: number; title: string; description: string; lessons: number; rec?: boolean }

/** Lista de playlists da Masterclass. O administrador reordena arrastando a alça ⠿. */
export function PlaylistList({ playlists, admin }: { playlists: P[]; admin: boolean }) {
  const router = useRouter();
  async function onReorder(ids: number[]) {
    await fetch("/api/courses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reorder", kind: "playlist", ids }) }).catch(() => null);
    router.refresh();
  }
  const card = (p: P, handle?: React.ReactNode) => (
    <div className="card flex items-start gap-3 p-4">
      <div className="min-w-0 flex-1">
        <Link href={`/painel/cursos/${p.id}`} className="font-display text-lg font-bold text-gold-soft hover:underline">{p.title}</Link>{p.rec && <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-gold-soft">Para o seu perfil</span>}
        {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
        <p className="mt-2 text-xs text-muted">{p.lessons} {p.lessons === 1 ? "aula" : "aulas"} · <Link href={`/painel/cursos/${p.id}`} className="text-gold-soft hover:underline">Abrir →</Link></p>
      </div>
      {handle}
    </div>
  );
  if (!admin) return <ul className="space-y-3">{playlists.map((p) => <li key={p.id}>{card(p)}</li>)}</ul>;
  return (
    <>
      <p className="mb-2 text-xs text-muted">Segure e arraste a alça ⠿ para mudar a ordem.</p>
      <SortableList items={playlists} onReorder={onReorder} render={(p, handle) => card(p, handle)} />
    </>
  );
}
