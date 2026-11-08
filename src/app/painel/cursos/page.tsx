import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPlaylists } from "@/lib/courses";
import { MovePlaylist, NewPlaylist } from "@/components/CoursesAdmin";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const admin = user.role === "admin";
  const playlists = listPlaylists();
  return (
    <>
      <PageTitle title="Masterclass" subtitle="Aulas e análises de ativos, organizadas em playlists por tipo de ativo." />
      {admin && <NewPlaylist />}
      {playlists.length === 0 ? (
        <section className="card p-6 text-sm text-muted">{admin ? "Crie a primeira playlist acima (por exemplo, Ações ou Fundos imobiliários) e adicione as aulas." : "Estamos preparando as aulas. Assim que estiverem prontas, aparecem aqui para você."}</section>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {playlists.map((p) => (
            <li key={p.id} className="card flex flex-col gap-2 p-4">
              <Link href={`/painel/cursos/${p.id}`} className="font-display text-lg font-bold text-gold-soft hover:underline">{p.title}</Link>
              {p.description && <p className="text-sm text-muted">{p.description}</p>}
              <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted">
                <span>{p.lessons} {p.lessons === 1 ? "aula" : "aulas"}</span>
                {admin ? <MovePlaylist id={p.id} /> : <Link href={`/painel/cursos/${p.id}`} className="text-gold-soft hover:underline">Abrir →</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
