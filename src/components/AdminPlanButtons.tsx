"use client";

import { useRouter } from "next/navigation";

export function AdminPlanButtons({ userId, isPro }: { userId: number; isPro: boolean }) {
  const router = useRouter();
  async function set(plan: "free" | "pro", days?: number) {
    const res = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, days }) });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || "Erro.");
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => set("pro", 31)}>+ Pró 31 dias</button>
      {isPro && <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => set("free")}>Tornar grátis</button>}
    </div>
  );
}
