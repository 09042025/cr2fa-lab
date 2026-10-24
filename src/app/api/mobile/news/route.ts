import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getNews, TOPICS, topicById } from "@/lib/news";

/** Notícias por tema para o app (livre para todos os planos, mas exige login). */
export async function GET(req: Request) {
  if (!(await getUser())) return fail("Sessão expirada. Entre de novo.", 401);
  const topic = topicById(new URL(req.url).searchParams.get("t") ?? undefined);
  const res = await getNews(topic);
  return json({
    topics: TOPICS.map((t) => ({ id: t.id, label: t.label })),
    topic: topic.id,
    items: res.data ?? [],
    fetchedAt: res.fetchedAt,
    stale: res.stale,
    failed: res.data === null,
  });
}
