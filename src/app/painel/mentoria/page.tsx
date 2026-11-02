import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Diamond } from "@/components/Diamond";
import { MentoriaCheckout, SessionsAdmin } from "@/components/MentoriaCheckout";
import { mentoriaCheckoutProps } from "@/lib/mentoria-view";
import { listAll, listMine } from "@/lib/mentoria";
import { expireStaleOrders, listOrdersForUser } from "@/lib/orders";
import { MENTORIA_SESSIONS } from "@/lib/plans";
import { date } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mentoria com Niza" };

const TOPICS = [
  { t: "Sua carteira frente ao Protocolo CR2FA", items: ["Avaliação da situação atual da sua carteira em relação ao Protocolo CR2FA", "Riscos envolvidos na carteira que você tem hoje", "Ajuda na composição da carteira, sempre sem indicar ativos: a decisão do que comprar e o risco são totalmente seus"] },
  { t: "Criptomoedas do zero, na prática", items: ["Cadastro em uma corretora e verificação da conta", "Do Pix até a primeira fração de Bitcoin", "Primeira carteira (hot wallet), as 12/24 palavras e como guardá-las com segurança", "Como transferir ativos para a sua carteira (autocustódia)"] },
  { t: "Pools de liquidez (só o racional)", items: ["Como funcionam, sem recomendar nenhum ativo", "Riscos de Impermanent Loss e de desvalorização dos ativos", "Riscos de hacks e os cuidados para minimizá-los"] },
  { t: "Mercado tradicional (opcional)", items: ["Se você preferir, o básico de ações, FIIs, Tesouro, CDB, LCI e LCA", "O foco da mentoria continua sendo criptomoedas"] },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ pedido?: string; falhou?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  expireStaleOrders();
  const orders = listOrdersForUser(user.id);
  const mine = listMine(user.id);
  const all = user.role === "admin" ? listAll() : [];
  const props = mentoriaCheckoutProps(orders);
  const awaiting = !!sp.pedido && mine.length === 0 && !sp.falhou;

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-sky-300/25 bg-gradient-to-br from-panel-2 via-panel to-ink p-6 md:p-8">
        <Diamond size={150} className="pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 opacity-90 drop-shadow-[0_0_30px_rgba(120,180,255,0.35)] md:block" />
        <p className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-200/90"><Diamond size={16} /> Plano Diamond</p>
        <h1 className="relative mt-1 font-display text-2xl font-bold text-gold-soft md:text-4xl">Mentoria com Niza</h1>
        <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
          Acompanhamento individual e personalizado, com foco em criptomoedas, para você sair do zero e investir com método e segurança. Aberta a todos: você não precisa ser Premium para contratar, e pode entrar no Premium depois, durante o aprendizado.
        </p>
        <dl className="relative mt-5 grid max-w-2xl gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-ink/50 p-3"><dt className="text-[11px] uppercase tracking-wide text-muted">Investimento</dt><dd className="font-display text-xl font-bold text-gold-soft">{props.price}</dd><dd className="text-xs text-muted">pagamento único</dd></div>
          <div className="rounded-xl border border-line bg-ink/50 p-3"><dt className="text-[11px] uppercase tracking-wide text-muted">Aulas</dt><dd className="font-display text-xl font-bold text-white">{MENTORIA_SESSIONS} de 1 hora</dd><dd className="text-xs text-muted">particulares, 1 por mês</dd></div>
          <div className="rounded-xl border border-line bg-ink/50 p-3"><dt className="text-[11px] uppercase tracking-wide text-muted">Formato</dt><dd className="font-display text-xl font-bold text-white">Online</dd><dd className="text-xs text-muted">Google Meet ou Teams</dd></div>
        </dl>
      </section>

      {awaiting && <p role="status" className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-soft">Recebemos o seu retorno do pagamento. Assim que o Mercado Pago confirmar, a sua mentoria aparece aqui como ativa (costuma levar alguns instantes no Pix).</p>}
      {sp.falhou && <p role="alert" className="mb-4 rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">O pagamento não foi concluído. Você pode tentar de novo abaixo.</p>}

      {mine.map((m) => (
        <section key={m.id} className="card mb-6 border-up/40 p-5">
          <h2 className="font-display text-lg font-bold text-up">Sua mentoria está ativa</h2>
          <p className="mt-1 text-sm text-muted">Contratada em {date(m.createdAt)}. Aulas realizadas: <strong className="text-white">{m.sessionsDone} de {MENTORIA_SESSIONS}</strong>. {m.sessionsDone === 0 ? "A aula 01 será agendada pelo Niza e enviada por e-mail com o link do Google Meet ou Teams." : "O próximo encontro é combinado com você por e-mail."}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-gold to-up" style={{ width: `${(m.sessionsDone / MENTORIA_SESSIONS) * 100}%` }} /></div>
        </section>
      ))}

      <section className="mb-6 grid gap-3 md:grid-cols-2" aria-label="Conteúdo da mentoria">
        <div className="card border-gold/30 p-5 md:col-span-2">
          <h2 className="font-display text-lg font-bold text-gold-soft">Aula 01: descobrindo o seu ponto de partida</h2>
          <p className="mt-1 text-sm text-muted">O primeiro encontro serve para avaliar o seu nível de conhecimento e o que você já tem. A partir dele, o Niza monta o seu caminho de aprendizagem nas 11 aulas seguintes, no seu ritmo e com foco no que faz sentido para você.</p>
        </div>
        {TOPICS.map((s) => (
          <div key={s.t} className="card border-gold/15 p-5">
            <h3 className="font-display font-bold text-white">{s.t}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-xl border border-down/40 bg-down/5 p-4 text-sm text-muted">
        <p className="mb-1 font-semibold text-white">O que a mentoria não é</p>
        <p>Não há recomendação de compra de ativos. As aulas ensinam método, segurança e riscos; a avaliação da carteira compara a sua situação atual com o Protocolo CR2FA. Toda decisão de investimento, e o risco dela, é exclusivamente sua. Investir em criptomoedas envolve risco de perda total do capital, e a mentoria não garante resultado financeiro.</p>
      </section>

      <MentoriaCheckout {...props} />

      {user.role === "admin" && (
        <section className="card mt-8 p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-gold-soft">Alunos da mentoria (só você vê)</h2>
          {all.length === 0 ? <p className="text-sm text-muted">Nenhuma mentoria contratada ainda.</p> : (
            <div className="overflow-x-auto">
              <table className="data">
                <thead><tr><th>Aluno</th><th>E-mail</th><th>Contratada</th><th>Aulas feitas</th></tr></thead>
                <tbody>{all.map((m) => <tr key={m.id}><td>{m.name}</td><td>{m.email}</td><td>{date(m.createdAt)}</td><td><SessionsAdmin id={m.id} done={m.sessionsDone} /></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      )}
      <p className="mt-6 text-xs text-muted">Dúvidas sobre a mentoria? Veja também os <Link href="/planos" className="underline">planos e pagamentos</Link>.</p>
    </>
  );
}
