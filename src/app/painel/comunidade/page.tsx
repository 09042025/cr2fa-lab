import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { canPost, findChannel, isBanned, listMessages, MAX_BODY, REACTIONS, splitMentions, VOICE, visibleCategories } from "@/lib/community";
import { AutoRefresh, BanButton, ChatForm, DeleteMessage, Reactions } from "@/components/CommunityChat";
import { Locked, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

const when = (t: number) => new Date(t * 1000).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string; r?: string }> }) {
  const user = await requireUser();
  if (user.plan !== "pro") {
    return (
      <>
        <PageTitle title="Comunidade" subtitle="Espaço dos assinantes Pró." />
        <Locked feature="Comunidade (exclusivo do plano Pró)" />
      </>
    );
  }
  const isAdmin = user.role === "admin";
  const sp = await searchParams;
  const ch = findChannel(sp.c, isAdmin);
  const messages = listMessages(ch.slug, user.id);
  const banned = !isAdmin && isBanned(user.id);
  const writable = canPost(ch, user) && !banned;
  const replying = messages.find((m) => String(m.id) === sp.r);
  const firstName = user.name.split(" ")[0].toLowerCase();

  return (
    <>
      <PageTitle title="Comunidade" subtitle="Canais de conversa dos assinantes Pró, moderados pela equipe." />
      <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
        <nav className="card p-3 text-sm" aria-label="Canais">
          {visibleCategories(isAdmin).map((cat) => (
            <div key={cat.id} className="mb-3">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{cat.label}</p>
              {cat.channels.map((c) => (
                <Link key={c.slug} href={`/painel/comunidade?c=${c.slug}`} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${c.slug === ch.slug ? "bg-panel-2 font-semibold text-gold-soft" : "text-muted hover:bg-panel-2 hover:text-white"}`}>
                  <span aria-hidden className="w-4 text-center">{c.icon}</span>
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
            </div>
          ))}
          <div>
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Canais de voz</p>
            {VOICE.map((v) => (
              <p key={v} className="flex items-center gap-2 px-2 py-1.5 text-muted/60" title="Em breve">
                <span aria-hidden className="w-4 text-center">🔊</span>{v}<span className="ml-auto text-[10px]">em breve</span>
              </p>
            ))}
          </div>
        </nav>

        <section className="card flex min-h-[28rem] flex-col p-4">
          <header className="mb-3 border-b border-line pb-3">
            <h2 className="font-semibold"><span className="text-gold-soft">{ch.icon === "#" ? "#" : ch.icon}</span> {ch.name}</h2>
            <p className="text-xs text-muted">{ch.description}</p>
          </header>
          {ch.intro && (
            <div className="mb-3 space-y-1 rounded-lg border border-gold/30 bg-panel-2 p-3 text-sm">
              {ch.intro.map((l, i) => <p key={i} className={i === 0 || l.startsWith("🚨") ? "font-semibold text-gold-soft" : "text-muted"}>{l}</p>)}
            </div>
          )}
          <ul className="flex max-h-[32rem] flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {messages.length === 0 && <li className="text-sm text-muted">Ainda não há mensagens neste canal.{writable ? " Seja o primeiro!" : ""}</li>}
            {messages.map((m) => (
              <li key={m.id} className="text-sm">
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold">{m.author}</span>
                  {m.banned && <span className="rounded bg-down/20 px-1.5 text-[10px] font-semibold uppercase text-down">Suspenso</span>}
                  {m.isAdmin && <span className="rounded bg-gold/20 px-1.5 text-[10px] font-semibold uppercase text-gold-soft">Admin</span>}
                  <span className="text-xs text-muted">{when(m.createdAt)}</span>
                  {(isAdmin || m.userId === user.id) && <DeleteMessage id={m.id} />}
                  {isAdmin && !m.isAdmin && m.userId !== user.id && <BanButton userId={m.userId} banned={m.banned} />}
                </p>
                {m.reply && <p className="mb-1 truncate border-l-2 border-gold/40 pl-2 text-xs text-muted">↪ <strong>{m.reply.author}</strong>: {m.reply.body}</p>}
                {m.body && (
                  <p className="whitespace-pre-wrap break-words text-muted">
                    {splitMentions(m.body).map((t, i) =>
                      t.mention ? <span key={i} className={`rounded px-0.5 font-medium ${t.text.slice(1).toLowerCase() === firstName ? "bg-gold/25 text-gold-soft" : "text-gold-soft"}`}>{t.text}</span> : <span key={i}>{t.text}</span>,
                    )}
                  </p>
                )}
                {m.imageId && (
                  <a href={`/api/community/image?id=${m.imageId}`} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/community/image?id=${m.imageId}`} alt={`Imagem enviada por ${m.author}`} loading="lazy" className="mt-1 max-h-72 max-w-full rounded-lg border border-line" />
                  </a>
                )}
                <Reactions id={m.id} items={m.reactions} all={REACTIONS} />
                {writable && <Link href={`/painel/comunidade?c=${ch.slug}&r=${m.id}`} className="mr-3 text-xs text-muted underline hover:text-white">responder</Link>}
              </li>
            ))}
            <AutoRefresh count={messages.length} />
          </ul>
          {writable ? <ChatForm channel={ch.slug} max={MAX_BODY} replyTo={replying ? { id: replying.id, author: replying.author, body: replying.body.slice(0, 80) || "imagem" } : null} /> : <p className="mt-3 rounded-lg bg-panel-2 p-3 text-xs text-muted">{banned ? "Você foi suspenso da comunidade pela moderação e não pode escrever. Fale com o suporte se achar que foi um engano." : "Canal somente leitura: só a equipe publica aqui."}</p>}
        </section>
      </div>
      <p className="mt-3 text-xs text-muted">Conteúdo da comunidade é opinião dos membros, não recomendação de investimento. Denuncie abusos à moderação.</p>
    </>
  );
}
