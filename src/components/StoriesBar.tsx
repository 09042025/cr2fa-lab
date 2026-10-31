"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import { useImageUpload } from "./imageUpload";
import { StoryCamera, MAX_STORY_SECONDS, type Captured } from "./StoryCamera";

interface Story { id: number; imageId: number; videoId: number | null; caption: string; createdAt: number; seen: boolean; views?: number }
interface Group { userId: number; name: string; avatarId: number | null; isAdmin: boolean; mine: boolean; allSeen: boolean; stories: Story[] }

const DURATION = 6000;
const api = (body: unknown) => fetch("/api/community/stories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

function ago(ts: number) {
  const m = Math.max(0, Math.floor((Date.now() / 1000 - ts) / 60));
  return m < 1 ? "agora" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h`;
}

/** Faixa de Stories no topo do Feed: fotos que somem em 24 horas, com visualizador em tela cheia. */
export function StoriesBar({ me, canPost }: { me: { id: number; name: string; avatarId: number | null }; canPost: boolean }) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState<{ g: number; s: number } | null>(null);
  const [composer, setComposer] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/community/stories", { cache: "no-store" }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { groups?: Group[] } | null;
    if (d?.groups) setGroups(d.groups);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const mine = groups.find((g) => g.mine);
  const others = groups.filter((g) => !g.mine);
  const ring = (seen: boolean) => (seen ? "border-line" : "border-gold");

  return (
    <section className="card mb-5 p-3" aria-label="Stories">
      <div className="flex gap-4 overflow-x-auto pb-1">
        <div className="flex w-16 shrink-0 flex-col items-center gap-1">
          <button type="button" className="relative" onClick={() => (mine ? setOpen({ g: groups.indexOf(mine), s: 0 }) : canPost && setComposer(true))} aria-label={mine ? "Ver seu story" : "Criar story"}>
            <span className={`block rounded-full border-2 p-0.5 ${mine ? ring(true) : "border-dashed border-line"}`}><Avatar name={me.name} id={me.avatarId} size={52} /></span>
          </button>
          {canPost && (
            <button type="button" onClick={() => setComposer(true)} className="text-[11px] text-gold-soft hover:underline">+ Seu story</button>
          )}
        </div>
        {others.map((g) => (
          <button key={g.userId} type="button" onClick={() => setOpen({ g: groups.indexOf(g), s: Math.max(0, g.stories.findIndex((x) => !x.seen)) })} className="flex w-16 shrink-0 flex-col items-center gap-1">
            <span className={`block rounded-full border-2 p-0.5 ${ring(g.allSeen)}`}><Avatar name={g.name} id={g.avatarId} size={52} /></span>
            <span className="w-full truncate text-center text-[11px] text-muted">{g.name.split(" ")[0]}</span>
          </button>
        ))}
        {others.length === 0 && !mine && <p className="self-center text-xs text-muted">Stories somem em 24 horas. Compartilhe um momento com a comunidade.</p>}
      </div>
      {composer && <Composer onClose={() => setComposer(false)} onDone={() => { setComposer(false); void load(); }} />}
      {open && groups[open.g] && (
        <Viewer
          groups={groups}
          start={open}
          onClose={() => { setOpen(null); void load(); }}
          onChanged={() => { setOpen(null); void load(); router.refresh(); }}
        />
      )}
    </section>
  );
}

interface VideoUp { id: number; posterId: number; url: string }

async function postFile(url: string, blob: Blob, name: string): Promise<number | string> {
  const fd = new FormData();
  fd.append("file", blob, name);
  const r = await fetch(url, { method: "POST", body: fd });
  const d = (await r.json().catch(() => null)) as { id?: number; error?: string } | null;
  return r.ok && d?.id ? d.id : d?.error ?? "Não foi possível enviar.";
}

/** Primeiro quadro do vídeo + duração, para validar vídeos vindos da galeria. */
function inspectVideo(file: File): Promise<{ poster: Blob; duration: number } | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (r: { poster: Blob; duration: number } | null) => { URL.revokeObjectURL(url); resolve(r); };
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    v.onerror = () => done(null);
    v.onloadeddata = () => { v.currentTime = Math.min(0.1, v.duration / 2 || 0); };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      const sc = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
      c.width = Math.round(v.videoWidth * sc); c.height = Math.round(v.videoHeight * sc);
      c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((b) => done(b ? { poster: b, duration: v.duration } : null), "image/jpeg", 0.8);
    };
  });
}

function Composer({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const img = useImageUpload();
  const [video, setVideo] = useState<VideoUp | null>(null);
  const [caption, setCaption] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  function reset() { img.clear(); if (video) URL.revokeObjectURL(video.url); setVideo(null); setErr(""); }

  async function onCaptured(c: Captured) {
    setCamera(false);
    reset();
    setBusy(true);
    if (c.kind === "photo") {
      await img.upload(new File([c.blob], "story.jpg", { type: "image/jpeg" }));
    } else {
      await uploadVideo(c.blob, c.poster);
    }
    setBusy(false);
  }

  async function uploadVideo(blob: Blob, poster: Blob) {
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const p = await postFile("/api/community/image", poster, "capa.jpg");
    if (typeof p === "string") return setErr(p);
    const v = await postFile("/api/community/video", blob, `story.${ext}`);
    if (typeof v === "string") return setErr(v);
    setVideo({ id: v, posterId: p, url: URL.createObjectURL(blob) });
  }

  async function fromGallery(f: File | undefined) {
    if (!f) return;
    reset();
    if (f.type.startsWith("image/")) return void img.upload(f);
    if (!f.type.startsWith("video/")) return setErr("Escolha uma foto ou um vídeo.");
    if (f.size > 14 * 1024 * 1024) return setErr("O vídeo é grande demais (máximo 14 MB). Grave direto pela câmera.");
    setBusy(true);
    const info = await inspectVideo(f);
    if (!info) setErr("Não consegui ler esse vídeo. Tente gravar pela câmera.");
    else if (info.duration > MAX_STORY_SECONDS + 1) setErr(`O vídeo tem mais de ${MAX_STORY_SECONDS} segundos.`);
    else await uploadVideo(f, info.poster);
    setBusy(false);
  }

  const ready = video ? { imageId: video.posterId, videoId: video.id } : img.image ? { imageId: img.image.id, videoId: null } : null;

  async function send() {
    if (!ready || busy) return;
    setBusy(true);
    const res = await api({ imageId: ready.imageId, videoId: ready.videoId ?? undefined, caption });
    setBusy(false);
    if (!res.ok) return setErr(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível publicar.");
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
      <div className="card max-h-full w-full max-w-sm overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Novo story</h3>
          <button type="button" onClick={onClose} className="text-sm text-muted hover:text-white">Cancelar</button>
        </div>
        {video ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={video.url} controls loop playsInline className="mb-3 max-h-80 w-full rounded-lg bg-ink object-contain" />
        ) : img.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.image.preview} alt="Prévia do story" className="mb-3 max-h-80 w-full rounded-lg bg-ink object-contain" />
        ) : (
          <div className="mb-3 flex h-44 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line text-sm text-muted">
            {busy || img.busy ? "Enviando…" : (
              <>
                <span>Tire uma foto ou grave um vídeo de até {MAX_STORY_SECONDS} s</span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => setCamera(true)} className="btn btn-gold !py-1.5 text-sm">📷 Câmera</button>
                  <button type="button" onClick={() => file.current?.click()} className="btn btn-ghost !py-1.5 text-sm">Galeria</button>
                </span>
              </>
            )}
          </div>
        )}
        {(video || img.image) && <button type="button" onClick={reset} className="mb-3 text-xs text-muted underline hover:text-white">Trocar</button>}
        <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/*" hidden onChange={(e) => { void fromGallery(e.target.files?.[0]); e.target.value = ""; }} />
        <input value={caption} maxLength={200} onChange={(e) => setCaption(e.target.value)} placeholder="Legenda (opcional)" className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none" />
        {(err || img.err) && <p className="mt-2 text-xs text-gold-soft">{err || img.err}</p>}
        <p className="mt-2 text-xs text-muted">O story fica visível por 24 horas e depois some.</p>
        <button type="button" disabled={!ready || busy} onClick={send} className="btn btn-gold mt-3 w-full disabled:opacity-50">{busy ? "Aguarde…" : "Publicar story"}</button>
      </div>
      {camera && <StoryCamera onCapture={onCaptured} onClose={() => setCamera(false)} />}
    </div>
  );
}

function Viewer({ groups, start, onClose, onChanged }: { groups: Group[]; start: { g: number; s: number }; onClose: () => void; onChanged: () => void }) {
  const [pos, setPos] = useState(start);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const g = groups[pos.g];
  const story = g?.stories[pos.s];
  const viewed = useRef(new Set<number>());
  const vid = useRef<HTMLVideoElement>(null);

  const next = useCallback(() => {
    setProgress(0);
    setPos((p) => {
      const grp = groups[p.g];
      if (p.s + 1 < grp.stories.length) return { g: p.g, s: p.s + 1 };
      const ng = groups.findIndex((x, i) => i > p.g && !x.mine);
      if (ng >= 0) return { g: ng, s: 0 };
      queueMicrotask(onClose);
      return p;
    });
  }, [groups, onClose]);
  const prev = useCallback(() => {
    setProgress(0);
    setPos((p) => (p.s > 0 ? { g: p.g, s: p.s - 1 } : p));
  }, []);

  useEffect(() => {
    if (!story || g.mine || viewed.current.has(story.id)) return;
    viewed.current.add(story.id);
    void api({ view: story.id });
  }, [story, g]);

  useEffect(() => {
    if (paused || msg || story?.videoId) return;
    const t0 = Date.now() - progress * DURATION;
    const iv = setInterval(() => {
      const p = (Date.now() - t0) / DURATION;
      if (p >= 1) { clearInterval(iv); next(); } else setProgress(p);
    }, 60);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, paused, msg]);

  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    if (paused || msg) v.pause(); else void v.play().catch(() => { v.muted = true; void v.play().catch(() => {}); });
  }, [paused, msg, pos]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [next, prev, onClose]);

  if (!g || !story) return null;

  async function remove() {
    if (!window.confirm("Apagar este story?")) return;
    const r = await fetch(`/api/community/stories?id=${story!.id}`, { method: "DELETE" });
    if (r.ok) onChanged(); else setMsg("Não foi possível apagar.");
  }
  async function toFeed() {
    setPaused(true);
    const r = await api({ share: story!.id });
    const d = (await r.json().catch(() => null)) as { error?: string } | null;
    setMsg(r.ok ? "Publicado no Feed! Ele não some mais." : d?.error ?? "Não foi possível publicar.");
    if (r.ok) setTimeout(onChanged, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" role="dialog" aria-modal="true" aria-label={`Story de ${g.name}`}>
      <div className="relative flex h-full w-full max-w-md flex-col bg-ink" onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
        <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-3">
          <div className="mb-2 flex gap-1">
            {g.stories.map((s, i) => (
              <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded bg-white/30"><span className="block h-full bg-white" style={{ width: i < pos.s ? "100%" : i === pos.s ? `${progress * 100}%` : "0%" }} /></span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Avatar name={g.name} id={g.avatarId} size={32} />
            <span className="text-sm font-semibold text-white">{g.name}</span>
            <span className="text-xs text-white/70">{ago(story.createdAt)}</span>
            <button type="button" onClick={onClose} aria-label="Fechar" className="ml-auto px-2 text-2xl leading-none text-white">×</button>
          </div>
        </div>
        {story.videoId ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={story.id}
            ref={vid}
            src={`/api/community/video?id=${story.videoId}`}
            poster={`/api/community/image?id=${story.imageId}`}
            autoPlay
            playsInline
            className="h-full w-full object-contain"
            onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
            onEnded={next}
            onError={() => setMsg("Não foi possível reproduzir este vídeo neste aparelho.")}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/community/image?id=${story.imageId}`} alt={story.caption || `Story de ${g.name}`} className="h-full w-full object-contain" draggable={false} />
        )}
        <button type="button" aria-label="Anterior" onClick={prev} className="absolute inset-y-16 left-0 w-1/3" />
        <button type="button" aria-label="Próximo" onClick={next} className="absolute inset-y-16 right-0 w-1/3" />
        <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 bg-gradient-to-t from-black/80 to-transparent p-4">
          {story.caption && <p className="text-center text-sm text-white">{story.caption}</p>}
          {msg && <p className="text-center text-xs text-gold-soft">{msg}</p>}
          {g.mine && (
            <div className="flex items-center justify-between gap-2 text-xs" onPointerDown={(e) => e.stopPropagation()}>
              <span className="text-white/70">👁 {story.views ?? 0} {story.views === 1 ? "visualização" : "visualizações"}</span>
              <span className="flex gap-2">
                {!story.videoId && <button type="button" onClick={toFeed} className="rounded-full bg-gold px-3 py-1 font-semibold text-ink">Publicar no Feed</button>}
                <button type="button" onClick={remove} className="rounded-full border border-white/40 px-3 py-1 text-white">Apagar</button>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
