import { requireUser } from "@/lib/auth";
import { listPlaylists } from "@/lib/courses";
import { getProfile, recommendedRank } from "@/lib/investor";
import { InvestorProfileView } from "@/components/InvestorProfileView";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const saved = getProfile(user.id);
  const playlists = listPlaylists().map((p) => ({ id: p.id, title: p.title, rank: recommendedRank(saved?.profile ?? null, p.title) }));
  return (
    <>
      <PageTitle title="Perfil de investidor" subtitle="Responda 10 perguntas rápidas para descobrir se o CR2FA combina com você e por onde começar na Masterclass." />
      <InvestorProfileView saved={saved} playlists={playlists} />
    </>
  );
}
