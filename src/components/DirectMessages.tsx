"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ChannelIcon } from "@/components/ChannelIcon";
import { shrink } from "@/components/imageUpload";
import { LinkPreview } from "@/components/LinkPreview";

interface Msg { id: number; senderId: number; recipientId: number; body: string; imageId: number | null; audioId: number | null; createdAt: number; readAt: number | null }
interface Conv { userId: number; name: string; avatarId: number | null; isAdmin: boolean; lastBody: string; lastKind: "text" | "image" | "audio"; lastAt: number; lastMine: boolean; unread: number }
interface Peer { id: number; name: string; avatarId: number | null; isAdmin: boolean }
interface Found { id: number; name: string; avatarId: number | null }

const clock = (t: number) => new Date(t * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const dayLabel = (t: number) => {
  const d = new Date(t * 1000), today = new Date();
  const key = (x: Date) => x.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const y = new Date(today.getTime() - 86_400_000);
  return key(d) === key(today) ? "Hoje" : key(d) === key(y) ? "Ontem" : key(d);
};
/** Texto com links clicáveis (só http e https). Fica aqui porque o RichText depende do banco e não roda no navegador. */
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s<>"]+)/g).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all text-gold-soft underline hover:text-white">{part.length > 48 ? `${part.slice(0, 45)}…` : part}</a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const preview = (c: Conv) => (c.lastKind === "image" ? "📷 Foto" : c.lastKind === "audio" ? "🎤 Áudio" : c.lastBody);

/** Conversas diretas entre membros, no estilo WhatsApp: texto, foto e áudio. Atualiza sozinho a cada poucos segundos. */
export function DirectMessages({ startWith }: { startWith: number | null }) {
  const [me, setMe] = useState(0);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<number | null>(startWith);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [loading, setLoading] = useState(true);
  const lastId = useRef(0);
  const end = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const r = await fetch("/api/community/dm", { cache: "no-store" });
    if (!r.ok) return;
    const d = await r.json();
    setMe(d.me); setConvs(d.conversations);
  }, []);

  const loadThread = useCallback(async (id: number, reset: boolean) => {
    const r = await fetch(`/api/community/dm?with=${id}&after=${reset ? 0 : lastId.current}`, { cache: "no-store" });
    if (!r.ok) { setLoading(false); return; }
    const d = await r.json();
    setMe(d.me); setPeer(d.other); setBlocked(d.blocked);
    const list = d.messages as Msg[];
    if (reset) { setMsgs(list); lastId.current = list.at(-1)?.id ?? 0; }
    else if (list.length) { setMsgs((o) => [...o, ...list.filter((m) => !o.some((x) => x.id === m.id))]); lastId.current = list.at(-1)!.id; }
    setLoading(false);
  }, []);

  useEffect(() => { void loadList(); const t = setInterval(loadList, 8000); return () => clearInterval(t); }, [loadList]);
  useEffect(() => {
    if (!active) return;
    lastId.current = 0; setMsgs([]); setPeer(null); setLoading(true);
    void loadThread(active, true);
    const t = setInterval(() => { if (!document.hidden) void loadThread(active, false); }, 4000);
    return () => clearInterval(t);
  }, [active, loadThread]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length, active]);
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/community/dm?q=${encodeURIComponent(q.trim())}`);
      if (r.ok) setFound((await r.json()).members);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function open(id: number) {
    setActive(id); setQ(""); setFound([]);
    window.history.replaceState(null, "", `/painel/feed/mensagens?com=${id}`);
  }
  function back() { setActive(null); setPeer(null); window.history.replaceState(null, "", "/painel/feed/mensagens"); void loadList(); }

  const onSent = useCallback(() => { if (active) void loadThread(active, false); void loadList(); }, [active, loadThread, loadList]);

  return (
    <div translate="no" className="notranslate grid min-h-[70vh] gap-4 md:grid-cols-[300px_1fr]">
      <aside className={`card flex min-h-0 flex-col p-3 ${active ? "hidden md:flex" : "flex"}`}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar membro para conversar…" className="input mb-3" maxLength={40} aria-label="Buscar membro" />
        {found.length > 0 && (
          <ul className="mb-3 space-y-1 rounded-lg border border-line p-1">
            {found.map((m) => (
              <li key={m.id}><button className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-panel-2" onClick={() => open(m.id)}><Avatar name={m.name} id={m.avatarId} size={30} />{m.name}</button></li>
            ))}
          </ul>
        )}
        {q.trim().length >= 2 && found.length === 0 && <p className="mb-3 px-1 text-xs text-muted">Nenhum membro encontrado.</p>}
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {convs.map((c) => (
            <li key={c.userId}>
              <button onClick={() => open(c.userId)} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-panel-2 ${active === c.userId ? "bg-panel-2" : ""}`}>
                <Avatar name={c.name} id={c.avatarId} size={42} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2"><span className="truncate font-semibold">{c.name}</span><span className="shrink-0 text-[11px] text-muted">{clock(c.lastAt)}</span></span>
                  <span className="flex items-center justify-between gap-2"><span className="truncate text-xs text-muted">{c.lastMine ? "Você: " : ""}{preview(c)}</span>{c.unread > 0 && <span className="shrink-0 rounded-full bg-gold px-1.5 text-[11px] font-bold text-ink">{c.unread}</span>}</span>
                </span>
              </button>
            </li>
          ))}
          {convs.length === 0 && <li className="p-3 text-sm text-muted">Você ainda não tem conversas. Busque um membro acima para começar.</li>}
        </ul>
      </aside>

      <section className={`card min-h-0 flex-col p-0 ${active ? "flex" : "hidden md:flex"}`}>
        {!active ? (
          <div className="m-auto p-8 text-center text-sm text-muted">Escolha uma conversa ou busque um membro para enviar uma mensagem.</div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-line p-3">
              <button className="md:hidden text-lg text-gold-soft" onClick={back} aria-label="Voltar">←</button>
              {peer && <a href={`/painel/feed/membro/${peer.id}`} className="flex min-w-0 items-center gap-3"><Avatar name={peer.name} id={peer.avatarId} size={38} /><span className="truncate font-semibold hover:underline">{peer.name}</span>{peer.isAdmin && <span className="rounded bg-gold/20 px-1.5 text-[10px] font-semibold uppercase text-gold-soft">Admin</span>}</a>}
              {peer && !peer.isAdmin && (
                <button className="ml-auto text-xs text-muted underline hover:text-white" onClick={async () => {
                  const next = !blocked;
                  if (next && !confirm(`Bloquear ${peer.name}? Vocês não poderão trocar mensagens.`)) return;
                  const r = await fetch("/api/community/block", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: peer.id, blocked: next }) });
                  if (r.ok) setBlocked(next);
                }}>{blocked ? "desbloquear" : "bloquear"}</button>
              )}
            </header>
            <div className="min-h-[40vh] flex-1 space-y-1 overflow-y-auto p-4" style={{ maxHeight: "60vh" }}>
              {loading && <p className="text-center text-sm text-muted">Carregando…</p>}
              {!loading && msgs.length === 0 && <p className="text-center text-sm text-muted">Nenhuma mensagem ainda. Diga um oi!</p>}
              {msgs.map((m, i) => {
                const mine = m.senderId === me;
                const showDay = i === 0 || dayLabel(msgs[i - 1].createdAt) !== dayLabel(m.createdAt);
                return (
                  <div key={m.id}>
                    {showDay && <p className="my-3 text-center text-[11px] uppercase tracking-wider text-muted">{dayLabel(m.createdAt)}</p>}
                    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`group max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-br-sm bg-gold/20" : "rounded-bl-sm bg-panel-2"}`}>
                        {m.imageId && (
                          <a href={`/api/community/image?id=${m.imageId}`} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/api/community/image?id=${m.imageId}`} alt="Imagem enviada" loading="lazy" className="mb-1 max-h-64 rounded-lg object-contain" />
                          </a>
                        )}
                        {m.audioId && <audio controls preload="none" src={`/api/community/audio?id=${m.audioId}`} className="mb-1 h-10 w-60 max-w-full" />}
                        {m.body && <p className="whitespace-pre-wrap break-words"><Linkified text={m.body} /></p>}
                        {m.body && <LinkPreview text={m.body} />}
                        <p className="mt-0.5 flex items-center justify-end gap-2 text-[10px] text-muted">
                          {mine && (
                            <button className="hidden text-down hover:underline group-hover:inline" onClick={async () => {
                              if (!confirm("Apagar esta mensagem para os dois?")) return;
                              const r = await fetch(`/api/community/dm?id=${m.id}`, { method: "DELETE" });
                              if (r.ok) setMsgs((o) => o.filter((x) => x.id !== m.id));
                            }}>apagar</button>
                          )}
                          {clock(m.createdAt)}{mine && <span aria-label={m.readAt ? "Lida" : "Enviada"} className={m.readAt ? "text-up" : ""}>{m.readAt ? "✓✓" : "✓"}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={end} />
            </div>
            {blocked ? <p className="border-t border-line p-3 text-center text-sm text-muted">Você bloqueou este membro. Desbloqueie para conversar.</p> : <Composer to={active} onSent={onSent} />}
          </>
        )}
      </section>
    </div>
  );
}

function Composer({ to, onSent }: { to: number; onSent: () => void }) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<{ id: number; preview: string } | null>(null);
  const [audio, setAudio] = useState<{ id: number; url: string } | null>(null);
  const [rec, setRec] = useState<{ secs: number } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const recorder = useRef<{ mr: MediaRecorder; stream: MediaStream; chunks: Blob[]; timer: ReturnType<typeof setInterval>; cancelled: boolean } | null>(null);

  useEffect(() => { setBody(""); setErr(""); }, [to]);
  useEffect(() => {
    const el = area.current; if (!el) return;
    el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [body]);

  async function pickImage(f: File | undefined) {
    if (!f) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) return setErr("Formato não aceito. Use PNG, JPG, GIF ou WebP.");
    setErr(""); setBusy(true);
    const small = await shrink(f);
    const fd = new FormData(); fd.append("file", small, small.name || "foto.jpg");
    const res = await fetch("/api/community/image?dm=1", { method: "POST", body: fd });
    setBusy(false);
    const d = (await res.json().catch(() => null)) as { id?: number; error?: string } | null;
    if (!res.ok || !d?.id) return setErr(d?.error ?? "Não foi possível enviar a imagem.");
    setImage((o) => { if (o) URL.revokeObjectURL(o.preview); return { id: d.id!, preview: URL.createObjectURL(small) }; });
  }

  async function startRec() {
    setErr("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return setErr("Seu navegador não permite gravar áudio.");
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return setErr("Não consegui acessar o microfone. Permita o uso do microfone no navegador."); }
    const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
    const r = { mr, stream, chunks: [] as Blob[], cancelled: false, timer: setInterval(() => {
      setRec((o) => { if (o && o.secs + 1 >= 120) stopRec(); return o ? { secs: o.secs + 1 } : o; });
    }, 1000) };
    recorder.current = r;
    mr.ondataavailable = (e) => { if (e.data.size) r.chunks.push(e.data); };
    mr.onstop = async () => {
      clearInterval(r.timer); r.stream.getTracks().forEach((t) => t.stop()); setRec(null); recorder.current = null;
      if (r.cancelled || !r.chunks.length) return;
      const blob = new Blob(r.chunks, { type: mr.mimeType || "audio/webm" });
      setBusy(true);
      const fd = new FormData(); fd.append("file", blob, "audio");
      const res = await fetch("/api/community/audio?dm=1", { method: "POST", body: fd });
      setBusy(false);
      const d = (await res.json().catch(() => null)) as { id?: number; error?: string } | null;
      if (!res.ok || !d?.id) return setErr(d?.error ?? "Não foi possível enviar o áudio.");
      setAudio((o) => { if (o) URL.revokeObjectURL(o.url); return { id: d.id!, url: URL.createObjectURL(blob) }; });
    };
    mr.start(); setRec({ secs: 0 });
  }
  function stopRec() { if (recorder.current?.mr.state === "recording") recorder.current.mr.stop(); }
  function cancelRec() { if (recorder.current) { recorder.current.cancelled = true; stopRec(); } }
  useEffect(() => () => { if (recorder.current) { recorder.current.cancelled = true; clearInterval(recorder.current.timer); recorder.current.stream.getTracks().forEach((t) => t.stop()); } }, []);

  async function send() {
    if ((!body.trim() && !image && !audio) || busy || rec) return;
    setBusy(true); setErr("");
    const res = await fetch("/api/community/dm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to, body, imageId: image?.id ?? null, audioId: audio?.id ?? null }) });
    setBusy(false);
    if (!res.ok) return setErr(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível enviar.");
    setBody("");
    if (image) { URL.revokeObjectURL(image.preview); setImage(null); }
    if (audio) { URL.revokeObjectURL(audio.url); setAudio(null); }
    onSent();
    area.current?.focus();
  }

  return (
    <div className="border-t border-line p-3">
      {image && (
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-panel-2 p-2 text-xs text-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.preview} alt="Prévia da imagem" className="h-16 w-16 rounded-md object-cover" />
          <span className="flex-1">Foto pronta para enviar</span>
          <button className="underline hover:text-white" onClick={() => { URL.revokeObjectURL(image.preview); setImage(null); }}>remover</button>
        </div>
      )}
      {audio && (
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-panel-2 p-2">
          <audio controls src={audio.url} className="h-10 min-w-0 flex-1" />
          <button className="text-xs text-muted underline hover:text-white" onClick={() => { URL.revokeObjectURL(audio.url); setAudio(null); }}>remover</button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-line text-gold hover:bg-panel-2 disabled:opacity-50" title="Enviar foto" aria-label="Enviar foto" disabled={busy || !!image} onClick={() => file.current?.click()}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 3v12M3 9h12" /></svg>
        </button>
        {rec ? (
          <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-lg border border-down/50 bg-ink px-3 text-sm">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-down" aria-hidden />
            <span className="tabular-nums">Gravando… {Math.floor(rec.secs / 60)}:{String(rec.secs % 60).padStart(2, "0")}</span>
            <button type="button" className="ml-auto text-xs text-muted underline hover:text-white" onClick={cancelRec}>cancelar</button>
            <button type="button" className="btn btn-gold !py-1 text-xs" onClick={stopRec}>Parar</button>
          </div>
        ) : (
          <textarea ref={area} value={body} maxLength={1000} rows={1} onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Escreva uma mensagem" style={{ scrollbarWidth: "none" }}
            className="min-h-12 min-w-0 flex-1 resize-none rounded-lg border border-line bg-ink px-3 py-3 text-sm leading-6 outline-none focus:outline-none focus:ring-0 [&::-webkit-scrollbar]:hidden" />
        )}
        <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-line text-gold hover:bg-panel-2 disabled:opacity-50" title="Gravar áudio" aria-label="Gravar áudio" disabled={busy || !!rec || !!audio} onClick={startRec}>
          <ChannelIcon name="mic" size={20} />
        </button>
        <button type="button" className="btn btn-gold h-12 shrink-0 !py-0" onClick={send} disabled={busy || !!rec}>{busy ? "…" : "Enviar"}</button>
      </div>
      {err && <p className="mt-1 text-xs text-down">{err}</p>}
    </div>
  );
}
