import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Diamond } from "@/components/Diamond";
import { Locked } from "@/components/ui";
import { MentoriaCheckout } from "@/components/MentoriaCheckout";
import { InviteByEmail, InviteRow, RequestInvite } from "@/components/BlackActions";
import { mentoriaCheckoutProps } from "@/lib/mentoria-view";
import { getInvite, listInvites, listMembers } from "@/lib/black";
import { expireStaleOrders, hasBlack, listOrdersForUser } from "@/lib/orders";
import { BLACK_FEATURES, BLACK_NAME } from "@/lib/plans";
import { date } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: BLACK_NAME };

const STATUS: Record<string, string> = { requested: "Pediu convite", invited: "Convidado", declined: "Recusado" };

export default async function Page({ searchParams }: { searchParams: Promise<{ pedido?: string; falhou?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isAdmin = user.role === "admin";
  const invite = getInvite(user.id);
  if (user.plan !== "pro" && !isAdmin && invite !== "invited") return <Locked feature={`${BLACK_NAME} (exclusivo da White Flame Society)`} />;
  expireStaleOrders();
  const member = hasBlack(user.id);
  const props = mentoriaCheckoutProps(listOrdersForUser(user.id), "black");
  const invites = isAdmin ? listInvites() : [];
  const members = isAdmin ? listMembers() : [];

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-[#0b0b10] via-[#0a0d18] to-black p-6 md:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] items-center justify-center md:flex"><Diamond black size={190} className="drop-shadow-[0_0_34px_rgba(212,175,55,0.35)]" /></div>
        <p className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold/90"><Diamond black size={16} /> Por convite · Início em São Paulo</p>
        <h1 className="relative mt-1 font-display text-2xl font-bold text-gold-soft md:text-4xl">{BLACK_NAME}</h1>
        <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
          Um grupo seleto de pessoas de alto nível em conhecimento e sucesso financeiro, que se encontram pessoalmente para falar de negócios e fazer network. Troca de experiências reais de quem já construiu, para expandir horizontes, furar a bolha da percepção de mundo atual e evoluir em riqueza, empreendedorismo, negócios e investimentos.
        </p>
        <dl className="relative mt-5 grid max-w-2xl gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gold/25 bg-black/50 p-3"><dt className="text-[11px] uppercase tracking-wide text-muted">Investimento</dt><dd className="font-display text-xl font-bold text-gold-soft">{props.price}</dd><dd className="text-xs text-muted">cobrado anualmente</dd></div>
          <div className="rounded-xl border border-gold/25 bg-black/50 p-3"><dt className="text-[11px] uppercase tracking-wide text-muted">Encontros</dt><dd className="font-display text-xl font-bold text-white">Presenciais</dd><dd className="text-xs text-muted">periódicos, começando em São Paulo</dd></div>
          <div className="rounded-xl border border-gold/25 bg-black/50 p-3"><dt className="text-[11px] uppercase tracking-wide text-muted">Acesso</dt><dd className="font-display text-xl font-bold text-white">Por convite</dd><dd className="text-xs text-muted">grupo seleto</dd></div>
        </dl>
      </section>

      <section className="card mb-6 border-gold/30 p-5">
        <h2 className="font-display text-lg font-bold text-gold-soft">O que está incluído</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{BLACK_FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
        <p className="mt-3 text-sm text-muted">O retorno em network de alto valor, em expansão de consciência e em evolução financeira não tem preço.</p>
        <div className="mt-4 rounded-xl border border-gold/25 bg-black/40 p-4">
          <h3 className="font-display font-bold text-gold-soft">Presença nacional e internacional</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">Os encontros começam em São Paulo, e em breve chegam a outras cidades do Brasil e do mundo. A proposta é levar o grupo a diferentes mercados e culturas de negócios, para compartilhar experiências, abrir novas conexões e ampliar a visão de oportunidades de cada membro.</p>
        </div>
      </section>

      {sp.pedido && !member && !sp.falhou && <p role="status" className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-soft">Recebemos o retorno do pagamento. Assim que for confirmado, a sua assinatura aparece aqui como ativa.</p>}
      {sp.falhou && <p role="alert" className="mb-4 rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">O pagamento não foi concluído. Você pode tentar de novo abaixo.</p>}

      {member ? (
        <section className="card mb-6 border-up/40 p-5">
          <h2 className="font-display text-lg font-bold text-up">Você é Black Diamond VIP</h2>
          <p className="mt-1 text-sm text-muted">Os encontros presenciais VIP aparecem na agenda como <strong className="text-white">Evento Black Diamond VIP</strong>. Confirme a sua presença por lá e apresente o QR code do convite na entrada.</p>
          <Link href="/painel/comunidade?c=planejamento-de-reunioes" className="mt-3 inline-block text-gold-soft underline">Ver a agenda de Reuniões e Eventos</Link>
          <p className="mt-2 text-xs text-muted">Para renovar por mais 12 meses, contrate novamente abaixo.</p>
        </section>
      ) : invite === "invited" || isAdmin ? null : invite === "requested" ? (
        <section className="card mb-6 border-gold/30 p-5"><h2 className="font-display text-lg font-bold text-gold-soft">Pedido de convite enviado</h2><p className="mt-1 text-sm text-muted">A organização avalia os pedidos com cuidado. Se for aprovado, a contratação é liberada aqui nesta página.</p></section>
      ) : invite === "declined" ? (
        <section className="card mb-6 border-down/40 p-5"><p className="text-sm text-muted">Neste momento o seu pedido não foi aprovado. Obrigado pelo interesse.</p></section>
      ) : (
        <section className="card mb-6 border-gold/30 p-5"><h2 className="font-display text-lg font-bold text-gold-soft">Participe do grupo</h2><p className="mt-1 mb-3 text-sm text-muted">O acesso é por convite. Solicite o seu e a organização entra em contato.</p><RequestInvite /></section>
      )}

      {(invite === "invited" || isAdmin) && <MentoriaCheckout {...props} product="black" title="Contratar o Black Diamond VIP" subtitle="Anuidade por 12 meses. Para continuar no grupo, contrate novamente antes do vencimento." />}

      <p className="mt-4 rounded-lg border border-line px-4 py-3 text-xs text-muted">Os encontros são eventos presenciais e não constituem recomendação de investimento. Cada participante decide por conta própria, e a organização pode recusar ou encerrar a participação de quem não respeitar as regras do grupo.</p>

      {isAdmin && (
        <section className="card mt-8 space-y-4 p-5">
          <h2 className="font-display text-lg font-bold text-gold-soft">Convites e membros (só você vê)</h2>
          <InviteByEmail />
          {invites.length === 0 ? <p className="text-sm text-muted">Nenhum pedido ou convite ainda.</p> : (
            <div className="overflow-x-auto"><table className="data"><thead><tr><th>Membro</th><th>E-mail</th><th>Situação</th><th></th></tr></thead>
              <tbody>{invites.map((i) => <tr key={i.userId}><td>{i.name}</td><td>{i.email}</td><td>{STATUS[i.status]}</td><td><InviteRow userId={i.userId} status={i.status} /></td></tr>)}</tbody></table></div>
          )}
          <h3 className="font-display font-bold text-white">Membros ativos ({members.length})</h3>
          {members.length === 0 ? <p className="text-sm text-muted">Ainda não há assinantes.</p> : <ul className="text-sm text-muted">{members.map((m) => <li key={m.userId}>{m.name} · {m.email} · desde {date(m.paidAt)}</li>)}</ul>}
        </section>
      )}
    </>
  );
}
