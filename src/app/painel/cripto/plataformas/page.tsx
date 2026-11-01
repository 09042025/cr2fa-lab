import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DEFI_PLATFORMS, DEXES, EXCHANGES, KIND_LABEL, getDexVolumes, getPlatformTvl, type Platform, type PlatformKind, type TvlInfo, type VolInfo } from "@/lib/platforms";
import { DataStatus, Disclaimer, PageTitle } from "@/components/ui";
import { pct, usdCompact } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "DEX e Plataformas DeFi" };

type SP = { secao?: string; rede?: string; tipo?: string; q?: string; ordem?: string };
const SECTIONS = [
  { id: "defi", label: "Plataformas DeFi" },
  { id: "dex", label: "DEX (trocas)" },
  { id: "corretoras", label: "Corretoras" },
] as const;

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-gold-soft hover:underline">{children}<span aria-hidden className="text-xs">↗</span></a>
);

function Chains({ info, selected }: { info?: TvlInfo; selected: string }) {
  const names = info ? Object.entries(info.chains).sort((a, b) => b[1] - a[1]).map(([c]) => c) : [];
  if (!names.length) return <span className="text-muted">—</span>;
  const shown = names.slice(0, 5);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((c) => <span key={c} className={`rounded border px-1.5 text-xs ${c === selected ? "border-gold text-gold-soft" : "border-line text-muted"}`}>{c}</span>)}
      {names.length > shown.length && <span className="text-xs text-muted" title={names.slice(5).join(", ")}>+{names.length - shown.length}</span>}
    </span>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const sp = await searchParams;
  const secao = SECTIONS.some((s) => s.id === sp.secao) ? sp.secao! : "defi";
  const tvlRes = secao === "corretoras" ? null : await getPlatformTvl();
  const tvl = tvlRes?.data ?? {};

  // Redes disponíveis: só as que aparecem nos dados reais, ordenadas pelo TVL somado.
  const chainTotals = new Map<string, number>();
  for (const info of Object.values(tvl)) for (const [c, v] of Object.entries(info.chains)) chainTotals.set(c, (chainTotals.get(c) ?? 0) + v);
  const chainList = [...chainTotals.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const rede = sp.rede && chainTotals.has(sp.rede) ? sp.rede : "";
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 40);

  const base: Platform[] = secao === "dex" ? DEXES : DEFI_PLATFORMS;
  const kinds = [...new Set(base.map((p) => p.kind))] as PlatformKind[];
  const tipo = kinds.includes(sp.tipo as PlatformKind) ? (sp.tipo as PlatformKind) : "";

  let volRes: Awaited<ReturnType<typeof getDexVolumes>> | null = null;
  let vols: Record<string, VolInfo> = {};
  if (secao === "dex") {
    volRes = await getDexVolumes(rede || undefined);
    vols = volRes.data ?? {};
  }
  const tvlOn = (id: string) => (rede ? tvl[id]?.chains[rede] ?? null : tvl[id]?.tvl ?? null);

  let rows = base.filter((p) => (!tipo || p.kind === tipo) && (!q || p.name.toLowerCase().includes(q) || p.note.toLowerCase().includes(q)));
  if (rede) rows = rows.filter((p) => tvl[p.id]?.chains[rede] !== undefined);
  const ordem = sp.ordem === "volume" && secao === "dex" ? "volume" : sp.ordem === "nome" ? "nome" : "tvl";
  rows = [...rows].sort((a, b) =>
    ordem === "nome" ? a.name.localeCompare(b.name)
    : ordem === "volume" ? (vols[b.id]?.v24h ?? -1) - (vols[a.id]?.v24h ?? -1)
    : (tvlOn(b.id) ?? -1) - (tvlOn(a.id) ?? -1));

  const sec = (id: string) => `/painel/cripto/plataformas?secao=${id}`;

  return (
    <>
      <PageTitle title="DEX e Plataformas DeFi" subtitle="Os principais protocolos de DeFi, corretoras descentralizadas (DEX) e corretoras tradicionais, com links oficiais, redes disponíveis, TVL e volumes." />

      <div className="mb-4 flex flex-wrap gap-2">
        {SECTIONS.map((s) => <Link key={s.id} href={sec(s.id)} className={`btn ${secao === s.id ? "btn-gold" : "btn-ghost"}`}>{s.label}</Link>)}
      </div>

      {secao === "corretoras" ? (
        <section className="space-y-6">
          <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold-soft">
            Cuidado com golpes: confira sempre o endereço do site, nunca entre por link de anúncio, e-mail ou mensagem, e ative a verificação em duas etapas. Os links abaixo são os sites oficiais.
          </p>
          {(["Brasil", "Global"] as const).map((o) => (
            <div key={o}>
              <h2 className="mb-2 font-semibold">{o === "Brasil" ? "Corretoras brasileiras" : "Corretoras globais"}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {EXCHANGES.filter((x) => x.origin === o).map((x) => (
                  <li key={x.name} className="card p-4">
                    <p className="mb-1"><Ext href={x.url}>{x.name}</Ext></p>
                    <p className="text-xs text-muted">{x.note}</p>
                    <p className="mt-2 truncate text-xs text-muted">{x.url.replace(/^https:\/\//, "")}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : (
        <section className="card p-4">
          <p className="mb-2 text-xs text-muted">
            {secao === "dex"
              ? "Corretoras descentralizadas: você troca ativos direto da sua carteira, sem cadastro. O volume mostra o quanto foi negociado em 24 horas, 7 dias, 30 dias e 1 ano."
              : "Plataformas em que você empresta, toma emprestado, faz staking ou busca rendimento. TVL é o valor total depositado no protocolo."}
          </p>
          {tvlRes && <DataStatus result={tvlRes} source="DefiLlama" />}
          {volRes && volRes.data === null && <p className="mb-2 text-xs text-gold-soft">Os volumes de negociação não carregaram agora{rede ? ` para a rede ${rede}` : ""}. Tente novamente em alguns minutos.</p>}

          <form method="get" className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="secao" value={secao} />
            <div>
              <label className="label" htmlFor="rede">Rede</label>
              <select id="rede" name="rede" defaultValue={rede} className="input">
                <option value="">Todas as redes</option>
                {chainList.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {secao === "defi" && (
              <div>
                <label className="label" htmlFor="tipo">Tipo</label>
                <select id="tipo" name="tipo" defaultValue={tipo} className="input">
                  <option value="">Todos</option>
                  {kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
              </div>
            )}
            <div><label className="label" htmlFor="q">Buscar</label><input id="q" name="q" defaultValue={sp.q} className="input" placeholder="ex.: Aave, staking" /></div>
            <div>
              <label className="label" htmlFor="ordem">Ordenar por</label>
              <select id="ordem" name="ordem" defaultValue={ordem} className="input">
                <option value="tvl">TVL (maior primeiro)</option>
                {secao === "dex" && <option value="volume">Volume 24h</option>}
                <option value="nome">Nome</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button className="btn btn-gold" type="submit">Filtrar</button>
              <Link href={sec(secao)} className="btn btn-ghost">Limpar</Link>
            </div>
          </form>

          {rede && secao === "dex" && volRes?.data && <p className="mb-2 text-xs text-muted">Volumes e TVL mostrados são só da rede {rede}.</p>}
          {rede && secao === "defi" && <p className="mb-2 text-xs text-muted">TVL mostrado é só da rede {rede}.</p>}

          {rows.length === 0 ? (
            <p className="py-6 text-sm text-muted">{tvlRes?.data === null ? "Sem dados da fonte agora." : "Nenhuma plataforma encontrada com esses filtros."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>Plataforma</th>{secao === "defi" && <th>Tipo</th>}<th>Redes</th><th className="num">TVL{rede ? ` (${rede})` : ""}</th>
                    {secao === "defi" && <th className="num">TVL 7d</th>}
                    {secao === "dex" && <><th className="num">Volume 24h</th><th className="num">7 dias</th><th className="num">30 dias</th><th className="num">1 ano</th></>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const info = tvl[p.id];
                    const v = vols[p.id];
                    const ch = info?.change7d ?? null;
                    return (
                      <tr key={p.id}>
                        <td className={secao === "dex" ? "min-w-44" : "whitespace-nowrap"}><Ext href={p.url}>{p.name}</Ext>{secao === "dex" && <span className="block max-w-56 text-xs font-normal text-muted">{p.note}</span>}</td>
                        {secao === "defi" && <td className="w-64 min-w-48 text-xs text-muted"><span className="mr-1 rounded border border-line px-1">{KIND_LABEL[p.kind]}</span>{p.note}</td>}
                        <td className="w-44 min-w-36"><Chains info={info} selected={rede} /></td>
                        <td className="num">{usdCompact(tvlOn(p.id))}</td>
                        {secao === "defi" && <td className={`num ${ch === null ? "" : ch >= 0 ? "text-up" : "text-down"}`}>{ch === null ? "—" : `${ch >= 0 ? "+" : ""}${pct(ch, 1)}`}</td>}
                        {secao === "dex" && <><td className="num">{usdCompact(v?.v24h)}</td><td className="num">{usdCompact(v?.v7d)}</td><td className="num">{usdCompact(v?.v30d)}</td><td className="num">{usdCompact(v?.v1y)}</td></>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Links oficiais escolhidos por nós. Sempre confira o endereço no navegador antes de conectar sua carteira. Projeto sem dados na fonte aparece com “—”.</p>
        </section>
      )}
      <Disclaimer />
    </>
  );
}
