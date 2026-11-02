import { requireUser } from "@/lib/auth";
import { Locked, PageTitle } from "@/components/ui";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pro = user.plan === "pro" || user.role === "admin";
  if (!pro) {
    return (
      <>
        <PageTitle title="White Flame Society" subtitle="Chat, canais e Lives VIP dos membros." />
        <Locked feature="White Flame Society (exclusivo do plano Premium)" text="A White Flame Society inteira — chat, canais e Lives VIP — faz parte do plano Premium. No Grátis você continua com o Feed, as Notícias e as Lives Abertas." />
      </>
    );
  }
  return (
    <>
      {children}
    </>
  );
}
