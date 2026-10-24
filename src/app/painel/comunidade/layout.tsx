import { requireUser } from "@/lib/auth";
import { CommunityTabs } from "@/components/CommunityTabs";
import { Locked, PageTitle } from "@/components/ui";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.plan !== "pro") {
    return (
      <>
        <PageTitle title="Comunidade" subtitle="Espaço dos assinantes Pró." />
        <Locked feature="Comunidade (exclusivo do plano Pró)" />
      </>
    );
  }
  return (
    <>
      <CommunityTabs />
      {children}
    </>
  );
}
