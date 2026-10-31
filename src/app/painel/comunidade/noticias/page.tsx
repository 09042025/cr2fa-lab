import { redirect } from "next/navigation";

/** Endereço antigo: as Notícias agora têm item próprio no menu lateral. */
export default async function OldNews({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = (await searchParams).t;
  redirect(t ? `/painel/noticias?t=${encodeURIComponent(t)}` : "/painel/noticias");
}
