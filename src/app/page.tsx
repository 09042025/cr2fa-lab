import Link from "next/link";
import { getUser } from "@/lib/auth";
import { BLOCKS, EMERGENCY_RESERVE_MONTHS } from "@/lib/protocol";
import { FREE_LIMITS, PLAN_FEATURES, formatBRL, priceCents } from "@/lib/plans";
import { Disclaimer, Logo } from "@/components/ui";
import { ProtocolPie } from "@/components/PieChart";

export default async function Home() {
  const user = await getUser();
  return (
    <div className="mx-auto max-w-6xl px-5 pb-16">
      <nav className="flex items-center justify-between py-5">
        <Logo />
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/painel" className="btn btn-gold">Abrir painel</Link>
          ) : (
            <>
              <Link href="/entrar" className="btn btn-ghost">Entrar</Link>
              <Link href="/cadastrar" className="btn btn-gold">Criar conta</Link>
            </>
          )}
        </div>
      </nav>

      <section className="grid items-center gap-10 py-10 md:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Protocolo CR2FA</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-gold-soft md:text-5xl">
            Cinco blocos de 20%. Diversificação em duas camadas.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Cripto, fundos imobiliários, ações, renda fixa e uma reserva para oportunidades, com dados atualizados e uma carteira que mostra quanto comprar ou vender para voltar ao
            desenho original.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/cadastrar" className="btn btn-gold">Começar grátis</Link>
            <Link href="#planos" className="btn btn-ghost">Ver planos</Link>
          </div>
        </div>
        <div className="flex justify-center">
          <ProtocolPie blocks={BLOCKS} size={320} />
        </div>
      </section>

      <section className="grid gap-4 py-6 md:grid-cols-5">
        {BLOCKS.map((b) => (
          <div key={b.key} className="card p-4" style={{ borderTopColor: b.color, borderTopWidth: 3 }}>
            <p className="text-2xl font-bold" style={{ color: b.color }}>{b.pct}%</p>
            <h3 className="mt-1 font-semibold">{b.name}</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {b.subs.map((s) => (
                <li key={s.label}>
                  {s.pct}% {s.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="card mt-6 flex items-start gap-4 border-gold/50 p-5">
        <span className="text-2xl" aria-hidden>🛡️</span>
        <div>
          <h2 className="font-display text-xl font-bold text-gold-soft">Antes de investir: constitua sua reserva de emergência</h2>
          <p className="mt-1 text-muted">
            Equivalente a {EMERGENCY_RESERVE_MONTHS} meses de salário, separada dos cinco blocos do Protocolo CR2FA.
          </p>
        </div>
      </section>

      <section id="planos" className="py-14">
        <h2 className="font-display text-3xl font-bold text-gold-soft">Planos</h2>
        <p className="mt-1 text-muted">Pagamento por Pix, cartão de crédito ou cripto (Bitcoin, Ethereum, Arbitrum, Base, Polygon, Optimism e Solana).</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="card p-6">
            <h3 className="text-lg font-semibold">Grátis</h3>
            <p className="mt-1 text-3xl font-bold">R$ 0</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {PLAN_FEATURES.free.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Limites: {FREE_LIMITS.pools} pools, {FREE_LIMITS.stocks} ações e {FREE_LIMITS.fiis} FIIs por lista.
            </p>
            <Link href="/cadastrar" className="btn btn-ghost mt-5 w-full">Criar conta grátis</Link>
          </div>
          <div className="card border-gold/60 p-6">
            <h3 className="text-lg font-semibold text-gold-soft">Pró</h3>
            <p className="mt-1 text-3xl font-bold">
              {formatBRL(priceCents("monthly"))}
              <span className="text-sm font-normal text-muted"> /mês</span>
            </p>
            <p className="text-sm text-muted">ou {formatBRL(priceCents("yearly"))} por ano</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {PLAN_FEATURES.pro.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <Link href={user ? "/planos" : "/cadastrar"} className="btn btn-gold mt-5 w-full">Assinar o Pró</Link>
          </div>
        </div>
      </section>

      <Disclaimer />
      <footer className="mt-8 border-t border-line pt-6 text-xs text-muted">
        © {new Date().getFullYear()} {process.env.APP_NAME || "CR2FA Lab"}. Código aberto sob licença MIT.
      </footer>
    </div>
  );
}
