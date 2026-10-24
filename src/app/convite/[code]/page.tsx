import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getInviteByCode, inviteStatus, maskEmail } from "@/lib/invites";
import { RedeemInvite } from "@/components/InviteClient";
import { Logo } from "@/components/ui";
import { date } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Convite VIP", robots: { index: false } };

const periodo = (d: number) => (d >= 365 && d % 365 === 0 ? `${d / 365} ${d === 365 ? "ano" : "anos"}` : `${d} dias`);

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const inv = getInviteByCode(code);
  const user = await getUser();
  const status = inv ? inviteStatus(inv) : null;
  const usable = inv && status === "pendente";

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <div className="w-full">
        <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
        <div className="card p-6 text-center">
          {!inv ? (
            <>
              <h1 className="mb-2 font-display text-2xl font-bold text-gold-soft">Convite não encontrado</h1>
              <p className="text-sm text-muted">Confira se o link foi copiado por inteiro ou peça um novo convite.</p>
            </>
          ) : !usable ? (
            <>
              <h1 className="mb-2 font-display text-2xl font-bold text-gold-soft">Convite indisponível</h1>
              <p className="text-sm text-muted">
                {status === "usado" ? "Este convite já foi utilizado." : status === "expirado" ? "Este convite expirou. Peça um novo ao Emerson." : "Este convite foi cancelado."}
              </p>
            </>
          ) : (
            <>
              <p className="mb-2 inline-block rounded-full border border-gold/60 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold-soft">Convite VIP</p>
              <h1 className="mb-2 font-display text-2xl font-bold text-gold-soft">Acesso Pró por {periodo(inv.days)}</h1>
              <p className="mb-1 text-sm text-muted">Você foi convidado(a) para o NIZA INVEST com todos os recursos do plano Pró, sem custo.</p>
              {inv.note && <p className="mx-auto my-3 rounded-lg bg-panel-2 px-3 py-2 text-sm">{inv.note}</p>}
              <p className="mb-5 text-xs text-muted">Válido até {date(inv.expiresAt)} · uso único{inv.email ? ` · para ${maskEmail(inv.email)}` : ""}</p>
              {user ? (
                <RedeemInvite code={code} name={user.name} />
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href={`/cadastrar?convite=${code}`} className="btn btn-gold">Criar minha conta e ativar</Link>
                  <Link href={`/entrar?convite=${code}`} className="btn btn-ghost">Já tenho conta</Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
