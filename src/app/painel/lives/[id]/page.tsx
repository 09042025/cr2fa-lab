import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getOpenLive } from "@/lib/openlives";
import { Avatar } from "@/components/Avatar";
import { EndLiveButton, LiveChat } from "@/components/LivesClient";
import { LivePlayer } from "@/components/LivePlayer";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const live = getOpenLive(Number((await params).id));
  if (!live) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageTitle title="Live encerrada" subtitle="Esta transmissão terminou." />
        <Link href="/painel/lives" className="btn btn-gold">Ver lives abertas</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl">
      <p className="mb-3 text-sm"><Link href="/painel/lives" className="text-muted hover:text-white">← Lives Abertas</Link></p>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <section>
          {live.embed ? (
            <LivePlayer src={live.embed} label="Assistir à live" />
          ) : (
            <div className="card flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted">Esta live acontece no {live.platform}. Abra em uma nova aba e volte aqui para conversar no chat.</p>
              <a href={live.url} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-gold">Assistir no {live.platform}</a>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />AO VIVO</span>
            <h1 className="min-w-0 flex-1 font-semibold">{live.title}</h1>
            {(live.userId === user.id || user.role === "admin") && <EndLiveButton id={live.id} />}
          </div>
          <Link href={`/painel/feed/membro/${live.userId}`} className="mt-2 flex items-center gap-2 text-sm text-muted hover:text-white">
            <Avatar name={live.name} id={live.avatarId} size={28} /> {live.name} · {live.platform}
          </Link>
          <p className="mt-3 text-xs text-muted">A live é de responsabilidade de quem transmite e a opinião não é recomendação de investimento. Algo errado? Avise a moderação.</p>
        </section>
        <LiveChat liveId={live.id} />
      </div>
    </div>
  );
}
