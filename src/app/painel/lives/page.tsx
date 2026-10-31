import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listOpenLives } from "@/lib/openlives";
import { isBanned } from "@/lib/community";
import { Avatar } from "@/components/Avatar";
import { StartLive } from "@/components/LivesClient";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lives Abertas" };

const since = (t: number) => {
  const m = Math.max(0, Math.floor((Date.now() / 1000 - t) / 60));
  return m < 1 ? "agora" : m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)} h`;
};

export default async function Page() {
  const user = await requireUser();
  const lives = listOpenLives(user.id);
  const banned = user.role !== "admin" && isBanned(user.id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Lives Abertas" subtitle="Transmissões ao vivo dos membros. Entre, assista e converse no chat." />
      {!banned && <div className="mb-6"><StartLive hasActive={lives.some((l) => l.userId === user.id)} /></div>}
      {lives.length === 0 ? (
        <p className="card p-6 text-sm text-muted">Ninguém está ao vivo agora. Que tal começar a primeira live?</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lives.map((l) => (
            <li key={l.id}>
              <Link href={`/painel/lives/${l.id}`} className="card block p-4 transition hover:border-gold/50">
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />AO VIVO</span>
                <span className="mb-3 line-clamp-2 block font-semibold">{l.title}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <Avatar name={l.name} id={l.avatarId} size={28} />
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  <span>{l.platform} · {since(l.startedAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
