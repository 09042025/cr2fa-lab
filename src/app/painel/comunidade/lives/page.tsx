import { requireUser } from "@/lib/auth";
import { getVideos, YT_CHANNEL_ID, YT_CHANNEL_URL } from "@/lib/lives";
import { LivePlayer } from "@/components/LivePlayer";
import { Locked, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

const day = (t: number) => new Date(t * 1000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" });

export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const user = await requireUser();
  if (user.plan !== "pro" && user.role !== "admin") return <><PageTitle title="Lives VIP" subtitle="Transmissões ao vivo para assinantes Pró." /><Locked feature="Lives VIP (exclusivo do plano Pró)" text="Este espaço da comunidade faz parte do plano Pró. No Grátis você participa do Feed, das Notícias e do chat-geral." /></>;
  const res = await getVideos();
  const vids = res.data ?? [];
  const wanted = (await searchParams).v;
  const sel = vids.find((v) => v.id === wanted);
  return (
    <>
      <PageTitle title="Lives VIP" subtitle="Acompanhe as transmissões ao vivo do Emerson e reveja os vídeos anteriores." />
      <section className="mb-6">
        <h2 className="mb-2 flex items-center gap-2 font-semibold">
          {sel ? sel.title : <><span className="inline-block h-2.5 w-2.5 rounded-full bg-down" aria-hidden /> Ao vivo</>}
        </h2>
        <LivePlayer
          key={sel?.id ?? "live"}
          src={sel ? `https://www.youtube.com/embed/${sel.id}?autoplay=1&rel=0` : `https://www.youtube.com/embed/live_stream?channel=${YT_CHANNEL_ID}&autoplay=1`}
          label={sel ? "Assistir vídeo" : "Assistir à live"}
          poster={sel ? `https://i.ytimg.com/vi/${sel.id}/hqdefault.jpg` : undefined}
        />
        <p className="mt-2 text-xs text-muted">
          {sel ? "" : "Se não houver transmissão no momento, o YouTube mostrará um aviso: volte quando a live começar. "}
          <a href={YT_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="text-gold-soft underline">Abrir o canal no YouTube</a>
        </p>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Últimos vídeos</h2>
        {res.data === null && <p className="card border-down/40 p-4 text-sm text-down">Não foi possível carregar a lista de vídeos agora. Tente novamente em alguns minutos.</p>}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vids.map((v) => (
            <li key={v.id}>
              <a href={`/painel/comunidade/lives?v=${v.id}`} className="card block overflow-hidden transition hover:border-gold/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                <span className="block p-3"><span className="line-clamp-2 text-sm font-semibold">{v.title}</span><span className="text-xs text-muted">{day(v.at)}</span></span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
