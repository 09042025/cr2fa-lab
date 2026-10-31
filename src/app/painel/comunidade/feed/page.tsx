import { redirect } from "next/navigation";

/** Endereço antigo: o Feed agora é uma página própria. */
export default async function OldFeed({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const qs = new URLSearchParams(Object.entries(await searchParams).filter(([, v]) => v) as [string, string][]).toString();
  redirect(`/painel/feed${qs ? `?${qs}` : ""}`);
}
