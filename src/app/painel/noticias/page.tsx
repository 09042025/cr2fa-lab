import { getNews, topicById } from "@/lib/news";
import { NewsTabs } from "@/components/NewsTabs";
import { DataStatus, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

function ago(t: number): string {
  const m = Math.max(0, Math.floor((Date.now() / 1000 - t) / 60));
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const topic = topicById((await searchParams).t);
  const res = await getNews(topic);
  const items = res.data ?? [];
  return (
    <>
      <PageTitle title="Notícias" subtitle="As principais notícias do dia sobre economia e investimentos, por tema. Ao clicar, você lê a matéria completa no site da fonte." />
      <NewsTabs active={topic.id} />
      <DataStatus result={res} source="portais de notícias (RSS)" />
      {res.data && items.length === 0 && <p className="card p-6 text-sm text-muted">Nenhuma notícia deste tema agora. Tente novamente mais tarde.</p>}
      <ul className="grid gap-3 lg:grid-cols-2">
        {items.map((n) => (
          <li key={n.url} className="card p-4">
            <p className="mb-1 text-xs text-muted"><span className="font-semibold text-gold-soft">{n.source}</span> · {ago(n.at)}</p>
            <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold leading-snug hover:text-gold-soft hover:underline">{n.title}</a>
            {n.summary && <p className="mt-1.5 line-clamp-3 text-sm text-muted">{n.summary}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">Notícias de terceiros, com os direitos de seus autores. Não são recomendação de investimento.</p>
    </>
  );
}
