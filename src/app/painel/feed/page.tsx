import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isBanned } from "@/lib/community";
import { getMember, listPosts, MAX_POST, TOPICS } from "@/lib/feed";
import { PostForm } from "@/components/FeedClient";
import { StoriesBar } from "@/components/StoriesBar";
import { PostCard } from "@/components/PostCard";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feed da comunidade" };

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ t?: string; antes?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const topic = sp.t === "seguindo" ? "seguindo" : sp.t === "salvos" ? "salvos" : TOPICS.some((t) => t.id === sp.t) ? sp.t! : "todos";
  const avatarId = getMember(user.id, user.id)!.avatarId;
  const before = Number(sp.antes) || undefined;
  const { posts, more } = listPosts({ viewerId: user.id, topic: topic === "todos" || topic === "seguindo" || topic === "salvos" ? undefined : topic, following: topic === "seguindo", saved: topic === "salvos", before });
  const banned = user.role !== "admin" && isBanned(user.id);
  const chip = (id: string, label: string) => (
    <Link key={id} href={id === "todos" ? "/painel/feed" : `/painel/feed?t=${id}`} className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${topic === id ? "border-gold bg-gold/15 text-gold-soft" : "border-line text-muted hover:border-gold/50"}`}>{label}</Link>
  );
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Feed" subtitle="Publicações dos membros sobre investimentos: análises, dúvidas e ideias." />
      <StoriesBar me={{ id: user.id, name: user.name, avatarId: avatarId }} canPost={!banned} />
      {banned ? (
        <p className="card mb-5 p-4 text-sm text-muted">Você foi suspenso da comunidade pela moderação e não pode publicar. Fale com o suporte se achar que foi um engano.</p>
      ) : (
        <PostForm topics={TOPICS} max={MAX_POST} current={topic} />
      )}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{chip("todos", "Tudo")}{chip("seguindo", "Seguindo")}{chip("salvos", "Salvos")}{TOPICS.map((t) => chip(t.id, t.label))}</div>
      <div className="space-y-4">
        {posts.length === 0 && <p className="card p-6 text-sm text-muted">{topic === "salvos" ? "Você ainda não salvou nenhuma publicação. Toque no marcador de uma publicação para guardá-la aqui." : topic === "seguindo" ? "Você ainda não segue ninguém, ou quem você segue ainda não publicou. Visite o perfil de um membro e toque em Seguir." : `Ainda não há publicações${topic !== "todos" ? " neste assunto" : ""}. Seja o primeiro a compartilhar!`}</p>}
        {posts.map((p) => <PostCard key={p.id} p={p} viewer={{ id: user.id, role: user.role, name: user.name }} />)}
      </div>
      {more && posts.length > 0 && (
        <p className="mt-5 text-center"><Link className="btn btn-ghost" href={`/painel/feed?${topic !== "todos" ? `t=${topic}&` : ""}antes=${posts[posts.length - 1].id}`}>Ver publicações mais antigas</Link></p>
      )}
    </div>
  );
}
