"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ variant = "button" }: { variant?: "button" | "nav" }) {
  const router = useRouter();
  return (
    <button
      className={variant === "nav" ? "flex w-full items-center whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-panel-2 hover:text-white" : "btn btn-ghost w-full"}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      Sair
    </button>
  );
}
