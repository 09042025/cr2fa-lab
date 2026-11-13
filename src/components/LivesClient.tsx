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
interface YtMsg { n: number; id: string; name: string; body: string; owner: boolean; mod: boolean; at: number }

export function LiveChat({ liveId, canHost }: { liveId: number; canHost?: boolean }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [me, setMe] = useState(0);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [spot, setSpot] = useState<number | null>(null);
  const [ytMsgs, setYt] = useState<YtMsg[]>([]);
  const [ytSpot, setYtSpot] = useState<string | null>(null);
  const [ytOn, setYtOn] = useState<boolean | null>(null);
  const [ytErr, setYtErr] = useState<string | null>(null);
  const ytLast = useRef(0);
  const last = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dead = false;
    async function tick() {
      if (document.hidden) return;
      const r = await fetch(`/api/community/lives?id=${liveId}&after=${last.current}&yt=${ytLast.current}`, { cache: "no-store" }).catch(() => null);
      const d = (await r?.json().catch(() => null)) as { live: unknown; me?: number; spotlight?: number | null; spotlightYt?: string | null; yt?: { enabled: boolean; error: string | null; messages: YtMsg[] } | null; messages?: Msg[] } | null;
      if (dead || !d) return;
      if (d.live === null) { router.refresh(); return; }
      if (d.me) setMe(d.me);
      if (d.spotlight !== undefined) setSpot(d.spotlight);
      if (d.spotlightYt !== undefined) setYtSpot(d.spotlightYt);
      if (d.yt) {
        setYtOn(d.yt.enabled); setYtErr(d.yt.error);
        if (d.yt.messages.length) { ytLast.current = d.yt.messages[d.yt.messages.length - 1].n; setYt((m) => [...m, ...d.yt!.messages].slice(-150)); }
      }
      if (d.messages?.length) {
        last.current = d.messages[d.messages.length - 1].id;
        setMsgs((m) => [...m, ...d.messages!].slice(-200));
      }
    }
    void tick();
    const iv = setInterval(tick, 3500);
    return () => { dead = true; clearInterval(iv); };
  }, [liveId, router]);

  useEffect(() => { const b = box.current; if (b) b.scrollTop = b.scrollHeight; }, [msgs, ytMsgs]);

  async function highlight(msgId: number | null) {
    setSpot(msgId); setYtSpot(null);
    const r = await post({ action: "spotlight", id: liveId, msgId });
    if (!r.ok) { setSpot(null); setErr(await errOf(r, "Não foi possível destacar.")); }
  }
  async function highlightYt(ytId: string | null) {
    setYtSpot(ytId); setSpot(null);
    const r = await post({ action: "spotlight", id: liveId, ytId: ytId ?? undefined });
    if (!r.ok) { setYtSpot(null); setErr(await errOf(r, "Não foi possível destacar.")); }
  }
  const all = [
    ...msgs.map((m) => ({ key: `s${m.id}`, at: m.createdAt * 1000, m, y: null as YtMsg | null })),
    ...ytMsgs.map((y) => ({ key: `y${y.id}`, at: y.at, m: null as Msg | null, y })),
  ].sort((a, b) => a.at - b.at);

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
        {all.length === 0 && <p className="text-xs text-muted">Seja o primeiro a comentar.</p>}
        {all.map((it) => it.m ? (
          <div key={it.key} className="flex items-start gap-2 text-sm">
            <Avatar name={it.m.name} id={it.m.avatarId} size={24} />
            <p className="min-w-0 break-words"><span className={`font-semibold ${it.m.userId === me ? "text-gold-soft" : ""}`}>{it.m.name}</span>{it.m.isAdmin && <span className="ml-1 rounded bg-gold/20 px-1 text-[9px] font-semibold uppercase text-gold-soft">Admin</span>} <span className="text-white/90">{it.m.body}</span>
              {canHost && (
                <button type="button" onClick={() => void highlight(spot === it.m!.id ? null : it.m!.id)} className={`ml-2 rounded border px-1.5 text-[10px] font-semibold ${spot === it.m.id ? "border-gold bg-gold text-[#1a1203]" : "border-gold/50 text-gold-soft hover:bg-gold/10"}`}>{spot === it.m.id ? "Na tela ✕" : "Destacar"}</button>
              )}</p>
          </div>
        ) : (
          <div key={it.key} className="flex items-start gap-2 text-sm">
            <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">YT</span>
            <p className="min-w-0 break-words"><span className="font-semibold">{it.y!.name}</span>{(it.y!.owner || it.y!.mod) && <span className="ml-1 rounded bg-white/10 px-1 text-[9px] font-semibold uppercase">{it.y!.owner ? "Dono" : "Mod"}</span>} <span className="text-white/90">{it.y!.body}</span>
              {canHost && (
                <button type="button" onClick={() => void highlightYt(ytSpot === it.y!.id ? null : it.y!.id)} className={`ml-2 rounded border px-1.5 text-[10px] font-semibold ${ytSpot === it.y!.id ? "border-gold bg-gold text-[#1a1203]" : "border-gold/50 text-gold-soft hover:bg-gold/10"}`}>{ytSpot === it.y!.id ? "Na tela ✕" : "Destacar"}</button>
              )}</p>
          </div>
        ))}
      </div>
      {canHost && ytOn && ytErr && <p className="mt-1 text-[11px] text-muted">YouTube: {ytErr}</p>}
      {err && <p className="mt-1 text-xs text-gold-soft">{err}</p>}
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <input value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário…" className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none" />
        <button type="submit" className="btn btn-gold !py-1.5 text-sm">Enviar</button>
      </form>
    </div>
  );
}

/** Link do overlay de comentários para o OBS (só para quem transmite). */
export function OverlayLink({ liveId, keyStr }: { liveId: number; keyStr: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => { setUrl(`${window.location.origin}/overlay/live/${liveId}?k=${keyStr}`); }, [liveId, keyStr]);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt("Copie o link:", url); }
  }
  return (
    <details className="card mt-4 p-3 text-sm">
      <summary className="cursor-pointer font-semibold">🎬 Comentários na tela (OBS)</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted">
        <li>No OBS, em Fontes, clique em <strong className="text-white">+</strong> e escolha <strong className="text-white">Navegador</strong>.</li>
        <li>Cole o link abaixo em URL, largura 1920 e altura 1080, e confirme.</li>
        <li>Aqui no chat, toque em <strong className="text-white">Destacar</strong> no comentário que quer mostrar. Toque de novo para tirar da tela.</li>
      </ol>
      <div className="mt-2 flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-xs outline-none" />
        <button type="button" onClick={copy} className="btn btn-gold !py-1.5 text-sm">{copied ? "Copiado!" : "Copiar"}</button>
      </div>
      <p className="mt-2 text-[11px] text-muted">Não compartilhe este link: quem tiver pode ver o comentário em destaque da sua live.</p>
    </details>
  );
}

/** Liga o chat do YouTube: o admin cola a chave da YouTube Data API v3 (guardada no servidor, nunca devolvida). */
export function YoutubeChatSetup({ hasKey, isAdmin }: { hasKey: boolean; isAdmin: boolean }) {
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/youtube-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setMsg(j.error ?? `Não consegui salvar (erro ${r.status}).`); else window.location.reload();
    } catch { setMsg("Falha de conexão."); }
    setBusy(false);
  }
  if (hasKey) return <p className="mt-3 text-xs text-muted">✅ Chat do YouTube ligado: os comentários de quem assiste no YouTube aparecem no chat, com a etiqueta YT, e podem ser destacados.</p>;
  if (!isAdmin) return <p className="mt-3 text-xs text-muted">Chat do YouTube desligado. Peça ao administrador para ligar.</p>;
  return (
    <details className="card mt-4 p-3 text-sm">
      <summary className="cursor-pointer font-semibold">▶ Ligar o chat do YouTube (uma vez só)</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted">
        <li>Entre em <strong className="text-white">console.cloud.google.com</strong> com a sua conta Google e crie um projeto (nome: niza).</li>
        <li>No menu, vá em <strong className="text-white">APIs e serviços</strong> e depois <strong className="text-white">Biblioteca</strong>. Procure <strong className="text-white">YouTube Data API v3</strong> e clique em <strong className="text-white">Ativar</strong>.</li>
        <li>Em <strong className="text-white">Credenciais</strong>, clique em <strong className="text-white">Criar credenciais</strong> e <strong className="text-white">Chave de API</strong>. Copie a chave (começa com AIza).</li>
        <li>Cole aqui embaixo e salve. Eu testo a chave antes de guardar.</li>
      </ol>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Cole a chave" autoComplete="off" spellCheck={false} className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-xs outline-none" />
        <button type="button" onClick={save} disabled={busy || !key.trim()} className="btn btn-gold !py-1.5 text-sm disabled:opacity-50">{busy ? "Testando…" : "Salvar chave"}</button>
      </div>
      {msg && <p className="mt-2 text-xs text-gold-soft">{msg}</p>}
      <p className="mt-2 text-[11px] text-muted">O limite grátis da Google dá cerca de 5 horas de live por dia com o chat do YouTube ligado. A chave fica só no servidor.</p>
    </details>
  );
}
