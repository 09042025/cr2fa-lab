import { redirect } from "next/navigation";

/** Endereço antigo: os perfis agora ficam junto do Feed. */
export default async function OldMember({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const qs = new URLSearchParams(Object.entries(await searchParams).filter(([, v]) => v) as [string, string][]).toString();
  redirect(`/painel/feed/membro/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`);
}
