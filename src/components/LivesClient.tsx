"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";

interface Msg { id: number; userId: number; name: string; avatarId: number | null; isAdmin: boolean; body: string; createdAt: number }
const post = (body: unknown) => fetch("/api/community/lives", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const errOf = async (r: Response, f: string) => ((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? f;

/** Formulário "Iniciar minha live": título + link da transmissão (feita no YouTube, Instagram, TikTok etc.). */
export function StartLive({ hasActive }: { hasActive: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    setErr("");
    const r = await post({ action: "start", title, url });
    setBusy(false);
    if (!r.ok) return setErr(await errOf(r, "Não foi possível iniciar."));
    const d = (await r.json()) as { id: number };
    router.push(`/painel/lives/${d.id}`);
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn btn-gold">🔴 Iniciar minha live</button>;
  return (
    <div className="card mb-6 p-4">
      <h2 className="mb-1 font-semibold">Iniciar minha live</h2>
      <ol className="mb-3 list-decimal space-y-1 pl-5 text-xs text-muted">
        <li>Comece a transmissão no seu app (YouTube, Instagram, TikTok, Facebook, Twitch, Kick, X, Meet, Zoom ou LinkedIn).</li>
        <li>Copie o link da sua live e cole abaixo.</li>
        <li>Quem entrar aqui assiste (YouTube toca direto na página) e conversa no chat ao vivo.</li>
      </ol>
      <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Título da live (ex.: Análise do Bitcoin hoje)" className="mb-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link da live (https://…)" inputMode="url" className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none" />
      {hasActive && <p className="mt-2 text-xs text-muted">Você já tem uma live no ar: ao iniciar outra, a anterior é encerrada.</p>}
      {err && <p className="mt-2 text-xs text-gold-soft">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy || !title.trim() || !url.trim()} onClick={go} className="btn btn-gold disabled:opacity-50">{busy ? "Abrindo…" : "Entrar no ar"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
      </div>
      <p className="mt-3 text-xs text-muted">Conteúdo é opinião de quem transmite, não recomendação de investimento. Nada de pedir dinheiro ou prometer ganhos.</p>
    </div>
  );
}

export function EndLiveButton({ id }: { id: number }) {
  const router = useRouter();
  return (
    <button type="button" className="btn btn-ghost !py-1.5 text-sm" onClick={async () => {
      if (!window.confirm("Encerrar esta live?")) return;
      const r = await post({ action: "end", id });
      if (r.ok) router.push("/painel/lives");
    }}>Encerrar live</button>
  );
}

/** Chat ao vivo (atualiza a cada poucos segundos). */
export function LiveChat({ liveId }: { liveId: number }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [me, setMe] = useState(0);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const last = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dead = false;
    async function tick() {
      if (document.hidden) return;
      const r = await fetch(`/api/community/lives?id=${liveId}&after=${last.current}`, { cache: "no-store" }).catch(() => null);
      const d = (await r?.json().catch(() => null)) as { live: unknown; me?: number; messages?: Msg[] } | null;
      if (dead || !d) return;
      if (d.live === null) { router.refresh(); return; }
      if (d.me) setMe(d.me);
      if (d.messages?.length) {
        last.current = d.messages[d.messages.length - 1].id;
        setMsgs((m) => [...m, ...d.messages!].slice(-200));
      }
    }
    void tick();
    const iv = setInterval(tick, 3500);
    return () => { dead = true; clearInterval(iv); };
  }, [liveId, router]);

  useEffect(() => { const b = box.current; if (b) b.scrollTop = b.scrollHeight; }, [msgs]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setErr("");
    const r = await post({ action: "chat", id: liveId, body });
    if (!r.ok) return setErr(await errOf(r, "Não foi possível enviar."));
    setText("");
  }

  return (
    <div className="card flex h-[28rem] flex-col p-3 lg:h-full lg:min-h-[28rem]">
      <h2 className="mb-2 text-sm font-semibold">Chat ao vivo</h2>
      <div ref={box} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {msgs.length === 0 && <p className="text-xs text-muted">Seja o primeiro a comentar.</p>}
        {msgs.map((m) => (
          <div key={m.id} className="flex items-start gap-2 text-sm">
            <Avatar name={m.name} id={m.avatarId} size={24} />
            <p className="min-w-0 break-words"><span className={`font-semibold ${m.userId === me ? "text-gold-soft" : ""}`}>{m.name}</span>{m.isAdmin && <span className="ml-1 rounded bg-gold/20 px-1 text-[9px] font-semibold uppercase text-gold-soft">Admin</span>} <span className="text-white/90">{m.body}</span></p>
          </div>
        ))}
      </div>
      {err && <p className="mt-1 text-xs text-gold-soft">{err}</p>}
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <input value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário…" className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none" />
        <button type="submit" className="btn btn-gold !py-1.5 text-sm">Enviar</button>
      </form>
    </div>
  );
}
