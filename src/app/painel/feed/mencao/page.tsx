import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

/** Abre o perfil de quem foi marcado com @Nome. Se mais de um membro tem o mesmo primeiro nome, mostra a lista. */
export default async function MentionPage({ searchParams }: { searchParams: Promise<{ nome?: string }> }) {
  await requireUser();
  const nome = ((await searchParams).nome ?? "").trim().slice(0, 40).toLowerCase();
  const rows = nome
    ? (db()
        .prepare("SELECT id, name, avatar_id avatarId FROM users WHERE lower(substr(name, 1, instr(name || ' ', ' ') - 1)) = ? ORDER BY name LIMIT 20")
        .all(nome) as { id: number; name: string; avatarId: number | null }[])
    : [];
  if (rows.length === 1) redirect(`/painel/feed/membro/${rows[0].id}`);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-xl font-bold">{rows.length ? `Membros chamados “${nome}”` : "Membro não encontrado"}</h1>
      {rows.length === 0 && <p className="mt-3 text-sm text-muted">Não achamos ninguém com esse nome. <Link href="/painel/feed" className="text-gold-soft underline">Voltar ao Feed</Link></p>}
      <ul className="mt-4 space-y-2">
        {rows.map((m) => (
          <li key={m.id}>
            <Link href={`/painel/feed/membro/${m.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3 hover:bg-panel-2">
              <Avatar name={m.name} id={m.avatarId} size={40} />
              <span className="font-semibold">{m.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
