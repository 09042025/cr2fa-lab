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
  const [topic, setTopic] = useState(topics.some((t) => t.id === current) ? current! : "geral");
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

export function PinButton({ postId, pinned }: { postId: number; pinned: boolean }) {
  const router = useRouter();
  return (
    <button className={link} onClick={async () => { await post({ action: "pin", postId, pin: !pinned }); router.refresh(); }}>
      {pinned ? "desafixar do perfil" : "fixar no perfil"}
    </button>
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

/** Perfil da comunidade (em Configurações): capa, foto, @usuário, bio curta, localização e link. */
export function CommunityProfileForm(props: { name: string; avatarId: number | null; bannerId: number | null; handle: string; bio: string; location: string; website: string; max: number }) {
  const router = useRouter();
  const [bio, setBio] = useState(props.bio);
  const [handle, setHandle] = useState(props.handle);
  const [location, setLocation] = useState(props.location);
  const [website, setWebsite] = useState(props.website);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [avatar, setAvatar] = useState<number | null>(props.avatarId);
  const [banner, setBanner] = useState<number | null>(props.bannerId);
  const avFile = useRef<HTMLInputElement>(null);
  const bnFile = useRef<HTMLInputElement>(null);
  const av = useImageUpload(async (f) => (await import("./imageUpload")).squareAvatar(f));
  const bn = useImageUpload(async (f) => (await import("./imageUpload")).bannerCrop(f));
  const avShown = av.image?.preview ?? (avatar ? `/api/community/image?id=${avatar}` : null);
  const bnShown = bn.image?.preview ?? (banner ? `/api/community/image?id=${banner}` : null);
  const initials = props.name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  const input = "mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:outline-none";

  async function save() {
    setMsg("");
    const res = await fetch("/api/community/profile", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ bio, handle: handle.replace(/^@/, ""), location, website, avatarId: av.image?.id ?? avatar, bannerId: bn.image?.id ?? banner }),
    });
    setOk(res.ok);
    if (!res.ok) return setMsg(await errOf(res, "Não foi possível salvar."));
    if (av.image) setAvatar(av.image.id);
    if (bn.image) setBanner(bn.image.id);
    setMsg("Perfil salvo!");
    router.refresh();
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="relative h-28 bg-gradient-to-r from-panel-2 to-ink sm:h-36">
          {bnShown && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bnShown} alt="Capa do perfil" className="h-full w-full object-cover" />
          )}
          <div className="absolute right-2 top-2 flex gap-2">
            <input ref={bnFile} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { void bn.upload(e.target.files?.[0]); e.target.value = ""; }} />
            <button type="button" className="rounded-lg bg-black/60 px-3 py-1 text-xs text-white hover:bg-black/80" disabled={bn.busy} onClick={() => bnFile.current?.click()}>{bn.busy ? "Enviando…" : bnShown ? "Trocar capa" : "Adicionar capa"}</button>
            {bnShown && <button type="button" className="rounded-lg bg-black/60 px-3 py-1 text-xs text-white hover:bg-black/80" onClick={() => { bn.clear(); setBanner(null); }}>Remover</button>}
          </div>
        </div>
        <div className="flex items-end gap-3 px-4 pb-3">
          <div className="-mt-10 shrink-0">
            {avShown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avShown} alt="Sua foto" className="h-20 w-20 rounded-full border-4 border-panel object-cover" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-panel bg-panel-2 text-2xl font-semibold text-gold-soft">{initials}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 pb-1">
            <input ref={avFile} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { void av.upload(e.target.files?.[0]); e.target.value = ""; }} />
            <button type="button" className="btn btn-ghost !py-1.5 text-sm" disabled={av.busy} onClick={() => avFile.current?.click()}>{av.busy ? "Enviando…" : avShown ? "Trocar foto" : "Escolher foto"}</button>
            {avShown && <button type="button" className="text-xs text-muted underline hover:text-white" onClick={() => { av.clear(); setAvatar(null); }}>remover foto</button>}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-muted">@usuário
          <input value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={21} placeholder="ex.: emersonniza" className={input} />
        </label>
        <label className="text-sm text-muted">Localização
          <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={40} placeholder="ex.: São Paulo, Brasil" className={input} />
        </label>
      </div>
      <label className="mt-4 block text-sm text-muted">Bio (curta e simples)
        <textarea value={bio} maxLength={props.max} rows={2} onChange={(e) => setBio(e.target.value)} placeholder="Ex.: Investidor há 5 anos. Foco em dividendos e Bitcoin." className={`${input} resize-none`} />
      </label>
      <p className="text-right text-[11px] text-muted">{bio.length}/{props.max}</p>
      <label className="block text-sm text-muted">Link
        <input value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={100} placeholder="ex.: meusite.com.br ou linktr.ee/voce" className={input} />
      </label>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn btn-gold" onClick={save}>Salvar perfil da comunidade</button>
        {(msg || av.err || bn.err) && <span className={`text-sm ${ok ? "text-up" : "text-down"}`}>{msg || av.err || bn.err}</span>}
      </div>
    </div>
  );
}

export function FollowButton({ userId, following }: { userId: number; following: boolean }) {
  const router = useRouter();
  return (
    <button
      className={following ? "btn btn-ghost" : "btn btn-gold"}
      onClick={async () => {
        await fetch("/api/community/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, follow: !following }) });
        router.refresh();
      }}
    >
      {following ? "Seguindo" : "Seguir"}
    </button>
  );
}
