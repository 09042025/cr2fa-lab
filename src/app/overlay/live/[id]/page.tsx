import { LiveOverlay } from "@/components/LiveOverlay";

export const metadata = { title: "Overlay da live", robots: { index: false, follow: false } };

/** Página sem login, para ser "Fonte de navegador" no OBS: mostra o comentário que o apresentador destacou. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string }> }) {
  const id = Number((await params).id);
  const k = (await searchParams).k ?? "";
  return <LiveOverlay liveId={id} keyStr={k} />;
}
