import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPlaylists } from "@/lib/courses";
import { NewPlaylist } from "@/components/CoursesAdmin";
import { getProfile, recommendedRank } from "@/lib/investor";
import { PlaylistList } from "@/components/PlaylistList";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const admin = user.role === "admin";
  const profile = getProfile(user.id)?.profile ?? null;
  const playlists = listPlaylists().map((p) => ({ ...p, rec: recommendedRank(profile, p.title) >= 0 }));
  return (
    <>
      <PageTitle title="Masterclass" subtitle="Aulas e análises de ativos, organizadas em playlists por tipo de ativo." />
      {!profile && <p className="mb-4 text-sm text-muted">Não sabe por onde começar? <Link href="/painel/perfil-investidor" className="text-gold-soft underline">Descubra o seu perfil de investidor</Link>.</p>}
      {admin && <NewPlaylist />}
      {playlists.length === 0 ? (
        <section className="card p-6 text-sm text-muted">{admin ? "Crie a primeira playlist acima (por exemplo, Ações ou Fundos imobiliários) e adicione as aulas." : "Estamos preparando as aulas. Assim que estiverem prontas, aparecem aqui para você."}</section>
      ) : (
        <PlaylistList playlists={playlists} admin={admin} />
      )}
    </>
  );
}
