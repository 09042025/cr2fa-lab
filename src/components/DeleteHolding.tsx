"use client";

import { useRouter } from "next/navigation";

export function DeleteHolding({ id }: { id: number }) {
  const router = useRouter();
  return (
    <button
      className="text-xs text-down underline"
      onClick={async () => {
        await fetch(`/api/portfolio?id=${id}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      remover
    </button>
  );
}
