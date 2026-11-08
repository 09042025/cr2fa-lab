"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function call(body: unknown): Promise<string | null> {
  const r = await fetch("/api/courses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  if (!r) return "Sem conexão.";
  if (r.ok) return null;
  return (await r.json().catch(() => null))?.error ?? "Não foi possível salvar.";
}

/** Administrador: nova playlist (na lista da Masterclass). */
export function NewPlaylist() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const e2 = await call({ action: "playlist-add", title, description });
    setBusy(false);
    if (e2) return setErr(e2);
    setTitle(""); setDescription(""); router.refresh();
  }
  return (
    <form onSubmit={add} className="card mb-6 space-y-3 p-4">
      <h2 className="text-sm font-bold text-gold-soft">Nova playlist (administrador)</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Ex.: Ações, Fundos imobiliários, Cripto…" aria-label="Nome da playlist" className="input w-full" />
      <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="Descrição curta (opcional)" aria-label="Descrição" className="input w-full" />
      {err && <p className="text-xs text-down">{err}</p>}
      <button className="btn btn-gold" disabled={busy || !title.trim()}>{busy ? "…" : "Criar playlist"}</button>
    </form>
  );
}

/** Administrador: renomear, apagar e subir/descer a playlist. */
export function PlaylistTools({ id, title, description }: { id: number; title: string; description: string }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [t, setT] = useState(title);
  const [d, setD] = useState(description);
  const [err, setErr] = useState("");
  async function save() { const e = await call({ action: "playlist-edit", id, title: t, description: d }); if (e) return setErr(e); setEdit(false); router.refresh(); }
  async function del() {
    if (!confirm("Apagar esta playlist e todas as aulas dela?")) return;
    const e = await call({ action: "playlist-delete", id });
    if (e) return setErr(e);
    router.push("/painel/cursos"); router.refresh();
  }
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
      {!edit ? (
        <>
          <button type="button" onClick={() => setEdit(true)} className="btn btn-ghost !px-3 !py-1">Editar playlist</button>
          <button type="button" onClick={del} className="btn btn-ghost !px-3 !py-1 text-down">Apagar playlist</button>
        </>
      ) : (
        <div className="w-full space-y-2">
          <input value={t} onChange={(e) => setT(e.target.value)} maxLength={80} aria-label="Nome" className="input w-full" />
          <input value={d} onChange={(e) => setD(e.target.value)} maxLength={300} aria-label="Descrição" className="input w-full" />
          <div className="flex gap-2"><button type="button" onClick={save} className="btn btn-gold !px-4 !py-1">Salvar</button><button type="button" onClick={() => setEdit(false)} className="btn btn-ghost !px-4 !py-1">Cancelar</button></div>
        </div>
      )}
      {err && <span className="text-down">{err}</span>}
    </div>
  );
}

export function MovePlaylist({ id }: { id: number }) {
  const router = useRouter();
  const go = async (dir: "up" | "down") => { await call({ action: "move", kind: "playlist", id, dir }); router.refresh(); };
  return (
    <span className="flex gap-1">
      <button type="button" onClick={() => go("up")} aria-label="Subir playlist" className="rounded border border-line px-2 text-muted hover:text-white">↑</button>
      <button type="button" onClick={() => go("down")} aria-label="Descer playlist" className="rounded border border-line px-2 text-muted hover:text-white">↓</button>
    </span>
  );
}

interface LessonForm { title: string; description: string; url: string; minutes: string; free: boolean }
const empty: LessonForm = { title: "", description: "", url: "", minutes: "", free: false };

/** Administrador: adicionar aula (link do YouTube, vídeo ou playlist, não listado) ou editar uma existente. */
export function LessonEditor({ playlistId, lessonId, initial, onDone }: { playlistId: number; lessonId?: number; initial?: Partial<LessonForm>; onDone?: () => void }) {
  const router = useRouter();
  const [f, setF] = useState<LessonForm>({ ...empty, ...initial });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const common = { title: f.title, description: f.description, url: f.url, minutes: f.minutes ? Number(f.minutes) : null, free: f.free };
    const e2 = await call(lessonId ? { action: "lesson-edit", id: lessonId, ...common } : { action: "lesson-add", playlistId, ...common });
    setBusy(false);
    if (e2) return setErr(e2);
    if (!lessonId) setF(empty);
    onDone?.(); router.refresh();
  }
  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-line bg-ink/40 p-3">
      <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} placeholder="Título da aula" aria-label="Título da aula" className="input w-full" />
      <input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} maxLength={500} placeholder={lessonId ? "Novo link do YouTube (deixe vazio para manter)" : "Link do YouTube (vídeo ou playlist não listada)"} aria-label="Link do YouTube" inputMode="url" autoCapitalize="none" className="input w-full" />
      <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={600} rows={2} placeholder="Descrição (opcional)" aria-label="Descrição" className="input w-full resize-none" />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-muted">Duração (min) <input value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value.replace(/\D/g, "").slice(0, 3) })} inputMode="numeric" aria-label="Duração em minutos" className="input !w-20" /></label>
        <label className="flex items-center gap-2 text-muted"><input type="checkbox" checked={f.free} onChange={(e) => setF({ ...f, free: e.target.checked })} /> Liberada no plano Grátis</label>
      </div>
      {err && <p className="text-xs text-down">{err}</p>}
      <div className="flex gap-2">
        <button className="btn btn-gold !px-4 !py-1.5" disabled={busy || !f.title.trim()}>{busy ? "…" : lessonId ? "Salvar aula" : "Adicionar aula"}</button>
        {lessonId && <button type="button" onClick={onDone} className="btn btn-ghost !px-4 !py-1.5">Cancelar</button>}
      </div>
    </form>
  );
}
