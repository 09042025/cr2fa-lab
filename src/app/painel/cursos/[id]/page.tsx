import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPlaylist, listLessons } from "@/lib/courses";
import { CoursePlayer } from "@/components/CoursePlayer";
import { PlaylistTools } from "@/components/CoursesAdmin";
import { Locked, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const pl = getPlaylist(Number((await params).id));
  if (!pl) notFound();
  const admin = user.role === "admin";
  const canAll = admin || user.plan === "pro";
  const lessons = listLessons(pl.id, canAll);
  const hasLocked = lessons.some((l) => l.locked);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/painel/cursos" className="text-gold-soft hover:underline">← Masterclass</Link></p>
      <PageTitle title={pl.title} subtitle={pl.description || undefined} />
      {admin && <PlaylistTools id={pl.id} title={pl.title} description={pl.description} />}
      <CoursePlayer playlistId={pl.id} lessons={lessons} admin={admin} />
      {hasLocked && <div className="mt-4"><Locked feature="Todas as aulas da Masterclass (exclusivo do plano Premium)" /></div>}
    </>
  );
}
