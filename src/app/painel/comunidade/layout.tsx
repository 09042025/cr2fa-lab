import { requireUser } from "@/lib/auth";
import { Locked, PageTitle } from "@/components/ui";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pro = user.plan === "pro" || user.role === "admin";
  if (!pro) {
    return (
      <>
        <PageTitle title="Comunidade" subtitle="Chat, canais e Lives VIP dos membros." />
        <Locked feature="Comunidade (exclusivo do plano Pró)" text="A Comunidade inteira — chat, canais e Lives VIP — faz parte do plano Pró. No Grátis você continua com o Feed, as Notícias e as Lives Abertas." />
      </>
    );
  }
  return (
    <>
      {children}
    </>
  );
}
