"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useImageUpload } from "./imageUpload";

const link = "text-xs text-muted underline hover:text-white";
const post = (body: unknown) => fetch("/api/community/feed", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const errOf = async (res: Response, fallback: string) => ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? fallback;

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="text-gold"><path d="M9 3v12M3 9h12" /></svg>
);

/** Caixa de nova publicação: texto, assunto e imagem (colar com Ctrl+V, arrastar ou botão +). */
export function PostForm({ topics, max, current }: { topics: readonly { id: string; label: string }[]; max: number; current?: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState(current && current !== "todos" ? current : "geral");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const img = useImageUpload();

  async function send() {
    if ((!body.trim() && !img.image) || busy || img.busy) return;
    setBusy(true);
    setErr("");
    const res = await post({ action: "post", topic, body, imageId: img.image?.id ?? null });
    setBusy(false);
    if (!res.ok) return setErr(await errOf(res, "Não foi possível publicar."));
    setBody("");
    img.clear();
    router.refresh();
  }

  return (
    <div
      className={`card mb-5 p-4 ${drag ? "outline outline-2 outline-dashed outline-gold" : ""}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); void img.upload(Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"))); }}
    >
      <textarea
        value={body}
        maxLength={max}
        rows={3}
        onChange={(e) => setBody(e.target.value)}
        onPaste={(e) => {
          const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/"));
          if (f) { e.preventDefault(); void img.upload(f); }
        }}
        placeholder="Compartilhe uma análise, uma dúvida ou uma ideia de investimento… (cole prints com Ctrl+V)"
        className="w-full resize-none rounded-lg border border-line bg-ink px-3 py-3 text-sm leading-6 outline-none focus:outline-none"
      />
      {img.image && (
        <div className="mt-2 flex items-center gap-3 rounded-lg bg-panel-2 p-2 text-xs text-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.image.preview} alt="Prévia da imagem" className="h-16 w-16 rounded-md object-cover" />
          <span className="min-w-0 flex-1 truncate">{img.image.name}<br />Pronta para publicar</span>
          <button className="underline hover:text-white" onClick={img.clear}>remover</button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => { void img.upload(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" title="Anexar imagem" aria-label="Anexar imagem" disabled={img.busy} onClick={() => file.current?.click()} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line hover:bg-panel-2 disabled:opacity-50"><PlusIcon /></button>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Assunto" className="h-10 rounded-lg border border-line bg-ink px-3 text-sm">
          {topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <span className="ml-auto text-[11px] text-muted">{body.length}/{max}</span>
        <button type="button" className="btn btn-gold h-10 !py-0" onClick={send} disabled={busy || img.busy}>{busy ? "…" : "Publicar"}</button>
      </div>
      {(err || img.err) && <p className="mt-2 text-xs text-down">{err || img.err}</p>}
      <p className="mt-2 text-[11px] text-muted">Conteúdo da comunidade é opinião dos membros, não recomendação de investimento. Nada de pedir dinheiro, divulgar terceiros ou prometer ganhos.</p>
    </div>
  );
}

export function LikeButton({ id, count, liked }: { id: number; count: number; liked: boolean }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => { await post({ action: "like", postId: id }); router.refresh(); }}
      className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${liked ? "border-gold bg-gold/15 text-gold-soft" : "border-line text-muted hover:border-gold/50"}`}
      aria-pressed={liked}
    >
      {liked ? "♥" : "♡"} {count > 0 ? count : "Curtir"}
    </button>
  );
}

export function CommentForm({ postId, max }: { postId: number; max: number }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  async function send() {
    if (!body.trim()) return;
    const res = await post({ action: "comment", postId, body });
    if (!res.ok) return setErr(await errOf(res, "Não foi possível comentar."));
    setBody("");
    setErr("");
    router.refresh();
  }
  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <input value={body} maxLength={max} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void send(); } }} placeholder="Escreva um comentário…" className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 text-sm outline-none focus:outline-none" />
        <button className="btn btn-ghost h-9 !py-0 text-xs" onClick={send}>Comentar</button>
      </div>
      {err && <p className="mt-1 text-xs text-down">{err}</p>}
    </div>
  );
}

export function DeleteItem({ id, kind }: { id: number; kind: "post" | "comment" }) {
  const router = useRouter();
  return (
    <button className="text-xs text-down opacity-70 hover:opacity-100" onClick={async () => {
      if (!confirm(kind === "post" ? "Apagar esta publicação?" : "Apagar este comentário?")) return;
      await fetch(`/api/community/feed?kind=${kind}&id=${id}`, { method: "DELETE" });
      router.refresh();
    }}>apagar</button>
  );
}

export function ReportPost({ postId, reasons }: { postId: number; reasons: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  async function send(reason: string) {
    const res = await post({ action: "report", postId, reason });
    setMsg(res.ok ? "Denúncia enviada à moderação. Obrigado!" : await errOf(res, "Não foi possível denunciar."));
    setOpen(false);
  }
  if (msg) return <span className="text-xs text-gold-soft">{msg}</span>;
  return (
    <span className="relative">
      <button className={link} onClick={() => setOpen(!open)}>denunciar</button>
      {open && (
        <span className="absolute left-0 top-5 z-10 flex w-56 flex-col gap-1 rounded-lg border border-line bg-panel p-2 shadow-lg">
          <span className="px-1 text-[11px] text-muted">Motivo da denúncia:</span>
          {reasons.map((r) => <button key={r} onClick={() => send(r)} className="rounded px-2 py-1 text-left text-xs hover:bg-panel-2">{r}</button>)}
        </span>
      )}
    </span>
  );
}

export function DismissPostReport({ id }: { id: number }) {
  const router = useRouter();
  return <button className={link} onClick={async () => { await fetch(`/api/community/report?kind=post&id=${id}`, { method: "DELETE" }); router.refresh(); }}>dispensar denúncia</button>;
}

/** Foto e bio do perfil da comunidade (em Configurações). */
export function CommunityProfileForm({ name, avatarId, bio, max }: { name: string; avatarId: number | null; bio: string; max: number }) {
  const router = useRouter();
  const [text, setText] = useState(bio);
  const [msg, setMsg] = useState("");
  const [current, setCurrent] = useState<number | null>(avatarId);
  const file = useRef<HTMLInputElement>(null);
  const img = useImageUpload(async (f) => (await import("./imageUpload")).squareAvatar(f));
  const shown = img.image?.preview ?? (current ? `/api/community/image?id=${current}` : null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

  async function save() {
    setMsg("");
    const res = await fetch("/api/community/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ bio: text, avatarId: img.image?.id ?? current }) });
    if (!res.ok) return setMsg(await errOf(res, "Não foi possível salvar."));
    if (img.image) setCurrent(img.image.id);
    setMsg("Perfil salvo!");
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="Sua foto" className="h-20 w-20 rounded-full border border-line object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/40 bg-panel-2 text-2xl font-semibold text-gold-soft">{initials}</span>
        )}
        <div className="flex flex-col items-start gap-1">
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { void img.upload(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" className="btn btn-ghost !py-1.5 text-sm" disabled={img.busy} onClick={() => file.current?.click()}>{img.busy ? "Enviando…" : shown ? "Trocar foto" : "Escolher foto"}</button>
          {shown && <button type="button" className="text-xs text-muted underline hover:text-white" onClick={() => { img.clear(); setCurrent(null); }}>remover foto</button>}
        </div>
      </div>
      <label className="mt-4 block text-sm text-muted" htmlFor="bio">Bio (aparece no seu perfil e nas suas publicações)</label>
      <textarea id="bio" value={text} maxLength={max} rows={3} onChange={(e) => setText(e.target.value)} placeholder="Ex.: Investidor há 5 anos, foco em dividendos e Bitcoin." className="mt-1 w-full resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:outline-none" />
      <p className="text-right text-[11px] text-muted">{text.length}/{max}</p>
      <div className="mt-2 flex items-center gap-3">
        <button className="btn btn-gold" onClick={save}>Salvar foto e bio</button>
        {(msg || img.err) && <span className={`text-sm ${msg === "Perfil salvo!" ? "text-up" : "text-down"}`}>{msg || img.err}</span>}
      </div>
    </div>
  );
}
