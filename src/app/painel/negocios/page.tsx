import Image from "next/image";
import Link from "next/link";
import wolf from "@/assets/wfs/logo-wolf.webp";
import { requireUser } from "@/lib/auth";
import { Locked, PageTitle } from "@/components/ui";
import { BIZ_DISCLAIMER, ListingCard } from "@/components/BizBits";
import { CATEGORIES, MAX_LISTINGS, STATES, countMine, searchListings } from "@/lib/business";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "1", t: "Anuncie", d: "Cadastre o serviço que você presta ou o produto que vende, com contato, cidade, valores e seus melhores cases." },
  { n: "2", t: "Seja encontrado", d: "Os membros da White Flame Society buscam por categoria, cidade e palavra-chave e chamam você direto no WhatsApp, Instagram ou site." },
  { n: "3", t: "Ganhe confiança", d: "Indicações de membros que já contrataram, nota do Google e cases de sucesso colocam o seu anúncio no topo." },
];
const RULES = [
  "Só membros Premium anunciam e veem os contatos. Máximo de 3 anúncios por membro.",
  "Descreva com verdade o que você faz. Anúncio falso, golpe ou promessa de ganho garantido é removido e o membro, banido.",
  "A nota do Google é informada pelo anunciante e precisa vir com o link do perfil, para qualquer um conferir.",
  "Indicações valem uma por membro, ninguém indica o próprio anúncio e quem contratou de verdade marca “já contratei/comprei”.",
  "Negociação, pagamento e entrega acontecem fora da plataforma, entre as partes.",
  "Viu algo suspeito? Use “denunciar” no anúncio. A moderação analisa.",
];

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; c?: string; k?: string; s?: string; o?: string }> }) {
  const user = await requireUser();
  const isPro = user.plan === "pro" || user.role === "admin";
  if (!isPro) {
    return (
      <>
        <PageTitle title="Negócios dos membros" subtitle="Vitrine de profissionais e produtos da comunidade." />
        <Locked feature="Negócios (exclusivo do plano Premium)" text="Encontre profissionais e produtos de membros da comunidade ou divulgue o seu negócio para quem confia na White Flame Society." />
      </>
    );
  }
  const sp = await searchParams;
  const list = searchListings({ q: sp.q, category: sp.c, kind: sp.k, state: sp.s, sort: sp.o });
  const mine = countMine(user.id);
  const sel = "rounded-lg border border-line bg-ink px-3 py-2 text-sm text-white outline-none focus:border-gold/60";

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-panel-2 via-panel to-ink p-6 md:p-8">
        <Image src={wolf} alt="" aria-hidden unoptimized priority className="pointer-events-none absolute right-0 top-1/2 hidden h-[128%] w-auto max-w-none -translate-y-1/2 select-none md:block"
          style={{ mixBlendMode: "screen", opacity: 0.95, WebkitMaskImage: "radial-gradient(circle at center, #000 33%, transparent 49%), radial-gradient(ellipse 50% 13% at 50% 64%, #000 55%, transparent 100%)", maskImage: "radial-gradient(circle at center, #000 33%, transparent 49%), radial-gradient(ellipse 50% 13% at 50% 64%, #000 55%, transparent 100%)" }} />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.25em] text-gold/80">White Flame Society</p>
        <h1 className="relative mt-1 font-display text-2xl font-bold text-gold-soft md:text-4xl">Negócios dos membros</h1>
        <p className="relative mt-3 max-w-3xl text-sm leading-relaxed text-muted md:max-w-[58%] md:text-base">
          Criar riqueza também é fazer negócios entre nós. Aqui, membros que são profissionais e pequenos empreendedores ganham a exposição que as redes sociais nem sempre dão, e quem precisa de um serviço ou produto encontra gente da própria comunidade, com histórico, indicações e cases à vista.
        </p>
        <div className="relative mt-5 flex flex-wrap gap-3">
          <Link href="/painel/negocios/novo" className="rounded-lg bg-gradient-to-b from-gold-soft to-gold px-5 py-2.5 text-sm font-bold text-black">Anunciar meu negócio</Link>
          <a href="#anuncios" className="rounded-lg border border-gold/40 px-5 py-2.5 text-sm font-semibold text-gold-soft hover:bg-gold/10">Encontrar profissionais</a>
        </div>
        {mine > 0 && <p className="mt-3 text-xs text-muted">Você tem {mine} de {MAX_LISTINGS} anúncios. <Link href={`/painel/negocios?q=${encodeURIComponent(user.name)}`} className="underline">Ver</Link></p>}
      </section>

      <section className="mb-6 grid gap-3 md:grid-cols-3" aria-label="Como funciona">
        {STEPS.map((s) => (
          <div key={s.n} className="card border-gold/15 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/50 font-display font-bold text-gold-soft">{s.n}</span>
            <h2 className="mt-2 font-display font-bold text-white">{s.t}</h2>
            <p className="mt-1 text-sm text-muted">{s.d}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-xl border border-down/40 bg-down/5 p-4 text-sm text-muted">
        <p className="mb-1 font-semibold text-white">Importante: o resultado é responsabilidade de quem presta o serviço ou vende o produto</p>
        <p>{BIZ_DISCLAIMER}</p>
      </section>

      <details className="card mb-6 border-gold/15 p-4 text-sm">
        <summary className="cursor-pointer font-semibold text-gold-soft">Regras da vitrine</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      </details>

      <form id="anuncios" method="get" className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Buscar: pintor, designer, doces, cidade…" className={`${sel} min-w-[14rem] flex-1`} />
        <select name="c" defaultValue={sp.c ?? ""} className={sel}><option value="">Todas as categorias</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <select name="k" defaultValue={sp.k ?? ""} className={sel}><option value="">Serviços e produtos</option><option value="service">Só serviços</option><option value="product">Só produtos</option></select>
        <select name="s" defaultValue={sp.s ?? ""} className={sel}><option value="">Todo o Brasil</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
        <select name="o" defaultValue={sp.o ?? ""} className={sel}><option value="">Mais indicados</option><option value="google">Melhor nota no Google</option><option value="new">Mais recentes</option></select>
        <button className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-semibold text-gold-soft hover:bg-gold/10">Buscar</button>
      </form>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          <p>Nenhum anúncio encontrado{sp.q || sp.c || sp.k || sp.s ? " com esses filtros" : " ainda"}.</p>
          <Link href="/painel/negocios/novo" className="mt-3 inline-block text-gold-soft underline">Seja o primeiro a anunciar</Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((l) => <ListingCard key={l.id} l={l} />)}</div>
      )}
    </>
  );
}
