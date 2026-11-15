"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decryptVault, encryptVault, isValidPhrase, newPhrase, normalizePhrase, pickChecks, type VaultFile } from "@/lib/irpf-crypto";
import {
  PROV_INFO, buildBens, buildProventos, emptyWorkspace, parseNum, rollover, roteiro, snapshotOf, totalsByType,
  type CustomBem, type PortfolioItem, type PrevBem, type ProvType, type Workspace,
} from "@/lib/irpf";

const IDLE_MS = 10 * 60 * 1000;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const usd = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD" });

type Stage = "gate" | "new" | "check" | "open" | "work";
type Tab = "guia" | "bens" | "rend" | "salvar";

const CUSTOM_PRESETS: { label: string; grupo: string; codigo: string }[] = [
  { label: "Imóvel: apartamento", grupo: "01", codigo: "11" },
  { label: "Imóvel: casa", grupo: "01", codigo: "12" },
  { label: "Imóvel: terreno", grupo: "01", codigo: "13" },
  { label: "Veículo automotor (carro, moto)", grupo: "02", codigo: "01" },
  { label: "Poupança", grupo: "04", codigo: "01" },
  { label: "Conta corrente", grupo: "06", codigo: "01" },
  { label: "Outros bens e direitos", grupo: "99", codigo: "99" },
];

export function IrpfApp({ items, year }: { items: PortfolioItem[]; year: number }) {
  const [stage, setStage] = useState<Stage>("gate");
  const [phrase, setPhrase] = useState("");
  const [ws, setWs] = useState<Workspace | null>(null);
  const [tab, setTab] = useState<Tab>("guia");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const lock = useCallback((why?: string) => { setWs(null); setPhrase(""); setStage("gate"); setDirty(false); setMsg(why ?? null); }, []);

  // Trava sozinho depois de 10 minutos sem uso: apaga tudo da memória.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (stage !== "work") return;
    const reset = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => lock("Cofre travado por inatividade (10 minutos). Seus dados foram apagados da tela. Salve o arquivo antes de sair e abra de novo com as 24 palavras."), IDLE_MS); };
    const evs = ["pointerdown", "keydown", "scroll"] as const;
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { evs.forEach((e) => window.removeEventListener(e, reset)); if (timer.current) clearTimeout(timer.current); };
  }, [stage, lock]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const update = (f: (w: Workspace) => Workspace) => { setWs((w) => (w ? f(w) : w)); setDirty(true); };

  /* ---------------------------- entrada: criar ou abrir ---------------------------- */
  const [words, setWords] = useState("");
  const [checks, setChecks] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [openPhrase, setOpenPhrase] = useState("");
  const [file, setFile] = useState<VaultFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [opened, setOpened] = useState<Workspace | null>(null);

  const startNew = () => { setWords(newPhrase()); setChecks(pickChecks()); setAnswers({}); setStage("new"); setMsg(null); };
  const confirmWords = () => {
    const list = words.split(" ");
    if (checks.some((n) => (answers[n] ?? "").trim().toLowerCase() !== list[n - 1])) { setMsg("As palavras não conferem. Olhe o papel onde anotou e tente de novo."); return; }
    setPhrase(words); setWords(""); setWs(emptyWorkspace(year)); setStage("work"); setTab("guia"); setMsg(null); setDirty(true);
  };
  const pickFile = async (f: File | null) => {
    setFile(null); setFileName(""); setMsg(null);
    if (!f) return;
    if (f.size > 5_000_000) { setMsg("Arquivo grande demais para ser um cofre."); return; }
    try { setFile(JSON.parse(await f.text()) as VaultFile); setFileName(f.name); } catch { setMsg("Esse arquivo não parece um cofre do Niza (.niza)."); }
  };
  const openVault = async () => {
    if (!file) { setMsg("Escolha o arquivo do cofre (.niza)."); return; }
    if (!isValidPhrase(openPhrase)) { setMsg("As 24 palavras não são válidas. Confira a ordem e a grafia."); return; }
    setBusy(true); setMsg(null);
    try {
      const w = await decryptVault<Workspace>(openPhrase, file);
      if (!w || w.v !== 1 || typeof w.year !== "number") throw new Error("Conteúdo do cofre inesperado.");
      const full: Workspace = { ...emptyWorkspace(w.year), ...w };
      setPhrase(normalizePhrase(openPhrase)); setOpenPhrase("");
      if (full.year < year) { setOpened(full); setStage("open"); } else { setWs(full); setStage("work"); setTab("bens"); }
    } catch (e) { setMsg(e instanceof Error ? e.message : "Não foi possível abrir."); }
    setBusy(false);
  };

  /* ---------------------------------- cálculos ---------------------------------- */
  const bens = useMemo(() => (ws ? buildBens(items, ws) : []), [items, ws]);
  const prov = useMemo(() => (ws ? buildProventos(items, ws) : []), [items, ws]);
  const totals = useMemo(() => totalsByType(prov), [prov]);

  /* ----------------------------------- salvar ----------------------------------- */
  const save = async () => {
    if (!ws) return;
    setBusy(true); setMsg(null);
    try {
      const out: Workspace = { ...ws, savedAt: new Date().toISOString(), snapshot: snapshotOf(bens, ws.custom) };
      const f = await encryptVault(phrase, out);
      download(`irpf-${ws.year}.niza`, JSON.stringify(f), "application/octet-stream");
      setWs(out); setDirty(false);
      setMsg("Cofre salvo e criptografado. Guarde o arquivo (nuvem, e-mail, pen drive). Sem as 24 palavras ninguém consegue abri-lo, nem nós.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erro ao salvar."); }
    setBusy(false);
  };

  /* ----------------------------------- telas ----------------------------------- */
  if (stage === "gate") return (
    <>
      <Privacy />
      {msg && <p role="status" className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-soft">{msg}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold text-gold-soft">Primeira vez: criar meu cofre</h2>
          <p className="mt-2 text-sm text-muted">Vamos gerar 24 palavras secretas, o mesmo padrão de uma carteira cripto. Elas são a única chave dos seus dados.</p>
          <button type="button" className="btn btn-gold mt-4" onClick={startNew}>Gerar minhas 24 palavras</button>
        </section>
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold text-gold-soft">Já tenho um cofre</h2>
          <p className="mt-2 text-sm text-muted">Escolha o arquivo <strong className="text-white">.niza</strong> que você salvou e digite as 24 palavras. Serve também para atualizar a declaração de um ano para o outro.</p>
          <label className="label mt-3" htmlFor="vf">Arquivo do cofre</label>
          <input id="vf" type="file" accept=".niza,application/octet-stream" className="input w-full" onChange={(e) => void pickFile(e.target.files?.[0] ?? null)} />
          <label className="label mt-3" htmlFor="ph">As 24 palavras</label>
          <textarea id="ph" className="input w-full" rows={3} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={openPhrase} onChange={(e) => setOpenPhrase(e.target.value)} placeholder="palavra1 palavra2 palavra3 ..." />
          <button type="button" disabled={busy} className="btn btn-gold mt-3" onClick={() => void openVault()}>{busy ? "Abrindo…" : "Abrir cofre"}</button>
          {fileName && <p className="mt-2 text-xs text-muted">Arquivo: {fileName}</p>}
        </section>
      </div>
    </>
  );

  if (stage === "new") return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-bold text-gold-soft">Suas 24 palavras secretas</h2>
      <p role="alert" className="mt-2 rounded-lg border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">Anote à mão, em papel, na ordem. Não tire print, não copie, não salve no celular. <strong>Não existe &quot;esqueci a senha&quot;</strong>: nós não guardamos estas palavras. Quem as tiver abre o seu cofre; sem elas, ninguém abre.</p>
      <ol className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 md:grid-cols-4">
        {words.split(" ").map((w, i) => <li key={i} className="rounded-lg border border-line bg-panel-2 px-3 py-2"><span className="mr-2 text-xs text-muted">{i + 1}.</span><span className="select-none font-semibold text-white">{w}</span></li>)}
      </ol>
      <h3 className="mt-5 font-semibold">Confirme que anotou</h3>
      <p className="text-xs text-muted">Digite as palavras pedidas.</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {checks.map((n) => <div key={n}><label className="label" htmlFor={`w${n}`}>Palavra nº {n}</label><input id={`w${n}`} className="input" autoComplete="off" autoCapitalize="off" spellCheck={false} value={answers[n] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [n]: e.target.value }))} /></div>)}
      </div>
      {msg && <p role="alert" className="mt-3 text-sm text-down">{msg}</p>}
      <div className="mt-4 flex gap-2"><button type="button" className="btn btn-gold" onClick={confirmWords}>Já anotei, continuar</button><button type="button" className="btn btn-ghost" onClick={() => { setWords(""); setStage("gate"); }}>Cancelar</button></div>
    </section>
  );

  if (stage === "open" && opened) return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-bold text-gold-soft">Cofre de {opened.year} aberto</h2>
      <p className="mt-2 text-sm text-muted">Este arquivo é da declaração de {opened.year + 1} (ano-calendário {opened.year}). Para a de {year + 1}, atualizamos tudo: o que você tinha em 31/12/{opened.year} vira a &quot;situação anterior&quot;, e corretoras, CNPJs e bens extras (imóvel, veículo) são mantidos.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-gold" onClick={() => { setWs(rollover(opened, year)); setOpened(null); setStage("work"); setTab("bens"); setDirty(true); }}>Atualizar para {year}</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setWs(opened); setOpened(null); setStage("work"); setTab("bens"); }}>Só ver/editar o de {opened.year}</button>
      </div>
    </section>
  );

  if (!ws) return null;
  const warnCount = bens.reduce((a, b) => a + b.warnings.length, 0);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-up/40 bg-up/10 px-4 py-2.5 text-sm">
        <span className="flex items-center gap-2 text-up"><span aria-hidden>🔒</span> Cofre aberto · ano-calendário {ws.year} · só no seu navegador{dirty ? " · alterações não salvas" : ""}</span>
        <button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => lock("Cofre travado. Seus dados foram apagados da tela.")}>Travar e limpar a tela</button>
      </div>
      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line" aria-label="Etapas">
        {([["guia", "Passo a passo"], ["bens", `Bens e Direitos${warnCount ? ` (${warnCount} avisos)` : ""}`], ["rend", "Rendimentos"], ["salvar", "Salvar e baixar"]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${tab === k ? "border-gold text-gold-soft" : "border-transparent text-muted"}`}>{l}</button>
        ))}
      </nav>
      {msg && <p role="status" className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-soft">{msg}</p>}

      {tab === "guia" && <Guide year={ws.year} hasPrev={ws.previous.length > 0} />}

      {tab === "bens" && (
        <div className="space-y-4">
          <p className="text-sm text-muted">Os ativos da sua carteira já vieram preenchidos. Na declaração, ações, FIIs e cripto entram pelo <strong className="text-white">custo de aquisição</strong> (quantidade × preço médio), não pelo valor de hoje. Confira se a quantidade é a que você tinha em <strong className="text-white">31/12/{ws.year}</strong>.</p>
          {bens.length === 0 && <p className="card p-4 text-sm text-muted">Nenhum ativo na carteira. Cadastre em Portfólio ou adicione bens abaixo.</p>}
          {bens.map((b) => (
            <section key={b.key} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{b.item.ticker ?? b.item.label} <span className="text-xs font-normal text-muted">· {b.item.label}</span></h3>
                <span className="rounded-full border border-gold/40 px-2.5 py-0.5 text-xs text-gold-soft">Grupo {b.code.grupo} · Código {b.code.codigo}</span>
              </div>
              <p className="text-xs text-muted">{b.code.nome}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Field label="Quantidade em 31/12" value={b.qty === null ? "" : String(b.qty).replace(".", ",")} onChange={(v) => update((w) => ({ ...w, edits: { ...w.edits, [b.item.key]: { ...w.edits[b.item.key], qty: parseNum(v) } } }))} />
                <Field label={b.item.kind === "acao_us" ? "Preço médio (US$)" : "Preço médio (R$)"} value={b.avg === null ? "" : String(b.avg).replace(".", ",")} onChange={(v) => update((w) => ({ ...w, edits: { ...w.edits, [b.item.key]: { ...w.edits[b.item.key], avg: parseNum(v) } } }))} />
                <Field label="Corretora / exchange" value={b.custody} text onChange={(v) => update((w) => ({ ...w, edits: { ...w.edits, [b.item.key]: { ...w.edits[b.item.key], custody: v } } }))} />
                {b.item.kind === "acao" || b.item.kind === "fii" ? <Field label="CNPJ" value={b.cnpj} text onChange={(v) => update((w) => ({ ...w, edits: { ...w.edits, [b.item.key]: { ...w.edits[b.item.key], cnpj: v } } }))} /> : <div />}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted">Situação em 31/12/{ws.year - 1}</dt><dd className="font-semibold">{b.prev !== null ? brl(b.prev) : "—"}</dd></div>
                <div><dt className="text-xs text-muted">Situação em 31/12/{ws.year}</dt><dd className="font-semibold">{b.total !== null ? (b.foreign ? `US$ ${b.total.toFixed(2)} (converter em R$)` : brl(b.total)) : "—"}</dd></div>
              </dl>
              <label className="label mt-3" htmlFor={`t-${b.key}`}>Discriminação (texto para colar no programa)</label>
              <textarea id={`t-${b.key}`} className="input w-full text-sm" rows={4} value={b.text} spellCheck={false} onChange={(e) => update((w) => ({ ...w, edits: { ...w.edits, [b.item.key]: { ...w.edits[b.item.key], text: e.target.value } } }))} />
              {b.warnings.length > 0 && <ul className="mt-2 space-y-1 text-xs text-yellow-300">{b.warnings.map((x) => <li key={x}>● {x}</li>)}</ul>}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button type="button" className="btn btn-ghost !py-1" onClick={() => void navigator.clipboard.writeText(b.text).then(() => setMsg("Texto copiado."))}>Copiar texto</button>
                {b.text !== b.autoText && <button type="button" className="btn btn-ghost !py-1" onClick={() => update((w) => ({ ...w, edits: { ...w.edits, [b.item.key]: { ...w.edits[b.item.key], text: undefined } } }))}>Voltar ao texto automático</button>}
                <button type="button" className="btn btn-ghost !py-1" onClick={() => update((w) => ({ ...w, edits: { ...w.edits, [b.item.key]: { ...w.edits[b.item.key], skip: true } } }))}>Não incluir (já vendi)</button>
              </div>
            </section>
          ))}
          {Object.entries(ws.edits).some(([, e]) => e.skip) && (
            <p className="text-xs text-muted">Fora da declaração: {Object.entries(ws.edits).filter(([, e]) => e.skip).map(([k]) => items.find((i) => i.key === k)?.ticker ?? k).join(", ")}. <button type="button" className="text-gold-soft underline" onClick={() => update((w) => ({ ...w, edits: Object.fromEntries(Object.entries(w.edits).map(([k, e]) => [k, { ...e, skip: false }])) }))}>incluir de novo</button></p>
          )}
          <CustomBens ws={ws} update={update} />
          <PrevBens ws={ws} update={update} />
        </div>
      )}

      {tab === "rend" && (
        <div className="space-y-4">
          <p role="note" className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">Os valores abaixo são <strong>estimativas</strong>: somamos os proventos do ano (data com) × a quantidade que você tem hoje, sem saber quando você comprou ou vendeu. O número oficial está no <strong>informe de rendimentos</strong> da sua corretora (disponível em fevereiro). Ajuste cada valor para bater com ele.</p>
          {prov.length === 0 && <p className="card p-4 text-sm text-muted">Nenhuma ação ou FII com proventos na carteira.</p>}
          {prov.map((p) => {
            const info = PROV_INFO[p.type];
            return (
              <section key={p.key} className="card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold">{p.item.ticker} <span className="text-xs font-normal text-muted">· {p.payer}</span></h3><span className="text-xs text-muted">{p.lines} provento(s) em {ws.year} · estimativa {p.currency === "USD" ? usd(p.estimated) : brl(p.estimated)}</span></div>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div><label className="label" htmlFor={`pt-${p.key}`}>Tipo</label>
                    <select id={`pt-${p.key}`} className="input w-full" value={p.type} onChange={(e) => update((w) => ({ ...w, prov: { ...w.prov, [p.item.key]: { ...w.prov[p.item.key], type: e.target.value as ProvType, irrf: null } } }))}>
                      {(["dividendos", "jcp", "fii", "exterior"] as ProvType[]).filter((t) => (p.item.kind === "acao_us" ? t === "exterior" : p.item.kind === "fii" ? t === "fii" : t === "dividendos" || t === "jcp")).map((t) => <option key={t} value={t}>{PROV_INFO[t].titulo}</option>)}
                    </select></div>
                  <Field label={`Valor ${p.type === "jcp" ? "bruto " : ""}recebido no ano (${p.currency === "USD" ? "US$" : "R$"})`} value={String(p.gross).replace(".", ",")} onChange={(v) => update((w) => ({ ...w, prov: { ...w.prov, [p.item.key]: { ...w.prov[p.item.key], gross: parseNum(v) ?? 0 } } }))} />
                  {p.type === "jcp" && <Field label="IR retido na fonte (R$)" value={String(p.irrf).replace(".", ",")} onChange={(v) => update((w) => ({ ...w, prov: { ...w.prov, [p.item.key]: { ...w.prov[p.item.key], irrf: parseNum(v) ?? 0 } } }))} />}
                </div>
                <p className="mt-2 text-xs text-muted">Vai em: <strong className="text-white">{info.ficha}</strong>{info.codigo !== "—" ? ` · código ${info.codigo}` : ""}. Fonte pagadora: {p.payer}{p.cnpj ? ` (CNPJ ${p.cnpj})` : ""}. {info.dica}</p>
              </section>
            );
          })}
          <section className="card p-4 text-sm">
            <h3 className="font-semibold">Resumo do que vai em cada ficha</h3>
            <ul className="mt-2 space-y-1 text-muted">
              <li>Isentos · código 09 (dividendos): <strong className="text-white">{brl(totals.dividendos)}</strong></li>
              <li>Isentos · código 26 (FII/Fiagro): <strong className="text-white">{brl(totals.fii)}</strong></li>
              <li>Exclusiva/definitiva · código 10 (JCP bruto): <strong className="text-white">{brl(totals.jcp)}</strong></li>
              <li>Exterior (dividendos dos EUA, em US$): <strong className="text-white">{usd(totals.exterior)}</strong></li>
            </ul>
            <p className="mt-3 text-xs text-muted">Regra nova (Lei 15.270/2025): desde 1/1/2026, dividendos acima de R$ 50 mil por mês, de uma mesma empresa para você, sofrem 10% de imposto retido na fonte; e há tributação mínima para rendas muito altas. Se isso acontecer, o informe de rendimentos mostra o valor e o programa da Receita indica onde lançar. Confirme com um contador.</p>
          </section>
        </div>
      )}

      {tab === "salvar" && (
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="font-display text-lg font-bold text-gold-soft">1. Salvar o cofre (criptografado)</h2>
            <p className="mt-2 text-sm text-muted">Gera o arquivo <strong className="text-white">irpf-{ws.year}.niza</strong> no seu aparelho. Ele só abre com as suas 24 palavras. Ano que vem, abra este arquivo aqui e atualizamos tudo para a nova declaração.</p>
            <button type="button" disabled={busy} className="btn btn-gold mt-3" onClick={() => void save()}>{busy ? "Criptografando…" : "Salvar cofre (.niza)"}</button>
          </section>
          <section className="card p-5">
            <h2 className="font-display text-lg font-bold text-gold-soft">2. Roteiro para preencher a declaração oficial</h2>
            <p className="mt-2 text-sm text-muted">Texto com tudo o que vai em cada ficha, para você ir copiando e colando no programa da Receita.</p>
            <p role="note" className="mt-2 text-xs text-yellow-300">Atenção: este arquivo de texto NÃO é criptografado. Use, apague depois e não envie por e-mail ou app de mensagem.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => void navigator.clipboard.writeText(roteiro(bens, ws.custom, prov, ws.year)).then(() => setMsg("Roteiro copiado. Cole no programa e depois limpe a área de transferência."))}>Copiar roteiro</button>
              <button type="button" className="btn btn-ghost" onClick={() => download(`roteiro-irpf-${ws.year}.txt`, roteiro(bens, ws.custom, prov, ws.year), "text/plain")}>Baixar roteiro (.txt)</button>
            </div>
          </section>
          <section className="card p-5">
            <h2 className="font-display text-lg font-bold text-gold-soft">3. Baixar o programa oficial da Receita</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>Acesse o site oficial: <strong className="text-white">gov.br/receitafederal</strong> e procure por &quot;Programa IRPF&quot; (ou &quot;Download do programa&quot;). Baixe somente de lá.</li>
              <li>Escolha a versão do seu sistema (Windows, Mac, Linux), instale e abra.</li>
              <li>Em <em>Declaração → Nova</em>, escolha o ano certo e siga as fichas do passo a passo, usando o roteiro acima.</li>
              <li>Antes de enviar, use <em>Ferramentas → Verificar pendências</em> e guarde o recibo.</li>
            </ol>
          </section>
          <label className="block text-sm"><span className="label">Anotações pessoais (ficam no cofre)</span><textarea className="input mt-1 w-full" rows={3} value={ws.notes} onChange={(e) => update((w) => ({ ...w, notes: e.target.value }))} /></label>
        </div>
      )}
    </>
  );
}

function Field({ label, value, onChange, text }: { label: string; value: string; onChange: (v: string) => void; text?: boolean }) {
  return <div><label className="label">{label}</label><input className="input w-full" inputMode={text ? "text" : "decimal"} autoComplete="off" spellCheck={false} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Privacy() {
  return (
    <section className="card mb-6 border-up/30 p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-up"><span aria-hidden>🔒</span> Privacidade total: só você vê</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>Tudo é calculado e criptografado <strong className="text-white">no seu aparelho</strong> (AES-256). Nenhum dado da declaração é enviado ou guardado em servidor, nem acessível ao administrador.</li>
        <li>A chave são <strong className="text-white">24 palavras</strong> (padrão de carteira cripto) que só você tem. Não existe recuperação: perdeu as palavras, perdeu o cofre.</li>
        <li>Você guarda o arquivo <strong className="text-white">.niza</strong> onde quiser. O cofre trava e apaga a tela sozinho depois de 10 minutos parado.</li>
        <li>A única coisa que vem do servidor é a sua carteira (que você já cadastrou no Portfólio) para preencher os bens automaticamente.</li>
        <li>Você pode conferir: abra as ferramentas do navegador (aba Rede) e veja que nada é enviado ao salvar, editar ou abrir o cofre.</li>
      </ul>
    </section>
  );
}

function CustomBens({ ws, update }: { ws: Workspace; update: (f: (w: Workspace) => Workspace) => void }) {
  const [p, setP] = useState(0);
  const [d, setD] = useState(""); const [v, setV] = useState(""); const [pv, setPv] = useState("");
  const add = () => {
    const val = parseNum(v);
    if (!d.trim() || val === null) return;
    const c: CustomBem = { id: crypto.randomUUID(), grupo: CUSTOM_PRESETS[p].grupo, codigo: CUSTOM_PRESETS[p].codigo, discriminacao: d.trim(), valor: val, prev: parseNum(pv) };
    update((w) => ({ ...w, custom: [...w.custom, c] })); setD(""); setV(""); setPv("");
  };
  return (
    <section className="card p-4">
      <h3 className="font-semibold">Outros bens (imóvel, veículo, contas...)</h3>
      <p className="text-xs text-muted">Só você vê. Declare pelo valor de aquisição (e não o de mercado). Confira o código no programa da Receita.</p>
      {ws.custom.map((c) => (
        <div key={c.id} className="mt-3 rounded-lg border border-line bg-panel-2 p-3 text-sm">
          <p className="text-xs text-gold-soft">Grupo {c.grupo} · Código {c.codigo}</p>
          <p>{c.discriminacao}</p>
          <p className="text-xs text-muted">31/12/{ws.year - 1}: {c.prev !== null ? brl(c.prev) : "—"} · 31/12/{ws.year}: {brl(c.valor)} <button type="button" className="ml-2 text-down underline" onClick={() => update((w) => ({ ...w, custom: w.custom.filter((x) => x.id !== c.id) }))}>remover</button></p>
        </div>
      ))}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div><label className="label">Tipo</label><select className="input w-full" value={p} onChange={(e) => setP(Number(e.target.value))}>{CUSTOM_PRESETS.map((x, i) => <option key={x.label} value={i}>{x.label} ({x.grupo}-{x.codigo})</option>)}</select></div>
        <Field label="Valor em 31/12 do ano anterior (R$)" value={pv} onChange={setPv} />
        <Field label="Valor em 31/12 deste ano (R$)" value={v} onChange={setV} />
        <div className="md:col-span-2"><label className="label">Descrição</label><textarea className="input w-full" rows={2} value={d} onChange={(e) => setD(e.target.value)} placeholder="Ex.: Apartamento residencial na Rua X, nº 10, São Paulo/SP, matrícula 1234, adquirido em 2019." /></div>
      </div>
      <button type="button" className="btn btn-ghost mt-3" onClick={add}>Adicionar bem</button>
    </section>
  );
}

function PrevBens({ ws, update }: { ws: Workspace; update: (f: (w: Workspace) => Workspace) => void }) {
  const [t, setT] = useState(""); const [v, setV] = useState("");
  const add = () => { const val = parseNum(v); if (!t.trim() || val === null) return; const pb: PrevBem = { id: crypto.randomUUID(), grupo: "", codigo: "", discriminacao: t.trim(), valor: val }; update((w) => ({ ...w, previous: [...w.previous, pb] })); setT(""); setV(""); };
  return (
    <section className="card p-4">
      <h3 className="font-semibold">Declaração do ano anterior</h3>
      <p className="text-xs text-muted">Se você abriu o cofre do ano passado, isso já veio sozinho. Se é a primeira vez no cofre, digite os valores de 31/12/{ws.year - 1} da sua última declaração (copie a discriminação, com o código do ativo, ex.: PETR4). A leitura direta do arquivo da Receita (.DEC) é a próxima etapa.</p>
      {ws.previous.map((x) => <p key={x.id} className="mt-2 text-sm">{x.discriminacao} <span className="text-muted">· {brl(x.valor)}</span> <button type="button" className="ml-2 text-xs text-down underline" onClick={() => update((w) => ({ ...w, previous: w.previous.filter((y) => y.id !== x.id) }))}>remover</button></p>)}
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-end">
        <Field label="Discriminação" value={t} text onChange={setT} />
        <Field label="Valor em 31/12 (R$)" value={v} onChange={setV} />
        <button type="button" className="btn btn-ghost" onClick={add}>Adicionar</button>
      </div>
    </section>
  );
}

function Guide({ year, hasPrev }: { year: number; hasPrev: boolean }) {
  const S = ({ t, children, open }: { t: string; children: React.ReactNode; open?: boolean }) => (
    <details open={open} className="card p-4"><summary className="cursor-pointer font-semibold text-gold-soft">{t}</summary><div className="mt-2 space-y-2 text-sm text-muted">{children}</div></details>
  );
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Declaração de {year + 1} (ano-calendário {year}). {hasPrev ? "Você já tem o ano anterior no cofre: é só atualizar." : "Se é a sua primeira vez, siga na ordem. Se já declarou, vá direto para Bens e Direitos."}</p>
      <S t="1. Antes de começar: o que juntar" open>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-white">Informe de rendimentos</strong> de cada corretora, banco e exchange (sai em fevereiro, no app/site de cada um).</li>
          <li>Extrato da B3 (área do investidor em investidor.b3.com.br) e o extrato de cada exchange de cripto.</li>
          <li>Se já declarou, o <strong className="text-white">recibo e a declaração do ano anterior</strong>.</li>
          <li>CPF, título de eleitor (ou o recibo anterior), dados de dependentes, despesas dedutíveis (saúde, educação) e informes de salário.</li>
        </ul>
      </S>
      <S t="2. Quem precisa declarar">
        <p>Em geral, quem recebeu rendimentos tributáveis acima do limite do ano, ou tinha bens acima de R$ 800 mil, ou vendeu ações acima de R$ 40 mil no ano (ou teve ganho), entre outras regras. Confirme a lista atual no site da Receita. Na dúvida, declare: é melhor do que cair na malha fina.</p>
      </S>
      <S t="3. Ficha Bens e Direitos (aba Bens e Direitos aqui)">
        <ul className="list-disc space-y-1 pl-5">
          <li>Declare cada ativo com <strong className="text-white">grupo e código</strong>, a discriminação e os valores em 31/12 do ano anterior e do ano atual.</li>
          <li>Ações, FIIs e cripto: valor = <strong className="text-white">custo de aquisição</strong>. Nunca o preço de mercado.</li>
          <li>Quem declarou no ano anterior: copie a discriminação anterior, atualize a quantidade e o valor.</li>
          <li>Ativo vendido por inteiro: informe a situação anterior e zero na atual, e confira se há ganho de capital.</li>
        </ul>
      </S>
      <S t="4. Rendimentos (aba Rendimentos aqui)">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-white">Dividendos de ações</strong>: Rendimentos Isentos e Não Tributáveis, código 09, uma linha por empresa pagadora, com CNPJ.</li>
          <li><strong className="text-white">JCP</strong>: Tributação Exclusiva/Definitiva, código 10. Informe o valor bruto; o imposto de 15% já foi retido.</li>
          <li><strong className="text-white">Rendimentos de FII</strong>: Isentos, código 26, quando cumprem as condições de isenção.</li>
          <li><strong className="text-white">Dividendos dos EUA</strong>: ficha de Aplicações Financeiras no Exterior (15%). Peça apoio de um contador.</li>
          <li>Renda fixa: o informe do banco traz o que vai em cada ficha, já com imposto retido.</li>
        </ul>
      </S>
      <S t="5. Vendas de ações, FIIs e cripto">
        <p>Vendas com lucro podem gerar imposto mensal (DARF até o último dia útil do mês seguinte). Ações: isenção para vendas de até R$ 20 mil no mês (operações comuns). Cripto: isenção até R$ 35 mil de vendas no mês. Esses ganhos entram na ficha de Renda Variável/ganhos de capital do programa. Este simulado ainda não calcula ganho de capital: use sua corretora ou a B3.</p>
      </S>
      <S t="6. Baixar o programa e transmitir">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Baixe o <strong className="text-white">Programa IRPF</strong> no site oficial da Receita Federal (gov.br/receitafederal). Instale e abra.</li>
          <li>Escolha entre <em>Declaração por deduções legais</em> e <em>Desconto simplificado</em>. O programa mostra qual dá menos imposto (ou mais restituição).</li>
          <li>Preencha fichas na ordem do menu, usando o roteiro desta página (aba Salvar e baixar).</li>
          <li><em>Ferramentas → Verificar pendências</em>, depois <em>Entregar declaração</em>. Guarde o recibo.</li>
        </ol>
      </S>
      <S t="7. Ano que vem: só atualizar">
        <p>Na aba Salvar e baixar, salve o cofre. No próximo ano, abra o arquivo .niza com as 24 palavras e clique em &quot;Atualizar&quot;: o que você tinha em 31/12 vira a situação anterior, e os dados de corretoras e bens extras continuam lá.</p>
      </S>
      <p className="text-xs text-muted">Conteúdo informativo, baseado nas regras gerais. Não substitui um contador nem as orientações oficiais da Receita Federal. Os limites e códigos mudam com o tempo: confirme sempre no programa do ano.</p>
    </div>
  );
}
