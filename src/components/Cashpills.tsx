"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StoryCamera, type Captured } from "./StoryCamera";

async function upload(url: string, blob: Blob, name: string): Promise<number | string> {
  const fd = new FormData();
  fd.append("file", blob, name);
  const r = await fetch(url, { method: "POST", body: fd });
  const d = await r.json().catch(() => ({}));
  return r.ok ? (d.id as number) : (d.error ?? "Não foi possível enviar.");
}

const Reel = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-gold"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M10 9.5v5l4.5-2.5z" /></svg>
);

/** Botão "Cashpill": grava um vídeo curto (15, 30, 45 ou 60 s) com a câmera do app e publica no perfil. */
export function CashpillButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [camera, setCamera] = useState(false);
  const [draft, setDraft] = useState<{ videoId: number; posterId: number; seconds: number; url: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onCaptured(c: Captured) {
    setCamera(false);
    if (c.kind !== "video") return;
    setBusy(true); setErr("");
    const ext = c.blob.type.includes("mp4") ? "mp4" : "webm";
    const p = await upload("/api/community/image", c.poster, "capa.jpg");
    if (typeof p === "string") { setBusy(false); return setErr(p); }
    const v = await upload("/api/community/video", c.blob, `cashpill.${ext}`);
    setBusy(false);
    if (typeof v === "string") return setErr(v);
    setDraft({ videoId: v, posterId: p, seconds: Math.round(c.seconds), url: URL.createObjectURL(c.blob) });
  }

  function discard() { if (draft) URL.revokeObjectURL(draft.url); setDraft(null); setCaption(""); setErr(""); }

  async function publish() {
    if (!draft) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/community/cashpills", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ videoId: draft.videoId, posterId: draft.posterId, duration: draft.seconds, caption }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error ?? "Não foi possível publicar.");
    discard();
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => { setErr(""); setCamera(true); }} disabled={busy} title="Gravar um Cashpill" className={`flex h-10 items-center gap-2 rounded-[10px] border border-line px-3 text-sm font-semibold hover:bg-panel-2 disabled:opacity-50 ${className}`}><Reel />Cashpill</button>
      {err && !draft && <span role="alert" className="text-xs text-down">{err}</span>}
      {camera && <StoryCamera cashpill onCapture={onCaptured} onClose={() => setCamera(false)} />}
      {busy && !draft && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 text-sm text-white">Enviando vídeo…</div>}
      {draft && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Publicar Cashpill">
          <div className="card w-full max-w-sm space-y-3 p-4">
            <h2 className="font-display text-lg font-bold text-gold-soft">Novo Cashpill · {draft.seconds}s</h2>
            <video src={draft.url} controls playsInline className="mx-auto max-h-[55vh] w-full rounded-lg bg-black object-contain" />
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} rows={2} placeholder="Legenda (opcional)" className="w-full resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none" />
            {err && <p role="alert" className="text-xs text-down">{err}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={publish} disabled={busy} className="btn btn-gold flex-1">{busy ? "Publicando…" : "Publicar Cashpill"}</button>
              <button type="button" onClick={discard} disabled={busy} className="btn btn-ghost">Descartar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export interface PillView { id: number; videoId: number; posterId: number; duration: number; caption: string }

/** Grade de Cashpills do perfil; toque para assistir em tela cheia. */
export function CashpillGrid({ pills, canDelete }: { pills: PillView[]; canDelete: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState<PillView | null>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  async function remove(p: PillView) {
    if (!confirm("Apagar este Cashpill?")) return;
    await fetch(`/api/community/cashpills?id=${p.id}`, { method: "DELETE" });
    setOpen(null);
    router.refresh();
  }
  if (pills.length === 0) return <p className="card p-6 text-sm text-muted">Nenhum Cashpill ainda.</p>;
  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5">
        {pills.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => setOpen(p)} aria-label={`Assistir Cashpill de ${p.duration} segundos`} className="relative block aspect-[9/16] w-full overflow-hidden rounded-lg border border-line bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/community/image?id=${p.posterId}`} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 text-[11px] font-semibold text-white">▶ {p.duration}s</span>
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90" role="dialog" aria-modal="true" aria-label="Cashpill" onClick={() => setOpen(null)}>
          <div className="relative flex h-full w-full max-w-md flex-col bg-black" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(null)} aria-label="Fechar" className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-xl text-white">×</button>
            <video key={open.id} src={`/api/community/video?id=${open.videoId}`} poster={`/api/community/image?id=${open.posterId}`} controls autoPlay playsInline className="h-full w-full object-contain" />
            {(open.caption || canDelete) && (
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/85 to-transparent p-4 pb-16 text-sm text-white">
                <p className="min-w-0 break-words">{open.caption}</p>
                {canDelete && <button type="button" onClick={() => remove(open)} className="shrink-0 text-xs text-down underline">apagar</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
