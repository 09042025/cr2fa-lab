"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function Msg({ error, ok }: { error: string | null; ok: string | null }) {
  if (error) return <p role="alert" className="rounded-lg border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">{error}</p>;
  if (ok) return <p role="status" className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold-soft">{ok}</p>;
  return null;
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState(email);
  const [value, setValue] = useState(email);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailChanging = value.trim().toLowerCase() !== currentEmail.toLowerCase();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = { name: String(form.get("name") || ""), email: String(form.get("email") || ""), currentPassword: String(form.get("currentPassword") || "") || undefined };
    try {
      const res = await fetch("/api/account/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error || "Não foi possível salvar. Tente novamente.");
      setCurrentEmail(body.email.trim().toLowerCase());
      setOk(data.emailChanged ? "Perfil salvo. A partir de agora, entre com o novo e-mail." : "Perfil salvo.");
      router.refresh();
    } catch {
      setError("Sem conexão com o servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input id="name" name="name" className="input" defaultValue={name} required minLength={2} maxLength={80} autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="input" value={value} onChange={(e) => setValue(e.target.value)} required autoComplete="email" />
      </div>
      {emailChanging && (
        <div>
          <label className="label" htmlFor="currentPassword">Senha atual (necessária para trocar o e-mail)</label>
          <input id="currentPassword" name="currentPassword" type="password" className="input" required autoComplete="current-password" />
        </div>
      )}
      <Msg error={error} ok={ok} />
      <button className="btn btn-gold w-full sm:w-auto" disabled={loading}>{loading ? "Salvando..." : "Salvar perfil"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const body = { current: String(form.get("current") || ""), next: String(form.get("next") || "") };
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error || "Não foi possível alterar a senha. Tente novamente.");
      formEl.reset();
      setOk("Senha alterada.");
    } catch {
      setError("Sem conexão com o servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="current">Senha atual</label>
        <input id="current" name="current" type="password" className="input" required autoComplete="current-password" />
      </div>
      <div>
        <label className="label" htmlFor="next">Nova senha</label>
        <input id="next" name="next" type="password" className="input" required minLength={10} autoComplete="new-password" />
        <p className="mt-1 text-xs text-muted">Mínimo de 10 caracteres, com letras e números.</p>
      </div>
      <Msg error={error} ok={ok} />
      <button className="btn btn-gold w-full sm:w-auto" disabled={loading}>{loading ? "Salvando..." : "Alterar senha"}</button>
    </form>
  );
}
