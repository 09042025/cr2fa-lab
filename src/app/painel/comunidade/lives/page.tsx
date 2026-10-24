import { requireUser } from "@/lib/auth";
import { Locked, PageTitle } from "@/components/ui";

export default async function Page() {
  const user = await requireUser();
  if (user.plan !== "pro" && user.role !== "admin") return <><PageTitle title="Lives" subtitle="Transmissões ao vivo." /><Locked feature="Lives (exclusivo do plano Pró)" text="Este espaço da comunidade faz parte do plano Pró. No Grátis você participa do Feed, das Notícias e do chat-geral." /></>;
  return (
    <>
      <PageTitle title="Lives" subtitle="Em breve." />
      <p className="card p-6 text-sm text-muted">Estamos preparando esta seção.</p>
    </>
  );
}
