"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";

const LOCK_KEY = "niza-face-lock";
const ACTIVE_KEY = "niza-last-active";
const IDLE_MS = 10 * 60 * 1000;
const post = (url: string, body: unknown = {}) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const getLock = () => { try { return localStorage.getItem(LOCK_KEY) === "1"; } catch { return false; } };
const setLockFlag = (on: boolean) => { try { if (on) localStorage.setItem(LOCK_KEY, "1"); else localStorage.removeItem(LOCK_KEY); } catch { /* ignora */ } };

/** Pede o Face ID ao iPhone e confirma no servidor. Devolve a próxima página ou uma mensagem de erro. */
async function faceIdLogin(): Promise<{ next?: string; error?: string }> {
  try {
    const o = await post("/api/passkey/login/options");
    const od = await o.json().catch(() => ({}));
    if (!o.ok) return { error: od.error || "Não foi possível iniciar o Face ID." };
    const asRes = await startAuthentication({ optionsJSON: od.options });
    const v = await post("/api/passkey/login/verify", { challengeId: od.challengeId, response: asRes });
    const vd = await v.json().catch(() => ({}));
    return v.ok ? { next: vd.next || "/painel" } : { error: vd.error || "Face ID não reconhecido." };
  } catch (e) {
    const n = (e as { name?: string })?.name;
    return { error: n === "NotAllowedError" ? "Face ID cancelado." : "Face ID não disponível. Use e-mail e senha." };
  }
}

/** Botão "Entrar com Face ID" da tela de login. */
export function FaceIdLoginButton() {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setOk(browserSupportsWebAuthn()); }, []);
  if (!ok) return null;
  return (
    <div className="mb-4">
      <button type="button" disabled={busy} className="btn btn-gold w-full" onClick={async () => {
        setErr(null); setBusy(true);
        const r = await faceIdLogin();
        setBusy(false);
        if (r.next) { router.push(r.next); router.refresh(); } else setErr(r.error ?? null);
      }}>{busy ? "Aguarde..." : "Entrar com Face ID"}</button>
      {err && <p role="alert" className="mt-2 text-sm text-down">{err}</p>}
      <p className="my-3 text-center text-xs text-muted">ou use e-mail e senha</p>
    </div>
  );
}

/** Cartão das Configurações: ativar/remover o Face ID e escolher se o app abre trancado. */
export function FaceIdSettings({ keys }: { keys: { id: number; name: string }[] }) {
  const router = useRouter();
  const [ok, setOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lock, setLock] = useState(false);
  useEffect(() => { setOk(browserSupportsWebAuthn()); setLock(getLock()); }, []);

  async function enable() {
    setMsg(null); setBusy(true);
    try {
      const o = await post("/api/passkey/register/options");
      const od = await o.json().catch(() => ({}));
      if (!o.ok) throw new Error(od.error || "Falha ao iniciar.");
      const reg = await startRegistration({ optionsJSON: od.options });
      const v = await post("/api/passkey/register/verify", { challengeId: od.challengeId, response: reg });
      const vd = await v.json().catch(() => ({}));
      if (!v.ok) throw new Error(vd.error || "Falha ao confirmar.");
      setMsg("Face ID ativado neste aparelho.");
      router.refresh();
    } catch (e) {
      const n = (e as { name?: string })?.name;
      setMsg(n === "NotAllowedError" ? "Face ID cancelado." : n === "InvalidStateError" ? "Este aparelho já está cadastrado." : (e as Error).message || "Não foi possível ativar.");
    } finally { setBusy(false); }
  }
  async function remove() {
    await fetch("/api/passkey", { method: "DELETE", headers: { "content-type": "application/json" }, body: "{}" });
    setLockFlag(false); setLock(false); setMsg("Face ID removido."); router.refresh();
  }

  if (!ok) return <p className="text-sm text-muted">Este navegador não aceita Face ID.</p>;
  return (
    <div className="space-y-4">
      {keys.length === 0 ? (
        <>
          <p className="text-sm text-muted">Entre e destrave o app com o rosto, sem digitar a senha. Funciona no iPhone com Face ID (ou digital, em outros aparelhos).</p>
          <button type="button" className="btn btn-gold sm:max-w-xs" disabled={busy} onClick={enable}>{busy ? "Aguarde..." : "Ativar Face ID neste aparelho"}</button>
        </>
      ) : (
        <>
          <p className="text-sm text-up">Face ID ativo ({keys.length} {keys.length === 1 ? "aparelho" : "aparelhos"}).</p>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[#d9b45a]" checked={lock} onChange={(e) => { setLock(e.target.checked); setLockFlag(e.target.checked); try { localStorage.setItem(ACTIVE_KEY, String(Date.now())); } catch { /* ignora */ } }} />
            Pedir Face ID depois de 10 minutos sem usar o app (neste aparelho)
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={enable}>Cadastrar este aparelho de novo</button>
            <button type="button" className="btn btn-ghost" onClick={remove}>Remover Face ID</button>
          </div>
        </>
      )}
      {msg && <p role="status" className="text-sm text-gold-soft">{msg}</p>}
    </div>
  );
}

/** Tela de bloqueio: aparece depois de 10 minutos sem uso quando o Face ID está ligado neste aparelho. */
export function AppLock() {
  const router = useRouter();
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  lockedRef.current = locked;
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tried = useRef(false);

  // Só tranca depois de 10 minutos sem usar o app (o último uso fica guardado neste aparelho).
  useEffect(() => {
    const stamp = () => { try { localStorage.setItem(ACTIVE_KEY, String(Date.now())); } catch { /* ignora */ } };
    const idle = () => { try { const t = Number(localStorage.getItem(ACTIVE_KEY) || 0); return !t || Date.now() - t > IDLE_MS; } catch { return true; } };
    const check = () => { if (getLock() && browserSupportsWebAuthn() && idle()) { tried.current = false; setLocked(true); } };
    check();
    let last = 0;
    const act = () => { const n = Date.now(); if (n - last > 5000 && !lockedRef.current) { last = n; stamp(); } };
    const vis = () => { if (document.visibilityState === "visible") check(); else if (!lockedRef.current) stamp(); };
    const evs = ["touchstart", "click", "keydown", "scroll"] as const;
    evs.forEach((e) => window.addEventListener(e, act, { passive: true }));
    document.addEventListener("visibilitychange", vis);
    const iv = window.setInterval(check, 30000);
    return () => { evs.forEach((e) => window.removeEventListener(e, act)); document.removeEventListener("visibilitychange", vis); window.clearInterval(iv); };
  }, []);

  async function unlock() {
    setErr(null); setBusy(true);
    const r = await faceIdLogin();
    setBusy(false);
    if (r.next) { try { localStorage.setItem(ACTIVE_KEY, String(Date.now())); } catch { /* ignora */ } setLocked(false); } else setErr(r.error ?? null);
  }
  useEffect(() => { if (locked && !tried.current) { tried.current = true; void unlock(); } }, [locked]);

  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [locked]);

  if (!locked) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-ink px-6 text-center" role="dialog" aria-label="App bloqueado">
      <div className="font-display text-2xl font-bold text-gold-soft">NIZA HUB</div>
      <p className="text-sm text-muted">App bloqueado</p>
      <button type="button" className="btn btn-gold w-full max-w-xs" disabled={busy} onClick={unlock}>{busy ? "Aguarde..." : "Desbloquear com Face ID"}</button>
      {err && <p role="alert" className="text-sm text-down">{err}</p>}
      <button type="button" className="text-xs text-muted underline" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); setLockFlag(false); router.push("/entrar"); router.refresh(); }}>Entrar com senha</button>
    </div>
  );
}
