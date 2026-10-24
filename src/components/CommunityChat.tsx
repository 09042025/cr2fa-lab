"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ChatForm({ channel, max, replyTo }: { channel: string; max: number; replyTo?: { id: number; author: string; body: string } | null }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<{ id: number; name: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function upload(f: File | undefined) {
    if (!f) return;
    setErr("");
    setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/community/image", { method: "POST", body: fd });
    setBusy(false);
    const data = (await res.json().catch(() => null)) as { id?: number; error?: string } | null;
    if (!res.ok || !data?.id) return setErr(data?.error ?? "Não foi possível enviar a imagem.");
    setImage({ id: data.id, name: f.name });
  }

  async function send() {
    if ((!body.trim() && !image) || busy) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/community", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel, body, replyTo: replyTo?.id ?? null, imageId: image?.id ?? null }) });
    setBusy(false);
    if (!res.ok) return setErr(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível enviar.");
    setBody("");
    setImage(null);
    if (replyTo) router.replace(`/painel/comunidade?c=${channel}`);
    router.refresh();
  }

  return (
    <div className="mt-3">
      {replyTo && (
        <p className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-panel-2 px-3 py-1.5 text-xs text-muted">
          <span className="truncate">Respondendo a <strong className="text-white">{replyTo.author}</strong>: {replyTo.body}</span>
          <a href={`/painel/comunidade?c=${channel}`} className="shrink-0 underline">cancelar</a>
        </p>
      )}
      {image && (
        <p className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-panel-2 px-3 py-1.5 text-xs text-muted">
          <span className="truncate">🖼️ {image.name}</span>
          <button className="underline" onClick={() => setImage(null)}>remover</button>
        </p>
      )}
      <div className="flex gap-2">
        <textarea
          value={body}
          maxLength={max}
          rows={2}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Conversar neste canal… Use @nome para mencionar. (Enter envia, Shift+Enter quebra a linha)"
          className="min-h-[3rem] flex-1 resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm"
        />
        <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex flex-col gap-2">
          <button className="btn btn-ghost" title="Anexar imagem (até 2 MB)" onClick={() => file.current?.click()} disabled={busy}>🖼️</button>
          <button className="btn btn-gold" onClick={send} disabled={busy}>Enviar</button>
        </div>
      </div>
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
