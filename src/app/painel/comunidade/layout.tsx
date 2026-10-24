import { requireUser } from "@/lib/auth";
import { CommunityTabs } from "@/components/CommunityTabs";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <CommunityTabs pro={user.plan === "pro" || user.role === "admin"} />
      {children}
    </>
  );
}
