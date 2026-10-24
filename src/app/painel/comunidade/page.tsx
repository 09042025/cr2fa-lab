import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPostReports } from "@/lib/feed";
import { DismissPostReport, DeleteItem } from "@/components/FeedClient";
import { canPost, canView, findChannel, isBanned, listBlocked, listMessages, listReports, MAX_BODY, REACTIONS, REPORT_REASONS, VOICE, visibleCategories } from "@/lib/community";
import { AutoRefresh, BanButton, BlockButton, ChatForm, DeleteMessage, DismissReport, EditMessage, Reactions, ReportButton } from "@/components/CommunityChat";
import { Locked, PageTitle } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { RichText } from "@/components/RichText";
import { ChannelIcon } from "@/components/ChannelIcon";

export const dynamic = "force-dynamic";

const when = (t: number) => new Date(t * 1000).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string; r?: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const sp = await searchParams;
  const ch = findChannel(sp.c, isAdmin);
  const allowed = canView(ch, user);
  const messages = allowed ? listMessages(ch.slug, user.id) : [];
  const banned = !isAdmin && isBanned(user.id);
  const writable = canPost(ch, user) && !banned;
  const replying = messages.find((m) => String(m.id) === sp.r);
  const blocked = listBlocked(user.id);
  const reports = isAdmin && ch.slug === "moderador" ? listReports() : [];
  const postReports = isAdmin && ch.slug === "moderador" ? listPostReports() : [];
  const firstName = user.name.split(" ")[0].toLowerCase();

  return (
    <>
      <PageTitle title="Chat" subtitle="Canais de conversa da comunidade, moderados pela equipe. Alguns canais são exclusivos do plano Pró." />
      <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
        <nav className="card p-3 text-sm" aria-label="Canais">
          {visibleCategories(isAdmin).map((cat) => (
            <div key={cat.id} className="mb-3">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{cat.label}</p>
              {cat.channels.map((c) => (
                <Link key={c.slug} href={`/painel/comunidade?c=${c.slug}`} title={c.free || c.admin ? undefined : "Exclusivo do plano Pró"} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${c.slug === ch.slug ? "bg-panel-2 font-semibold text-gold-soft" : "text-muted hover:bg-panel-2 hover:text-white"}`}>
                  <ChannelIcon name={c.icon} />
                  <span className="truncate">{c.name}</span>
                  {!c.free && !c.admin && <span className="ml-auto rounded bg-gold/20 px-1 text-[9px] font-semibold uppercase text-gold-soft">Pró</span>}
                </Link>
              ))}
            </div>
          ))}
          <div>
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Canais de voz</p>
            {VOICE.map((v) => (
              <p key={v.name} className="flex items-center gap-2 px-2 py-1.5 text-muted/60 [&_svg]:opacity-50" title="Em breve">
                <ChannelIcon name={v.icon} />{v.name}<span className="ml-auto text-[10px]">em breve</span>
              </p>
            ))}
          </div>
          {blocked.length > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Bloqueados</p>
              {blocked.map((b) => (
                <p key={b.id} className="flex items-center justify-between gap-2 px-2 py-1 text-xs text-muted"><span className="truncate">{b.name}</span><BlockButton userId={b.id} blocked /></p>
              ))}
            </div>
          )}
        </nav>

        <section className="card flex min-h-[28rem] flex-col p-4">
          <header className="mb-3 border-b border-line pb-3">
            <h2 className="flex items-center gap-2 font-semibold"><ChannelIcon name={ch.icon} size={20} /> {ch.name}</h2>
            <p className="text-xs text-muted">{ch.description}</p>
          </header>
          {ch.intro && (
            <div className="mb-3 space-y-1 rounded-lg border border-gold/30 bg-panel-2 p-3 text-sm">
              {ch.intro.map((l, i) => <p key={i} className={i === 0 || l.startsWith("🚨") ? "font-semibold text-gold-soft" : "text-muted"}>{l}</p>)}
            </div>
          )}
          {isAdmin && ch.slug === "moderador" && (
            <div className="mb-3 rounded-lg border border-down/40 bg-panel-2 p-3">
              <h3 className="mb-2 text-sm font-semibold">Denúncias ({reports.length + postReports.length})</h3>
              {reports.length + postReports.length === 0 && <p className="text-xs text-muted">Nenhuma denúncia pendente.</p>}
              <ul className="space-y-3">
                {postReports.map((r) => (
                  <li key={`p${r.id}`} className="text-xs">
                    <p className="text-muted"><strong className="text-white">{r.reason}</strong> · publicação no feed · denunciado por {r.reporter} · {when(r.createdAt)}</p>
                    <p className="my-1 break-words rounded bg-ink p-2 text-sm text-muted"><strong className="text-white">{r.author}</strong>: {r.body || "(imagem)"}</p>
                    <p className="flex flex-wrap gap-x-3"><DeleteItem id={r.postId} kind="post" /><BanButton userId={r.authorId} banned={r.authorBanned} /><DismissPostReport id={r.id} /></p>
                  </li>
                ))}
                {reports.map((r) => (
                  <li key={r.id} className="text-xs">
                    <p className="text-muted"><strong className="text-white">{r.reason}</strong> · denunciado por {r.reporter} · {when(r.createdAt)}</p>
                    <p className="my-1 break-words rounded bg-ink p-2 text-sm text-muted"><strong className="text-white">{r.author}</strong> em #{r.channel}: {r.body || "(imagem)"}</p>
                    <p className="flex flex-wrap gap-x-3"><DeleteMessage id={r.messageId} /><BanButton userId={r.authorId} banned={r.authorBanned} /><DismissReport id={r.id} /></p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!allowed ? <Locked feature={`${ch.name} (exclusivo do plano Pró)`} text="Este espaço da comunidade faz parte do plano Pró. No Grátis você participa do Feed, das Notícias e do chat-geral." /> : <>
          <ul className="flex max-h-[32rem] flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {messages.length === 0 && <li className="text-sm text-muted">Ainda não há mensagens neste canal.{writable ? " Seja o primeiro!" : ""}</li>}
            {messages.map((m) => (
              <li key={m.id} className="flex gap-3 text-sm">
                <Link href={`/painel/comunidade/membro/${m.userId}`} className="mt-0.5 shrink-0"><Avatar name={m.author} id={m.avatarId} size={36} /></Link>
                <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-2">
                  <Link href={`/painel/comunidade/membro/${m.userId}`} className="font-semibold hover:underline">{m.author}</Link>
                  {m.banned && <span className="rounded bg-down/20 px-1.5 text-[10px] font-semibold uppercase text-down">Suspenso</span>}
                  {m.isAdmin && <span className="rounded bg-gold/20 px-1.5 text-[10px] font-semibold uppercase text-gold-soft">Admin</span>}
                  <span className="text-xs text-muted">{when(m.createdAt)}{m.edited && " (editado)"}</span>
                </p>
                {m.reply && <p className="mb-1 truncate border-l-2 border-gold/40 pl-2 text-xs text-muted">↪ <strong>{m.reply.author}</strong>: {m.reply.body}</p>}
                {m.body && (
                  <p className="whitespace-pre-wrap break-words text-muted">
                    <RichText body={m.body} first={firstName} />
                  </p>
                )}
                {m.audioId && <audio controls preload="none" src={`/api/community/audio?id=${m.audioId}`} className="mt-1 h-10 w-full max-w-sm" />}
                {m.imageId && (
                  <a href={`/api/community/image?id=${m.imageId}`} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/community/image?id=${m.imageId}`} alt={`Imagem enviada por ${m.author}`} loading="lazy" className="mt-1 max-h-72 max-w-full rounded-lg border border-line" />
                  </a>
                )}
                <Reactions id={m.id} items={m.reactions} all={REACTIONS} />
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {writable && <Link href={`/painel/comunidade?c=${ch.slug}&r=${m.id}`} className="text-xs text-muted underline hover:text-white">responder</Link>}
                  {m.userId === user.id && !banned && <EditMessage id={m.id} body={m.body} />}
                  {(isAdmin || m.userId === user.id) && <DeleteMessage id={m.id} />}
                  {m.userId !== user.id && <ReportButton messageId={m.id} reasons={REPORT_REASONS} />}
                  {m.userId !== user.id && !m.isAdmin && <BlockButton userId={m.userId} />}
                  {isAdmin && !m.isAdmin && m.userId !== user.id && <BanButton userId={m.userId} banned={m.banned} />}
                </p>
                </div>
              </li>
            ))}
            <AutoRefresh count={messages.length} />
          </ul>
          {writable ? <ChatForm channel={ch.slug} max={MAX_BODY} replyTo={replying ? { id: replying.id, author: replying.author, body: replying.body.slice(0, 80) || "imagem" } : null} /> : <p className="mt-3 rounded-lg bg-panel-2 p-3 text-xs text-muted">{banned ? "Você foi suspenso da comunidade pela moderação e não pode escrever. Fale com o suporte se achar que foi um engano." : "Canal somente leitura: só a equipe publica aqui."}</p>}
          </>}
        </section>
      </div>
      <p className="mt-3 text-xs text-muted">Conteúdo da comunidade é opinião dos membros, não recomendação de investimento. Denuncie abusos à moderação.</p>
    </>
  );
}
