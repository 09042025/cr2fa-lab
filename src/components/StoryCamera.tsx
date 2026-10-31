"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_STORY_SECONDS = 60; // mesmo limite de um story do Instagram

export type Captured = { kind: "photo"; blob: Blob } | { kind: "video"; blob: Blob; poster: Blob };

interface Filter { id: string; label: string; gray: number; sepia: number; sat: number; con: number; bri: number }
export const FILTERS: Filter[] = [
  { id: "normal", label: "Normal", gray: 0, sepia: 0, sat: 1, con: 1, bri: 1 },
  { id: "pb", label: "P&B", gray: 1, sepia: 0, sat: 1, con: 1.1, bri: 1 },
  { id: "sepia", label: "Sépia", gray: 0, sepia: 0.85, sat: 1, con: 1, bri: 1 },
  { id: "quente", label: "Quente", gray: 0, sepia: 0.28, sat: 1.4, con: 1.05, bri: 1.03 },
  { id: "vivido", label: "Vívido", gray: 0, sepia: 0, sat: 1.7, con: 1.1, bri: 1 },
  { id: "cinema", label: "Cinema", gray: 0, sepia: 0.1, sat: 0.8, con: 1.25, bri: 0.95 },
  { id: "suave", label: "Suave", gray: 0, sepia: 0, sat: 0.9, con: 0.9, bri: 1.1 },
];

const css = (f: Filter) => `grayscale(${f.gray}) sepia(${f.sepia}) saturate(${f.sat}) contrast(${f.con}) brightness(${f.bri})`;

/** Plano B para navegadores sem ctx.filter (Safari/iPhone): aplica o filtro pixel a pixel. */
function applyPixels(ctx: CanvasRenderingContext2D, w: number, h: number, f: Filter) {
  if (f.id === "normal") return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r *= f.bri; g *= f.bri; b *= f.bri;
    r = (r - 128) * f.con + 128; g = (g - 128) * f.con + 128; b = (b - 128) * f.con + 128;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * f.sat; g = l + (g - l) * f.sat; b = l + (b - l) * f.sat;
    if (f.gray) { r += (l - r) * f.gray; g += (l - g) * f.gray; b += (l - b) * f.gray; }
    if (f.sepia) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b, sg = 0.349 * r + 0.686 * g + 0.168 * b, sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r += (sr - r) * f.sepia; g += (sg - g) * f.sepia; b += (sb - b) * f.sepia;
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
}

function pickMime(): string {
  const list = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return list.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

/** Câmera em tela cheia: foto ou vídeo (até 60 s) com filtros ao vivo, gravados junto com a imagem. */
export function StoryCamera({ onCapture, onClose }: { onCapture: (c: Captured) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef(0);
  const filter = useRef<Filter>(FILTERS[0]);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const t0 = useRef(0);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [fid, setFid] = useState("normal");
  const [mode, setMode] = useState<"foto" | "video">("foto");
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const hasFilter = typeof document !== "undefined" && "filter" in document.createElement("canvas").getContext("2d")!;
  const W = hasFilter ? 720 : 540, H = hasFilter ? 1280 : 960;

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const draw = useCallback(() => {
    const v = video.current, c = canvas.current;
    if (v && c && v.videoWidth) {
      const ctx = c.getContext("2d", { willReadFrequently: !hasFilter })!;
      const f = filter.current;
      // recorte "cover" para 9:16
      const vr = v.videoWidth / v.videoHeight, cr = W / H;
      let sw = v.videoWidth, sh = v.videoHeight, sx = 0, sy = 0;
      if (vr > cr) { sw = v.videoHeight * cr; sx = (v.videoWidth - sw) / 2; } else { sh = v.videoWidth / cr; sy = (v.videoHeight - sh) / 2; }
      ctx.save();
      if (facing === "user") { ctx.translate(W, 0); ctx.scale(-1, 1); } // selfie em espelho
      if (hasFilter) ctx.filter = css(f);
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, W, H);
      ctx.restore();
      if (!hasFilter) applyPixels(ctx, W, H, f);
    }
    raf.current = requestAnimationFrame(draw);
  }, [facing, hasFilter, W, H]);

  useEffect(() => {
    let dead = false;
    setReady(false);
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setErr("Este navegador não permite usar a câmera. Use o botão Galeria.");
      const base = { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } };
      let s: MediaStream;
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: base, audio: true });
      } catch {
        try { s = await navigator.mediaDevices.getUserMedia({ video: base }); } catch {
          return setErr("Não consegui abrir a câmera. Permita o acesso à câmera nas configurações do navegador, ou use a Galeria.");
        }
      }
      if (dead) { s.getTracks().forEach((t) => t.stop()); return; }
      stream.current = s;
      const v = video.current!;
      v.srcObject = s;
      v.muted = true;
      await v.play().catch(() => {});
      setReady(true);
      raf.current = requestAnimationFrame(draw);
    })();
    return () => { dead = true; stop(); };
  }, [facing, draw, stop]);

  useEffect(() => { filter.current = FILTERS.find((f) => f.id === fid) ?? FILTERS[0]; }, [fid]);

  const toBlob = (q = 0.88) => new Promise<Blob | null>((res) => canvas.current!.toBlob(res, "image/jpeg", q));

  async function shoot() {
    const b = await toBlob();
    if (b) { stop(); onCapture({ kind: "photo", blob: b }); }
  }

  async function startRec() {
    const c = canvas.current!;
    const out = c.captureStream(30);
    stream.current?.getAudioTracks().forEach((t) => out.addTrack(t));
    const mime = pickMime();
    let mr: MediaRecorder;
    try { mr = new MediaRecorder(out, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 1_200_000, audioBitsPerSecond: 64_000 }); }
    catch { return setErr("Este aparelho não grava vídeo pelo navegador. Use a Galeria."); }
    chunks.current = [];
    mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    mr.onstop = async () => {
      const poster = await toBlob(0.8);
      const blob = new Blob(chunks.current, { type: mr.mimeType || mime || "video/webm" });
      if (poster && blob.size) { stop(); onCapture({ kind: "video", blob, poster }); }
      setRecording(false);
    };
    mr.start(500);
    rec.current = mr;
    t0.current = Date.now();
    setSecs(0);
    setRecording(true);
  }

  useEffect(() => {
    if (!recording) return;
    const iv = setInterval(() => {
      const s = (Date.now() - t0.current) / 1000;
      setSecs(s);
      if (s >= MAX_STORY_SECONDS) { clearInterval(iv); rec.current?.stop(); }
    }, 200);
    return () => clearInterval(iv);
  }, [recording]);

  function close() { if (rec.current?.state === "recording") { rec.current.onstop = null; rec.current.stop(); } stop(); onClose(); }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black" role="dialog" aria-modal="true" aria-label="Câmera">
      <div className="relative flex h-full w-full max-w-md flex-col bg-black">
        <video ref={video} playsInline muted className="hidden" />
        <canvas ref={canvas} width={W} height={H} className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative z-10 flex items-center justify-between p-3 text-white">
          <button type="button" onClick={close} aria-label="Fechar câmera" className="px-2 text-2xl leading-none">×</button>
          {recording ? <span className="rounded-full bg-red-600 px-3 py-0.5 text-xs font-semibold">● {Math.floor(secs)}s / {MAX_STORY_SECONDS}s</span> : <span className="text-xs text-white/70">{mode === "video" ? `Vídeo até ${MAX_STORY_SECONDS} s` : "Foto"}</span>}
          <button type="button" disabled={recording} onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} aria-label="Virar câmera" className="px-2 text-xl disabled:opacity-40">⟲</button>
        </div>
        {recording && <div className="relative z-10 mx-3 h-1 overflow-hidden rounded bg-white/30"><div className="h-full bg-red-500" style={{ width: `${(secs / MAX_STORY_SECONDS) * 100}%` }} /></div>}
        {err && <p className="relative z-10 m-4 rounded-lg bg-black/70 p-3 text-center text-sm text-gold-soft">{err}</p>}
        <div className="relative z-10 mt-auto space-y-3 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" onClick={() => setFid(f.id)} className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${fid === f.id ? "border-gold bg-gold/20 text-gold-soft" : "border-white/30 text-white"}`}>{f.label}</button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-8">
            <div className="flex gap-2 text-xs text-white">
              {(["foto", "video"] as const).map((m) => (
                <button key={m} type="button" disabled={recording} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 ${mode === m ? "bg-white text-black" : "border border-white/40"}`}>{m === "foto" ? "Foto" : "Vídeo"}</button>
              ))}
            </div>
            <button
              type="button"
              disabled={!ready}
              onClick={() => (mode === "foto" ? shoot() : recording ? rec.current?.stop() : startRec())}
              aria-label={mode === "foto" ? "Tirar foto" : recording ? "Parar gravação" : "Começar a gravar"}
              className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-white disabled:opacity-40 ${mode === "video" ? "bg-red-600/90" : "bg-white/20"}`}
            >
              {recording && <span className="h-5 w-5 rounded-sm bg-white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
