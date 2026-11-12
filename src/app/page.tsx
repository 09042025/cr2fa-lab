import Image from "next/image";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { BLOCKS, EMERGENCY_RESERVE_MONTHS } from "@/lib/protocol";
import { DIAMOND_FEATURES, DIAMOND_NAME, FREE_LIMITS, MENTORIA_SESSIONS, PLAN_FEATURES, diamondPriceCents, formatBRL, mentoriaPriceCents, priceCents } from "@/lib/plans";
import { Diamond } from "@/components/Diamond";
import { SpotsBadge } from "@/components/MentoriaCheckout";
import { spots as getSpots } from "@/lib/mentoria";
import wolf from "@/assets/wfs/logo-wolf.webp";
import { Disclaimer, Logo } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { trialDays } from "@/lib/trial";
import { ProtocolPizza } from "@/components/ProtocolPizza";
import autor from "@/assets/emerson-niza.webp";
import autorAvatar from "@/assets/emerson-niza-avatar.webp";

const FEATURES: { icon: string; title: string; text: string; pro?: boolean }[] = [
  { icon: "📊", title: "Protocolo CR2FA e Portfólio", text: "Cinco blocos de 20% e uma carteira que mostra quanto comprar ou vender para voltar ao desenho original. Importa suas posições e rebalanceia.", pro: true },
  { icon: "₿", title: "Cripto completo", text: "Visão de mercado, cotações, ETFs de cripto, futuros, RWA, DEX e plataformas DeFi, além do HUB DEFI e da Análise on Chain (MVRV, STH/LTH e outros indicadores do Bitcoin).", pro: true },
  { icon: "📈", title: "Ações e FIIs", text: "Cotações, filtros por setor e indicadores de ações, fundos imobiliários e ETFs, com gráficos e dados atualizados." },
  { icon: "🏦", title: "Renda fixa", text: "Selic, CDI, IPCA e um comparador de CDB, LCI/LCA e Tesouro já com imposto de renda." },
  { icon: "🧮", title: "Simuladores", text: "Juros compostos e Simulador de Financiamentos de imóveis e veículos (Price e SAC, parcela por prazo).", pro: true },
  { icon: "💬", title: "Feed, Mensagens e Notícias", text: "Rede social de investidores com posts, stories, mensagens privadas, notícias do mercado e Lives Abertas. Tradução em vários idiomas." },
];
const WFS = [
  "Manifesto e Chat com canais temáticos, “Pergunte ao Niza” e Reuniões e Eventos",
  "Lives VIP e Masterclass em vídeo",
  "Links Essenciais, Portfólio e Protocolo CR2FA completo",
  "Negócios: vitrine de serviços e produtos dos membros, com indicações, nota do Google e cases",
  "Calendário com links das reuniões e aviso por e-mail",
];

export default async function Home() {
  const user = await getUser();
  const sp2 = getSpots();
  return (
    <div className="mx-auto max-w-6xl px-5 pb-16">
      {(!user || user.trialAvailable) && (
        <Link href={user ? "/planos" : "/cadastrar"} className="mt-4 block rounded-xl border border-gold/60 bg-gold/10 px-4 py-3 text-center text-sm font-semibold text-gold-soft transition hover:bg-gold/20">
          🎁 Teste o plano Premium grátis por {trialDays()} dias, sem cartão. Crie sua conta e comece agora →
        </Link>
      )}
      <nav className="flex items-center justify-between py-5">
        <Logo site />
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          {user ? (
            <Link href="/painel" className="btn btn-gold">Acessar NIZA HUB</Link>
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
          <h1 className="font-display text-4xl font-bold leading-tight text-gold-soft md:text-5xl">
            Cinco blocos de 20%. Diversificação em duas camadas com o Protocolo CR2FA.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Cripto, fundos imobiliários, ações, renda fixa e uma reserva para oportunidades, com dados atualizados e uma carteira que mostra quanto comprar ou vender para voltar ao
            desenho original.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/cadastrar" className="btn btn-gold">{!user || user.trialAvailable ? `Testar o Premium ${trialDays()} dias grátis` : "Começar grátis"}</Link>
            <Link href="#funcionalidades" className="btn btn-ghost">Ver funcionalidades</Link>
            <Link href="#planos" className="btn btn-ghost">Ver planos</Link>
            <Link href="#mentoria" className="btn btn-ghost"><Diamond size={20} className="mr-1.5" />Mentoria com Niza</Link>
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
          <ProtocolPizza priority className="float-slow w-full max-w-[470px] drop-shadow-[0_28px_36px_rgba(0,0,0,0.6)]" />
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

      <section id="funcionalidades" className="py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Tudo em um só lugar</p>
        <h2 className="mt-1 font-display text-3xl font-bold text-gold-soft">Funcionalidades</h2>
        <p className="mt-1 max-w-2xl text-muted">Dados de mercado, ferramentas, comunidade e acompanhamento para investir com método.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <p className="flex items-center justify-between text-2xl"><span aria-hidden>{f.icon}</span>{f.pro && <span className="rounded-md bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-gold-soft">PREMIUM</span>}</p>
              <h3 className="mt-2 font-semibold text-white">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card relative overflow-hidden border-gold/40 p-6 md:p-8">
        <Image src={wolf} alt="" aria-hidden unoptimized className="pointer-events-none absolute right-2 top-1/2 hidden h-[125%] w-auto max-w-none -translate-y-1/2 select-none md:block" style={{ mixBlendMode: "screen", opacity: 0.9, WebkitMaskImage: "radial-gradient(circle at center, #000 33%, transparent 49%), radial-gradient(ellipse 50% 13% at 50% 64%, #000 55%, transparent 100%)", maskImage: "radial-gradient(circle at center, #000 33%, transparent 49%), radial-gradient(ellipse 50% 13% at 50% 64%, #000 55%, transparent 100%)" }} />
        <div className="relative md:max-w-[58%]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Comunidade exclusiva do Premium</p>
          <h2 className="mt-1 font-display text-3xl font-bold text-gold-soft">White Flame Society</h2>
          <p className="mt-2 text-muted">Investidores que pensam em construir riqueza, com método, segurança e negócios entre membros.</p>
          <ul className="mt-4 space-y-2 text-sm text-white/85">{WFS.map((w) => <li key={w}>✓ {w}</li>)}</ul>
        </div>
      </section>

      <section id="planos" className="py-14">
        <h2 className="font-display text-3xl font-bold text-gold-soft">Planos</h2>
        <p className="mt-1 text-muted">Pagamento por Pix, cartão de crédito ou cripto.</p>
        {(!user || user.trialAvailable) && (
          <p className="mt-3 inline-block rounded-full border border-gold/60 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold-soft">
            🎁 Novo por aqui? Use o Premium grátis por {trialDays()} dias, sem cartão e sem compromisso.
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
            <h3 className="text-lg font-semibold text-gold-soft">Premium</h3>
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
            <Link href={user ? "/planos" : "/cadastrar"} className="btn btn-gold mt-3 w-full">{!user || user.trialAvailable ? `Testar ${trialDays()} dias grátis` : "Assinar o Premium"}</Link>
          </div>
        </div>
      </section>

      <section id="mentoria" className="card relative mb-8 overflow-hidden border-sky-300/40 p-6 md:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[28%] items-center justify-center md:flex"><Diamond size={170} className="drop-shadow-[0_0_30px_rgba(120,180,255,0.4)]" /></div>
        <div className="relative md:max-w-[70%]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/90">Aberta a todos, inclusive ao plano Grátis</p>
          <h2 className="mt-1 font-display text-3xl font-bold text-gold-soft">Mentoria com Niza</h2>
          <p className="mt-2 text-muted">{MENTORIA_SESSIONS} aulas particulares de 1 hora (1 por mês) via Google Meet ou Teams, com foco em criptomoedas. A aula 01 avalia o seu nível para montar o seu caminho.</p>
          <ul className="mt-4 grid gap-2 text-sm text-white/85 sm:grid-cols-2">
            <li>✓ Avaliação da sua carteira frente ao Protocolo CR2FA</li>
            <li>✓ Corretora, Pix e a primeira fração de Bitcoin</li>
            <li>✓ Hot wallet, 12/24 palavras e autocustódia</li>
            <li>✓ Racional dos pools de liquidez e seus riscos</li>
          </ul>
          <p className="mt-3"><SpotsBadge left={sp2.left} limit={sp2.limit} turma={sp2.turma} /></p>
          <p className="mt-3 text-xs text-muted">Sem recomendação de ativos: a decisão e o risco são seus. Nenhum resultado é garantido. O Plano Diamond não tem limite de vagas.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="font-display text-2xl font-bold text-white">{formatBRL(mentoriaPriceCents())}</span><span className="text-sm text-muted">pagamento único</span>
            <Link href={user ? "/painel/mentoria" : "/cadastrar"} className="btn btn-gold">{sp2.full ? "Ver detalhes" : user ? "Conhecer e contratar" : "Criar conta e conhecer"}</Link>
            <Link href={user ? "/planos#diamond" : "/cadastrar"} className="btn btn-ghost">Ou leve junto o {DIAMOND_NAME.split(" (")[0]}</Link>
          </div>
        </div>
      </section>

      <section id="diamond" className="card relative mb-14 overflow-hidden border-sky-300/60 bg-gradient-to-br from-panel-2 via-panel to-ink p-6 md:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[26%] items-center justify-center md:flex"><Diamond size={150} className="drop-shadow-[0_0_30px_rgba(120,180,255,0.45)]" /></div>
        <div className="relative md:max-w-[72%]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/90">O plano completo · Tudo do Premium + Mentoria</p>
          <h2 className="mt-1 font-display text-3xl font-bold text-gold-soft">Plano Diamond</h2>
          <p className="mt-1 flex flex-wrap items-baseline gap-2"><span className="text-4xl font-bold">{formatBRL(diamondPriceCents())}</span><span className="text-sm text-muted">vitalício, pagamento único · sem limite de vagas</span></p>
          <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
            {DIAMOND_FEATURES.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <Link href={user ? "/planos#diamond" : "/cadastrar"} className="btn btn-gold mt-6">{user ? "Contratar o Diamond" : "Criar conta e contratar"}</Link>
        </div>
      </section>

      <Disclaimer />
      <footer className="mt-8 border-t border-line pt-6 text-xs text-muted">
        © {new Date().getFullYear()} {process.env.APP_NAME || "NIZA INVEST"}.
      </footer>
    </div>
  );
}
