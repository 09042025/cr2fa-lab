"use client";

import { useRouter } from "next/navigation";

export function AdminPlanButtons({ userId, isPro, email, isAdmin = false }: { userId: number; isPro: boolean; email: string; isAdmin?: boolean }) {
  const router = useRouter();
  async function set(plan: "free" | "pro", days?: number) {
    const res = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, days }) });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || "Erro.");
    router.refresh();
  }
  async function remove() {
    const typed = window.prompt(`Excluir a conta ${email}?\n\nIsso apaga a conta, o portfólio e o histórico de pedidos dela e não pode ser desfeito.\n\nPara confirmar, digite o e-mail da conta:`);
    if (typed === null) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmEmail: typed }) });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || "Erro.");
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      {!isAdmin && <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => set("pro", 31)}>+ Pró 31 dias</button>}
      {!isAdmin && isPro && <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => set("free")}>Tornar grátis</button>}
      <button className="btn btn-ghost !px-2 !py-1 text-xs !text-down" onClick={remove}>Excluir</button>
    </div>
  );
}
