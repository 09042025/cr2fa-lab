"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Reduz prints grandes (telas retina passam de 2 MB) para no máximo 1600 px, em JPEG. GIFs e imagens já pequenas seguem como estão. */
async function shrink(f: File): Promise<File> {
  if (f.type === "image/gif" || f.size <= 900 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const ctx = c.getContext("2d");
    if (!ctx) return f;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
    return blob && blob.size < f.size ? new File([blob], (f.name || "print").replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

const ImageIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m4 18 5-5 4 4 3-3 4 4" />
  </svg>
);

export function ChatForm({ channel, max, replyTo }: { channel: string; max: number; replyTo?: { id: number; author: string; body: string } | null }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<{ id: number; name: string; preview: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function upload(f: File | undefined) {
    if (!f) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) return setErr("Formato não aceito. Use PNG, JPG, GIF ou WebP.");
    setErr("");
    setBusy(true);
    const small = await shrink(f);
    const fd = new FormData();
    fd.append("file", small, small.name || "print.png");
    const res = await fetch("/api/community/image", { method: "POST", body: fd });
    setBusy(false);
    const data = (await res.json().catch(() => null)) as { id?: number; error?: string } | null;
    if (!res.ok || !data?.id) return setErr(data?.error ?? "Não foi possível enviar a imagem.");
    setImage((old) => { if (old) URL.revokeObjectURL(old.preview); return { id: data.id!, name: f.name || "print", preview: URL.createObjectURL(small) }; });
  }

  function clearImage() {
    if (image) URL.revokeObjectURL(image.preview);
    setImage(null);
  }

  async function send() {
    if ((!body.trim() && !image) || busy) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/community", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel, body, replyTo: replyTo?.id ?? null, imageId: image?.id ?? null }) });
    setBusy(false);
    if (!res.ok) return setErr(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível enviar.");
    setBody("");
    clearImage();
    if (replyTo) router.replace(`/painel/comunidade?c=${channel}`);
    router.refresh();
  }

  return (
    <div
      className={`mt-3 rounded-lg ${drag ? "outline outline-2 outline-dashed outline-gold" : ""}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); void upload(Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"))); }}
    >
      {replyTo && (
        <p className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-panel-2 px-3 py-1.5 text-xs text-muted">
          <span className="truncate">Respondendo a <strong className="text-white">{replyTo.author}</strong>: {replyTo.body}</span>
          <a href={`/painel/comunidade?c=${channel}`} className="shrink-0 underline">cancelar</a>
        </p>
      )}
      {image && (
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-panel-2 p-2 text-xs text-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.preview} alt="Prévia da imagem" className="h-16 w-16 rounded-md object-cover" />
          <span className="min-w-0 flex-1 truncate">{image.name}<br />Pronta para enviar</span>
          <button className="underline hover:text-white" onClick={clearImage}>remover</button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-line text-gold-soft hover:bg-panel-2 disabled:opacity-50" title="Anexar imagem" aria-label="Anexar imagem" onClick={() => file.current?.click()} disabled={busy}>
          <ImageIcon />
        </button>
        <textarea
          value={body}
          maxLength={max}
          rows={1}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          onPaste={(e) => {
            const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/"));
            if (f) { e.preventDefault(); void upload(f); }
          }}
          placeholder="Escreva uma mensagem ou cole um print (Ctrl+V). Use @nome para mencionar."
          className="h-12 min-w-0 flex-1 resize-none rounded-lg border border-line bg-ink px-3 py-3 text-sm leading-6"
        />
        <button type="button" className="btn btn-gold h-12 shrink-0 !py-0" onClick={send} disabled={busy}>{busy ? "…" : "Enviar"}</button>
      </div>
      <p className="mt-1 text-[11px] text-muted">Enter envia · Shift+Enter quebra a linha · cole prints com Ctrl+V (⌘+V no Mac) ou arraste a imagem para cá</p>
      {err && <p className="mt-1 text-xs text-down">{err}</p>}
    </div>
  );
}

/** Apaga uma mensagem (do próprio autor ou, para administradores, de qualquer um). */
export function DeleteMessage({ id }: { id: number }) {
  const router = useRouter();
  return (
    <button
      className="text-xs text-down opacity-70 hover:opacity-100"
      onClick={async () => {
        if (!confirm("Apagar esta mensagem?")) return;
        await fetch(`/api/community?id=${id}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      apagar
    </button>
  );
}


const link = "text-xs text-muted underline hover:text-white";

/** Edita a própria mensagem no lugar. */
export function EditMessage({ id, body }: { id: number; body: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(body);
  const [err, setErr] = useState("");
  async function save() {
    const res = await fetch("/api/community", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, body: text }) });
    if (!res.ok) return setErr(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível salvar.");
    setOpen(false);
    setErr("");
    router.refresh();
  }
  if (!open) return <button className={link} onClick={() => setOpen(true)}>editar</button>;
  return (
    <span className="mt-1 block w-full basis-full">
      <textarea value={text} maxLength={1000} rows={2} onChange={(e) => setText(e.target.value)} className="w-full resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm text-white" />
      <span className="flex items-center gap-3">
        <button className="btn btn-gold !px-3 !py-1 text-xs" onClick={save}>Salvar</button>
        <button className={link} onClick={() => { setOpen(false); setText(body); }}>cancelar</button>
        {err && <span className="text-xs text-down">{err}</span>}
      </span>
    </span>
  );
}

/** Denuncia a mensagem à moderação, escolhendo o motivo. */
export function ReportButton({ messageId, reasons }: { messageId: number; reasons: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  async function send(reason: string) {
    const res = await fetch("/api/community/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId, reason }) });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setMsg(res.ok ? "Denúncia enviada à moderação. Obrigado!" : data?.error ?? "Não foi possível denunciar.");
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

/** Bloqueia ou desbloqueia um membro só para você (as mensagens dele somem da sua tela). */
export function BlockButton({ userId, blocked, label }: { userId: number; blocked?: boolean; label?: string }) {
  const router = useRouter();
  return (
    <button
      className={link}
      onClick={async () => {
        if (!blocked && !confirm("Bloquear este membro? Você deixa de ver as mensagens dele (você pode desbloquear depois).")) return;
        await fetch("/api/community/block", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, blocked: !blocked }) });
        router.refresh();
      }}
    >
      {label ?? (blocked ? "desbloquear" : "bloquear")}
    </button>
  );
}

/** Moderação: dispensa uma denúncia sem apagar a mensagem. */
export function DismissReport({ id }: { id: number }) {
  const router = useRouter();
  return <button className={link} onClick={async () => { await fetch(`/api/community/report?id=${id}`, { method: "DELETE" }); router.refresh(); }}>dispensar denúncia</button>;
}

export function Reactions({ id, items, all }: { id: number; items: { emoji: string; count: number; mine: boolean }[]; all: readonly string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function toggle(emoji: string) {
    setOpen(false);
    await fetch("/api/community/react", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId: id, emoji }) });
    router.refresh();
  }
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {items.map((r) => (
        <button key={r.emoji} onClick={() => toggle(r.emoji)} className={`rounded-full border px-2 py-0.5 text-xs ${r.mine ? "border-gold bg-gold/15 text-gold-soft" : "border-line text-muted hover:border-gold/50"}`}>
          {r.emoji} {r.count}
        </button>
      ))}
      <span className="relative">
        <button onClick={() => setOpen(!open)} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted hover:border-gold/50" aria-label="Reagir">＋😊</button>
        {open && (
          <span className="absolute left-0 top-7 z-10 flex gap-1 rounded-lg border border-line bg-panel p-1.5 shadow-lg">
            {all.map((e) => <button key={e} onClick={() => toggle(e)} className="rounded px-1 text-base hover:bg-panel-2">{e}</button>)}
          </span>
        )}
      </span>
    </div>
  );
}

/** Suspende ou reativa um membro (só aparece para administradores). */
export function BanButton({ userId, banned }: { userId: number; banned: boolean }) {
  const router = useRouter();
  return (
    <button
      className="text-xs text-muted underline hover:text-white"
      onClick={async () => {
        if (!confirm(banned ? "Reativar este membro na comunidade?" : "Suspender este membro? Ele não poderá mais escrever, reagir nem enviar imagens.")) return;
        await fetch("/api/community/ban", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, banned: !banned }) });
        router.refresh();
      }}
    >
      {banned ? "reativar" : "banir"}
    </button>
  );
}

/** Atualiza a lista sozinha a cada 20 segundos e mantém a rolagem no fim. */
export function AutoRefresh({ count }: { count: number }) {
  const router = useRouter();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [count]);
  return <div ref={end} />;
}
