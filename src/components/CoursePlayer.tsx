"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LessonEditor } from "./CoursesAdmin";

interface L { id: number; title: string; description: string; minutes: number | null; free: boolean; locked: boolean; embed: string | null; ytUrl: string; hasVideo: boolean }

/** Player da playlist: o vídeo do YouTube (não listado) toca aqui dentro, e a lista de aulas fica logo abaixo. */
export function CoursePlayer({ playlistId, lessons, admin }: { playlistId: number; lessons: L[]; admin: boolean }) {
  const router = useRouter();
  const first = lessons.find((l) => !l.locked && l.embed) ?? null;
  const [sel, setSel] = useState<number | null>(first?.id ?? null);
  const [editing, setEditing] = useState<number | null>(null);
  const cur = lessons.find((l) => l.id === sel) ?? null;
  const act = async (body: unknown) => { await fetch("/api/courses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); router.refresh(); };

  return (
    <div className="space-y-4">
      {cur?.embed ? (
        <div>
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-line bg-black">
            <iframe key={cur.id} src={cur.embed} title={cur.title} className="h-full w-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          </div>
          <h2 className="mt-3 text-lg font-bold text-white">{cur.title}</h2>
          {cur.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{cur.description}</p>}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-panel p-6 text-sm text-muted">{lessons.length ? "Escolha uma aula abaixo para assistir." : "Ainda não há aulas nesta playlist."}</div>
      )}

      <ul className="space-y-2">
        {lessons.map((l, i) => (
          <li key={l.id} className={`rounded-xl border p-3 ${l.id === sel ? "border-gold/60 bg-gold/10" : "border-line bg-panel"}`}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { if (!l.locked && l.embed) { setSel(l.id); window.scrollTo({ top: 0, behavior: "smooth" }); } }} disabled={l.locked || !l.embed} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-xs text-muted">{l.locked ? "🔒" : i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">{l.title}</span>
                  <span className="text-xs text-muted">{l.minutes ? `${l.minutes} min` : "Vídeo"}{l.free ? " · Grátis" : ""}{l.locked ? " · Premium" : ""}{admin && !l.hasVideo ? " · sem vídeo" : ""}</span>
                </span>
              </button>
              {admin && (
                <span className="flex shrink-0 gap-1 text-xs">
                  <button type="button" aria-label="Subir aula" onClick={() => act({ action: "move", kind: "lesson", id: l.id, dir: "up" })} className="rounded border border-line px-2 py-1 text-muted hover:text-white">↑</button>
                  <button type="button" aria-label="Descer aula" onClick={() => act({ action: "move", kind: "lesson", id: l.id, dir: "down" })} className="rounded border border-line px-2 py-1 text-muted hover:text-white">↓</button>
                  <button type="button" onClick={() => setEditing(editing === l.id ? null : l.id)} className="rounded border border-line px-2 py-1 text-gold-soft">Editar</button>
                  <button type="button" onClick={() => { if (confirm("Apagar esta aula?")) void act({ action: "lesson-delete", id: l.id }); }} className="rounded border border-line px-2 py-1 text-down">Apagar</button>
                </span>
              )}
            </div>
            {admin && editing === l.id && (
              <div className="mt-3"><LessonEditor playlistId={playlistId} lessonId={l.id} initial={{ title: l.title, description: l.description, minutes: l.minutes ? String(l.minutes) : "", free: l.free }} onDone={() => setEditing(null)} /></div>
            )}
          </li>
        ))}
      </ul>

      {admin && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-gold-soft">Adicionar aula</h3>
          <p className="text-xs text-muted">Suba o vídeo no YouTube como <b>Não listado</b> (até 30 minutos por aula, ou o que quiser) e cole o link aqui. Pode colar o link de um vídeo ou de uma playlist inteira.</p>
          <LessonEditor playlistId={playlistId} />
        </section>
      )}
    </div>
  );
}
