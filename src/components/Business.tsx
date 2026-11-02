"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const inp = "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-white outline-none focus:border-gold/60";
const btn = "rounded-lg bg-gradient-to-b from-gold-soft to-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-60";

interface Initial {
  id?: number; kind: string; category: string; title: string; description: string; city: string; state: string; priceNote: string;
  whatsapp: string; instagram: string; website: string; googleRating: string; googleUrl: string; cases: { title: string; text: string; link: string }[];
}

export function ListingForm({ initial, categories, states }: { initial: Initial; categories: { id: string; label: string }[]; states: string[] }) {
  const router = useRouter();
  const [f, setF] = useState<Initial>({ ...initial, cases: [...initial.cases, ...Array(Math.max(0, 3 - initial.cases.length)).fill({ title: "", text: "", link: "" })] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof Initial, v: string) => setF((p) => ({ ...p, [k]: v }));
  const setCase = (i: number, k: "title" | "text" | "link", v: string) => setF((p) => ({ ...p, cases: p.cases.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const r = await fetch("/api/community/negocios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, googleRating: f.googleRating.trim() ? Number(f.googleRating.replace(",", ".")) : null }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error ?? "Não foi possível salvar.");
    router.push(`/painel/negocios/${d.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card max-w-3xl space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted">O que você anuncia
          <select className={inp} value={f.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="service">Serviço (eu presto o serviço)</option>
            <option value="product">Produto (eu vendo)</option>
          </select>
        </label>
        <label className="text-xs text-muted">Categoria
          <select className={inp} value={f.category} onChange={(e) => set("category", e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-xs text-muted">Título do anúncio
        <input className={inp} maxLength={80} placeholder="Ex.: Pintura residencial com garantia" value={f.title} onChange={(e) => set("title", e.target.value)} />
      </label>
      <label className="block text-xs text-muted">Descrição (o que faz, diferenciais, como trabalha)
        <textarea className={inp} rows={5} maxLength={1200} value={f.description} onChange={(e) => set("description", e.target.value)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted sm:col-span-1">Cidade<input className={inp} maxLength={60} value={f.city} onChange={(e) => set("city", e.target.value)} /></label>
        <label className="text-xs text-muted">Estado
          <select className={inp} value={f.state} onChange={(e) => set("state", e.target.value)}>
            <option value="">Todo o Brasil / online</option>
            {states.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted">Valor (opcional)<input className={inp} maxLength={80} placeholder="Ex.: a partir de R$ 150" value={f.priceNote} onChange={(e) => set("priceNote", e.target.value)} /></label>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gold/80">Contato (ao menos um)</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted">WhatsApp (com DDD)<input className={inp} inputMode="tel" placeholder="11999998888" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></label>
          <label className="text-xs text-muted">Instagram<input className={inp} placeholder="@seuperfil" value={f.instagram} onChange={(e) => set("instagram", e.target.value)} /></label>
          <label className="text-xs text-muted">Site<input className={inp} placeholder="https://…" value={f.website} onChange={(e) => set("website", e.target.value)} /></label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gold/80">Confiança (opcional, mas aumenta muito as chances)</legend>
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <label className="text-xs text-muted">Nota no Google<input className={inp} inputMode="decimal" placeholder="4,8" value={f.googleRating} onChange={(e) => set("googleRating", e.target.value)} /></label>
          <label className="text-xs text-muted">Link do seu perfil no Google (para os membros conferirem)<input className={inp} placeholder="https://g.page/… ou link do Google Maps" value={f.googleUrl} onChange={(e) => set("googleUrl", e.target.value)} /></label>
        </div>
        <p className="text-xs font-semibold text-muted">Cases de sucesso (até 3)</p>
        {f.cases.map((c, i) => (
          <div key={i} className="grid gap-2 rounded-lg bg-panel-2/60 p-3 sm:grid-cols-2">
            <input className={inp} maxLength={80} placeholder={`Case ${i + 1}: título`} value={c.title} onChange={(e) => setCase(i, "title", e.target.value)} />
            <input className={inp} placeholder="Link de comprovação (opcional)" value={c.link} onChange={(e) => setCase(i, "link", e.target.value)} />
            <textarea className={`${inp} sm:col-span-2`} rows={2} maxLength={400} placeholder="O que foi feito e qual foi o resultado" value={c.text} onChange={(e) => setCase(i, "text", e.target.value)} />
          </div>
        ))}
      </fieldset>

      <p className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-muted">
        Ao publicar, você declara que as informações são verdadeiras. A plataforma apenas divulga o seu anúncio: não intermedeia a venda e não se responsabiliza pelo serviço ou produto. Anúncios com informações falsas, golpes ou promessas de ganho garantido são removidos.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} className={btn}>{busy ? "Salvando…" : f.id ? "Salvar alterações" : "Publicar anúncio"}</button>
        {err && <span role="alert" className="text-sm text-down">{err}</span>}
      </div>
    </form>
  );
}

export function RecForm({ listingId, mine }: { listingId: number; mine?: { hired: boolean; comment: string } }) {
  const router = useRouter();
  const [hired, setHired] = useState(mine?.hired ?? false);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const r = await fetch("/api/community/negocios/rec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, hired, comment }) });
    setBusy(false);
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Erro ao enviar.");
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-line p-3">
      <p className="text-sm font-semibold text-white">{mine ? "Atualizar a sua indicação" : "Indicar este anúncio"}</p>
      <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={hired} onChange={(e) => setHired(e.target.checked)} /> Eu já contratei / comprei</label>
      <textarea className={inp} rows={3} maxLength={400} placeholder="Como foi a sua experiência? (seja honesto: isso ajuda outros membros)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3"><button disabled={busy} className={btn}>{busy ? "Enviando…" : "Enviar indicação"}</button>{err && <span role="alert" className="text-sm text-down">{err}</span>}</div>
    </form>
  );
}

export function ListingActions({ id, canEdit, canReport }: { id: number; canEdit: boolean; canReport: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  async function del() {
    if (!confirm("Apagar este anúncio?")) return;
    const r = await fetch(`/api/community/negocios?id=${id}`, { method: "DELETE" });
    if (r.ok) { router.push("/painel/negocios"); router.refresh(); }
  }
  async function report() {
    const reason = prompt("Qual o problema com este anúncio? (golpe, informação falsa, ofensivo…)");
    if (!reason) return;
    const r = await fetch("/api/community/negocios/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: id, reason }) });
    setMsg(r.ok ? "Denúncia enviada à moderação. Obrigado." : "Não foi possível denunciar.");
    router.refresh();
  }
  return (
    <p className="flex flex-wrap items-center gap-4 text-xs">
      {canEdit && <a href={`/painel/negocios/novo?id=${id}`} className="text-gold-soft underline">editar anúncio</a>}
      {canEdit && <button type="button" onClick={del} className="text-down underline">apagar anúncio</button>}
      {canReport && <button type="button" onClick={report} className="text-muted underline hover:text-white">denunciar</button>}
      {msg && <span className="text-up">{msg}</span>}
    </p>
  );
}

export function RemoveRec({ id }: { id: number }) {
  const router = useRouter();
  return <button type="button" className="text-xs text-down underline" onClick={async () => { if (!confirm("Apagar esta indicação?")) return; await fetch(`/api/community/negocios/rec?id=${id}`, { method: "DELETE" }); router.refresh(); }}>apagar</button>;
}
