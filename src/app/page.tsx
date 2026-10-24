import Image from "next/image";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { BLOCKS, EMERGENCY_RESERVE_MONTHS } from "@/lib/protocol";
import { FREE_LIMITS, PLAN_FEATURES, formatBRL, priceCents } from "@/lib/plans";
import { Disclaimer, Logo } from "@/components/ui";
import { trialDays } from "@/lib/trial";
import pizza from "@/assets/protocolo-pizza.webp";
import autor from "@/assets/emerson-niza.webp";
import autorAvatar from "@/assets/emerson-niza-avatar.webp";

export default async function Home() {
  const user = await getUser();
  return (
    <div className="mx-auto max-w-6xl px-5 pb-16">
      {(!user || user.trialAvailable) && (
        <Link href={user ? "/planos" : "/cadastrar"} className="mt-4 block rounded-xl border border-gold/60 bg-gold/10 px-4 py-3 text-center text-sm font-semibold text-gold-soft transition hover:bg-gold/20">
          🎁 Teste o plano Pró grátis por {trialDays()} dias, sem cartão. Crie sua conta e comece agora →
        </Link>
      )}
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">NIZA INVEST</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-gold-soft md:text-5xl">
            Cinco blocos de 20%. Diversificação em duas camadas com o Protocolo CR2FA.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Cripto, fundos imobiliários, ações, renda fixa e uma reserva para oportunidades, com dados atualizados e uma carteira que mostra quanto comprar ou vender para voltar ao
            desenho original.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/cadastrar" className="btn btn-gold">{!user || user.trialAvailable ? `Testar o Pró ${trialDays()} dias grátis` : "Começar grátis"}</Link>
            <Link href="#planos" className="btn btn-ghost">Ver planos</Link>
          </div>
          <a href="#autor" className="mt-7 inline-flex items-center gap-3 rounded-full border border-line bg-panel/60 py-1.5 pl-1.5 pr-4 transition hover:border-gold">
            <Image src={autorAvatar} alt="Foto de Emerson Niza" width={44} height={44} unoptimized className="h-11 w-11 rounded-full border border-gold/60 object-cover" />
            <span className="text-left text-sm leading-tight">
              <span className="block font-semibold text-white">Emerson Niza</span>
              <span className="block text-xs text-muted">Engenheiro · investidor desde 2014 · cripto desde 2020</span>
            </span>
          </a>
        </div>
        <div className="relative isolate flex justify-center">
          <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/25 blur-3xl" />
          <Image
            src={pizza}
            alt="Protocolo CR2FA: cinco blocos de 20% — criptomoedas, fundos imobiliários, ações, renda fixa e reserva para oportunidades"
            priority
            unoptimized
            className="float-slow w-full max-w-[470px] drop-shadow-[0_28px_36px_rgba(0,0,0,0.6)]"
          />
        </div>
      </section>

      <section id="autor" className="card grid items-center gap-8 p-6 md:grid-cols-[300px_1fr] md:p-8">
        <div className="mx-auto w-full max-w-[300px]">
          <Image
            src={autor}
            alt="Emerson Niza, engenheiro e investidor, criador do Protocolo CR2FA"
            unoptimized
            className="aspect-[4/5] w-full rounded-2xl border border-gold/40 object-cover shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Quem está por trás do Protocolo</p>
          <h2 className="font-display text-3xl font-bold text-gold-soft">Emerson Niza</h2>
          <p className="mt-1 text-sm text-muted">Bitcoin · Mercado · Liberdade</p>

          <ul className="mt-4 flex flex-wrap gap-2 text-xs">
            {["Engenheiro há mais de 20 anos", "Investidor desde 2014", "Cripto desde 2020", "Canal no YouTube desde out/2025"].map((t) => (
              <li key={t} className="rounded-full border border-line bg-panel-2 px-3 py-1 text-white/90">{t}</li>
            ))}
          </ul>

          <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-white/85">
            <p>
              Sou engenheiro, com mais de 20 anos de carreira, e amo o que faço. Mesmo assim, quero mais escolhas no futuro: liberdade financeira e geográfica. Foi por isso que
              comecei a investir em 2014 e, desde 2020, também em cripto.
            </p>
            <p>
              O NIZA INVEST nasceu para organizar o que eu mesmo faço: dividir o patrimônio em blocos claros, olhar os dados antes de decidir e rebalancear com disciplina, sem
              depender de palpite.
            </p>
            <p>
              No meu canal eu destrincho investimentos estratégicos, Bitcoin, DeFi, lending pools, análise on-chain e leitura de mercado, além das novas tecnologias Web3. Sempre
              com reflexões, atualidades e prática real, e sem promessa de ganho fácil.
            </p>
            <p className="text-white">Se você quer entender os riscos, diversificar com inteligência e usar a tecnologia a seu favor, seja bem-vindo.</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a className="btn btn-gold" href="https://www.youtube.com/channel/UCUSHyyzS1LKDntU9uKYaPGg?sub_confirmation=1" target="_blank" rel="noopener noreferrer">Ver o canal no YouTube ↗</a>
          </div>
          <p className="mt-4 text-xs text-muted">Conteúdo educativo, sem recomendação de investimento.</p>
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
        <p className="mt-1 text-muted">Pagamento por Pix, cartão de crédito ou Bitcoin.</p>
        {(!user || user.trialAvailable) && (
          <p className="mt-3 inline-block rounded-full border border-gold/60 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold-soft">
            🎁 Novo por aqui? Use o Pró grátis por {trialDays()} dias, sem cartão e sem compromisso.
          </p>
        )}
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
            {(!user || user.trialAvailable) && <p className="mt-4 text-sm text-gold-soft">Teste grátis por {trialDays()} dias, sem cartão.</p>}
            <Link href={user ? "/planos" : "/cadastrar"} className="btn btn-gold mt-3 w-full">{!user || user.trialAvailable ? `Testar ${trialDays()} dias grátis` : "Assinar o Pró"}</Link>
          </div>
        </div>
      </section>

      <Disclaimer />
      <footer className="mt-8 border-t border-line pt-6 text-xs text-muted">
        © {new Date().getFullYear()} {process.env.APP_NAME || "NIZA INVEST"}.
      </footer>
    </div>
  );
}
