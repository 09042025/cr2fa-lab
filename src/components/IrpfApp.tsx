"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pushAvgToPortfolio } from "@/lib/irpf-sync";
import { buildIrpfPdf } from "@/lib/irpf-pdf";
import { applyDec, parseDec, type DecResult } from "@/lib/irpf-dec";
import { deviceSupported, forgetDevice, hasDevicePhrase, quickUnlock, saveDevicePhrase } from "@/lib/irpf-device";
import { decryptVault, encryptVault, isValidPhrase, newPhrase, normalizePhrase, pickChecks, type VaultFile } from "@/lib/irpf-crypto";
import {
  PROV_INFO, type ProvEdit, buildBens, fmtField, programCode, buildProventos, emptyWorkspace, parseNum, rollover, roteiro, snapshotOf, totalsByType,
  type CustomBem, type PortfolioItem, type PrevBem, type ProvType, type Workspace,
} from "@/lib/irpf";

const IDLE_MS = 10 * 60 * 1000;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const usd = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD" });

type Stage = "gate" | "new" | "check" | "open" | "work";
type Tab = "inicio" | "guia" | "importar" | "bens" | "isentos" | "exclusivos" | "exterior" | "salvar";
/** Telas do programa da Receita, nos mesmos nomes e na mesma ordem da tela inicial dele. */
const FICHAS: { tab: Tab | null; nome: string; icon: string }[] = [
  { tab: null, nome: "Identificação do Contribuinte", icon: "🪪" },
  { tab: null, nome: "Rendimentos Tributáveis Recebidos de PJ", icon: "💼" },
  { tab: null, nome: "Rendimentos Tributáveis Recebidos de PF e do Exterior", icon: "🌐" },
  { tab: "isentos", nome: "Rendimentos Isentos e Não Tributáveis", icon: "✅" },
  { tab: "exclusivos", nome: "Rendimentos Sujeitos à Tributação Exclusiva/Definitiva", icon: "⚠️" },
  { tab: null, nome: "Imposto Pago/Retido", icon: "💲" },
  { tab: null, nome: "Pagamentos Efetuados", icon: "💳" },
  { tab: "bens", nome: "Bens e Direitos", icon: "🏠" },
  { tab: null, nome: "Dívidas e Ônus Reais", icon: "⬇️" },
  { tab: null, nome: "Renda Variável - Operações", icon: "📈" },
  { tab: null, nome: "Cálculo do Imposto", icon: "🧮" },
];
const PROV_PROGRAM: Record<ProvType, { codigo: string; nome: string }> = {
  dividendos: { codigo: "09", nome: "Lucros e dividendos recebidos" },
  fii: { codigo: "26", nome: "Outros" },
  jcp: { codigo: "10", nome: "Juros sobre capital próprio" },
  exterior: { codigo: "—", nome: "Lucros e dividendos de ativos no exterior" },
};

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
  const [tab, setTab] = useState<Tab>("inicio");
  const [openBem, setOpenBem] = useState<string | null>(null);
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
  const [quick, setQuick] = useState(false);
  const [quickPos, setQuickPos] = useState<number[]>([]);
  const [quickAns, setQuickAns] = useState<Record<number, string>>({});
  const [remember, setRemember] = useState(false);
  const [forceFull, setForceFull] = useState(false);
  const [openMsg, setOpenMsg] = useState<string | null>(null);
  const [dec, setDec] = useState<DecResult | null>(null);
  const [decName, setDecName] = useState("");
  useEffect(() => { void hasDevicePhrase().then((v) => { setQuick(v); if (v) setQuickPos(pickChecks()); }); }, [stage]);

  const startNew = () => { setWords(newPhrase()); setChecks(pickChecks()); setAnswers({}); setStage("new"); setMsg(null); };
  const confirmWords = () => {
    const list = words.split(" ");
    if (checks.some((n) => (answers[n] ?? "").trim().toLowerCase() !== list[n - 1])) { setMsg("As palavras não conferem. Olhe o papel onde anotou e tente de novo."); return; }
    setPhrase(words); setWords(""); setWs(emptyWorkspace(year)); setStage("work"); setTab("inicio"); setMsg(null); setDirty(true);
  };
  const pickFile = async (f: File | null) => {
    setFile(null); setFileName(""); setOpenMsg(null);
    if (!f) return;
    if (f.size > 5_000_000) { setOpenMsg("Arquivo grande demais para ser um cofre."); return; }
    try { setFile(JSON.parse(await f.text()) as VaultFile); setFileName(f.name); } catch { setOpenMsg("Esse arquivo não parece um cofre do Niza (.niza)."); }
  };
  const openVault = async (viaQuick = false) => {
    if (!file) { setOpenMsg("Escolha o arquivo do cofre (.niza)."); return; }
    setBusy(true); setOpenMsg(null);
    try {
      let ph = openPhrase;
      if (viaQuick) {
        const r = await quickUnlock(quickAns);
        if (!r.ok) {
          setQuickAns({}); setQuickPos(pickChecks());
          if (r.wiped) { setQuick(false); setForceFull(true); setOpenMsg("Palavras erradas 3 vezes. Por segurança, apagamos a lembrança deste aparelho: digite as 24 palavras."); }
          else setOpenMsg(`Palavras erradas. Você ainda tem ${r.left} tentativa(s) antes de pedirmos as 24.`);
          setBusy(false); return;
        }
        ph = r.phrase;
      } else if (!isValidPhrase(ph)) { setOpenMsg("As 24 palavras não são válidas. Confira a ordem e a grafia."); setBusy(false); return; }
      const w = await decryptVault<Workspace>(ph, file);
      if (!w || w.v !== 1 || typeof w.year !== "number") throw new Error("Conteúdo do cofre inesperado.");
      const full: Workspace = { ...emptyWorkspace(w.year), ...w };
      if (!viaQuick && remember && deviceSupported()) { try { await saveDevicePhrase(normalizePhrase(ph)); } catch { /* sem armazenamento: segue sem lembrar */ } }
      setPhrase(normalizePhrase(ph)); setOpenPhrase(""); setQuickAns({});
      if (full.year < year) { setOpened(full); setStage("open"); } else { setWs(full); setStage("work"); setTab("inicio"); }
    } catch (e) { setOpenMsg(e instanceof Error ? e.message : "Não foi possível abrir."); }
    setBusy(false);
  };

  /* ---------------------------------- cálculos ---------------------------------- */
  const bens = useMemo(() => (ws ? buildBens(items, ws) : []), [items, ws]);
  const prov = useMemo(() => (ws ? buildProventos(items, ws) : []), [items, ws]);
  const totals = useMemo(() => totalsByType(prov), [prov]);
  const pushable = useMemo(() => bens.filter((b) => b.item.id !== undefined && !b.item.avg && b.avg && b.avg > 0 && b.item.kind !== "acao_us").map((b) => ({ id: b.item.id as number, avg: b.avg as number, ticker: b.item.ticker ?? b.item.label })), [bens]);
  const syncPortfolio = async () => {
    setBusy(true); setMsg(null);
    try { const n = await pushAvgToPortfolio(pushable.map(({ id, avg }) => ({ id, avg }))); setMsg(`Portfólio atualizado: ${n} ativo(s) receberam o preço médio. Recarregue a página do Portfólio para ver.`); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Não foi possível atualizar o Portfólio."); }
    setBusy(false);
  };
  const makePdf = async () => {
    if (!ws) return;
    setBusy(true); setMsg(null);
    try { const blob = await buildIrpfPdf({ year: ws.year, bens, custom: ws.custom, prov }); downloadBlob(`roteiro-irpf-${ws.year + 1}.pdf`, blob); setMsg("PDF gerado no seu aparelho. Ele não é criptografado: guarde com cuidado e apague depois de usar."); }
    catch { setMsg("Não foi possível gerar o PDF."); }
    setBusy(false);
  };

  const pickDec = async (f: File | null) => {
    setDec(null); setMsg(null);
    if (!f) return;
    if (!/\.dec$/i.test(f.name)) { setMsg("Esse arquivo não termina em .DEC. Use o arquivo da declaração (não o recibo nem o backup .DBK)."); return; }
    setDecName(f.name);
    setDec(parseDec(new Uint8Array(await f.arrayBuffer())));
  };

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
          {quick && !forceFull ? (
            <>
              <p className="mt-3 text-sm text-muted">Este aparelho já foi autorizado. Confirme só estas palavras das suas 24:</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {quickPos.map((n) => <div key={n}><label className="label" htmlFor={`q${n}`}>Palavra nº {n}</label><input id={`q${n}`} className="input w-36" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={quickAns[n] ?? ""} onChange={(e) => setQuickAns((a) => ({ ...a, [n]: e.target.value }))} /></div>)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" disabled={busy} className="btn btn-gold" onClick={() => void openVault(true)}>{busy ? "Abrindo…" : "Abrir cofre"}</button>
                <button type="button" className="text-xs text-gold-soft underline" onClick={() => setForceFull(true)}>Usar as 24 palavras</button>
              </div>
              <p className="mt-2 text-xs text-muted">Errou 3 vezes? Apagamos a lembrança deste aparelho e pedimos as 24 palavras.</p>
            </>
          ) : (
            <>
              <label className="label mt-3" htmlFor="ph">As 24 palavras</label>
              <textarea id="ph" className="input w-full" rows={3} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={openPhrase} onChange={(e) => setOpenPhrase(e.target.value)} placeholder="palavra1 palavra2 palavra3 ..." />
              {deviceSupported() && (
                <label className="mt-3 flex items-start gap-2 text-xs text-muted"><input type="checkbox" className="mt-0.5" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>Lembrar neste aparelho: nas próximas vezes peço só 3 palavras. Marque apenas em aparelho seu, com bloqueio de tela. As palavras ficam criptografadas aqui e nunca vão para o servidor.</span></label>
              )}
              <button type="button" disabled={busy} className="btn btn-gold mt-3" onClick={() => void openVault()}>{busy ? "Abrindo…" : "Abrir cofre"}</button>
            </>
          )}
          {fileName && <p className="mt-2 text-xs text-muted">Arquivo: {fileName}</p>}
          {openMsg && <p role="alert" className="mt-3 rounded-lg border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">{openMsg}</p>}
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
        <button type="button" className="btn btn-gold" onClick={() => { setWs(rollover(opened, year)); setOpened(null); setStage("work"); setTab("inicio"); setDirty(true); }}>Atualizar para {year}</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setWs(opened); setOpened(null); setStage("work"); setTab("inicio"); }}>Só ver/editar o de {opened.year}</button>
      </div>
    </section>
  );

  if (!ws) return null;
  const warnCount = bens.reduce((a, b) => a + b.warnings.length, 0);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-up/40 bg-up/10 px-4 py-2.5 text-sm">
        <span className="flex items-center gap-2 text-up"><span aria-hidden>🔒</span> Cofre aberto · ano-calendário {ws.year} · só no seu navegador{dirty ? " · alterações não salvas" : ""}</span>
        <span className="flex gap-2">{quick && <button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => void forgetDevice().then(() => { setQuick(false); setMsg("Este aparelho foi esquecido: na próxima vez, só com as 24 palavras."); })}>Esquecer este aparelho</button>}<button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => lock("Cofre travado. Seus dados foram apagados da tela.")}>Travar e limpar a tela</button></span>
      </div>
      {tab !== "inicio" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <button type="button" className="btn btn-ghost !py-1" onClick={() => { setTab("inicio"); setOpenBem(null); }}>‹ Fichas da Declaração</button>
          <span className="text-muted">/ {tab === "guia" ? "Passo a passo" : tab === "importar" ? "Importações" : tab === "bens" ? "Bens e Direitos" : tab === "isentos" ? "Rendimentos Isentos e Não Tributáveis" : tab === "exclusivos" ? "Rendimentos Sujeitos à Tributação Exclusiva/Definitiva" : tab === "exterior" ? "Ativos no exterior" : "Salvar e baixar"}</span>
        </div>
      )}
      {msg && <p role="status" className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-soft">{msg}</p>}

      {tab === "inicio" && (
        <div className="space-y-4">
          <p className="text-sm text-muted">Esta tela é igual à tela inicial do programa <strong className="text-white">IRPF {ws.year + 1}</strong> da Receita. Os nomes das fichas são os mesmos. As fichas em destaque o Niza já deixa pronta para você copiar e colar no programa. As apagadas você preenche direto no programa.</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {FICHAS.map((f) => (
              <button key={f.nome} type="button" disabled={!f.tab} onClick={() => f.tab && setTab(f.tab)} className={`card flex min-h-[7rem] flex-col items-center justify-center gap-2 p-3 text-center text-xs ${f.tab ? "border-gold/50 text-white hover:border-gold" : "cursor-not-allowed opacity-40"}`}>
                <span className="text-2xl" aria-hidden>{f.icon}</span>
                <span>{f.nome}</span>
                {f.tab === "bens" && warnCount > 0 && <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] text-yellow-300">{warnCount} avisos</span>}
                {!f.tab && <span className="text-[10px]">preencha no programa</span>}
              </button>
            ))}
          </div>
          <h3 className="pt-2 text-sm font-semibold text-gold-soft">Ferramentas do Niza</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([["importar", "📥", "Importações (.DEC do ano passado)"], ["guia", "📖", "Passo a passo"], ["salvar", "💾", "Salvar e baixar (cofre e PDF)"]] as [Tab, string, string][]).map(([k, ic, nm]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className="card flex min-h-[6rem] flex-col items-center justify-center gap-2 p-3 text-center text-xs hover:border-gold"><span className="text-2xl" aria-hidden>{ic}</span><span>{nm}</span></button>
            ))}
            {items.some((i) => i.kind === "acao_us") && <button type="button" onClick={() => setTab("exterior")} className="card flex min-h-[6rem] flex-col items-center justify-center gap-2 p-3 text-center text-xs hover:border-gold"><span className="text-2xl" aria-hidden>🇺🇸</span><span>Ativos no exterior (EUA)</span></button>}
          </div>
        </div>
      )}

      {tab === "guia" && <Guide year={ws.year} hasPrev={ws.previous.length > 0} />}

      {tab === "importar" && (
        <div className="space-y-4">
          <section className="card border-gold/30 p-4">
            <h3 className="font-semibold">Importar a declaração do ano passado (.DEC)</h3>
            <p className="mt-1 text-xs text-muted">Puxa todo o histórico: o que você tinha em 31/12/{ws.year - 1} vira a &quot;situação anterior&quot;, e imóveis, veículos e contas continuam para você só atualizar. O arquivo é lido aqui no seu navegador e <strong className="text-white">não é enviado a lugar nenhum</strong>; CPF e nome do arquivo são ignorados.</p>
            <p className="mt-1 text-xs text-muted">Onde achar: no programa da Receita, abra a declaração entregue; o arquivo .DEC fica na pasta de declarações transmitidas (algo como <em>ProgramasRFB/IRPF{ws.year}/transmitidas</em>, nome terminando em ORIG.DEC ou RETIF.DEC). No celular/app gov.br, peça o arquivo da declaração em Meu Imposto de Renda.</p>
            <input type="file" accept=".dec,.DEC" className="input mt-3 w-full" onChange={(e) => void pickDec(e.target.files?.[0] ?? null)} />
            {dec && !dec.ok && <p role="alert" className="mt-3 text-sm text-down">{dec.error}</p>}
            {dec && dec.ok && (
              <div className="mt-3 rounded-lg border border-line bg-panel-2 p-3 text-sm">
                <p className="font-semibold text-white">{decName}</p>
                <p className="text-muted">{dec.exercicio ? `Declaração de ${dec.exercicio} (ano-base ${dec.anoBase})` : "Ano não identificado"} · {dec.bens.length} bem(ns) · isentos: {Object.keys(dec.isentos).length} código(s) · exclusivos: {Object.keys(dec.exclusivos).length} código(s)</p>
                {dec.anoBase !== null && dec.anoBase !== ws.year - 1 && <p className="mt-1 text-yellow-300">Atenção: o ano-base deste arquivo é {dec.anoBase}, mas o simulado espera {ws.year - 1} como ano anterior.</p>}
                {dec.warnings.map((w) => <p key={w} className="mt-1 text-xs text-yellow-300">● {w}</p>)}
                <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-muted">{dec.bens.map((b, i) => <li key={i}>{b.grupo}-{b.codigo} · {brl(b.atual)} · {b.texto.slice(0, 90)}{b.texto.length > 90 ? "…" : ""}</li>)}</ul>
                <p className="mt-2 text-xs text-muted">Confira se bate com a sua declaração antes de aplicar.</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn btn-gold" onClick={() => { update((w) => applyDec(w, dec, items.map((i) => i.ticker).filter((t): t is string => !!t))); setDec(null); setMsg("Histórico importado. Revise os bens abaixo e os avisos."); }}>Aplicar histórico</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setDec(null)}>Cancelar</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "bens" && (
        <div className="space-y-4">
          {openBem === null ? (
            <>
              <p className="text-sm text-muted">Esta é a lista da ficha <strong className="text-white">Bens e Direitos</strong>, como no programa. Na declaração, ações, FIIs e cripto entram pelo <strong className="text-white">custo de aquisição</strong> (quantidade × preço médio), não pelo valor de hoje. Toque em um bem para ver os campos na ordem do programa.</p>
              {bens.length === 0 && <p className="card p-4 text-sm text-muted">Nenhum ativo na carteira. Cadastre em Portfólio ou adicione bens abaixo.</p>}
          {pushable.length > 0 && (
            <section className="card border-up/30 p-4 text-sm">
              <h3 className="font-semibold">Ligação com o Portfólio</h3>
              <p className="mt-1 text-xs text-muted">O que falta aqui é puxado do Portfólio (quantidade e preço médio). O que falta no Portfólio pode ser preenchido com o que você informou aqui ou que veio do .DEC. {pushable.length} ativo(s) estão sem preço médio no Portfólio: {pushable.map((x) => x.ticker).join(", ")}.</p>
              <p className="mt-1 text-xs text-muted">Ao clicar, enviamos ao Portfólio <strong className="text-white">somente o preço médio</strong> desses ativos (nunca texto, CNPJ, valores da declaração ou dados do .DEC), e nunca trocamos um preço médio que já exista lá.</p>
              <button type="button" disabled={busy} className="btn btn-ghost mt-2" onClick={() => void syncPortfolio()}>{busy ? "Atualizando…" : `Atualizar o preço médio no Portfólio (${pushable.length})`}</button>
            </section>
          )}
              <div className="space-y-2">
                {bens.map((b, idx) => (
                  <button key={b.key} type="button" onClick={() => setOpenBem(b.key)} className="card flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:border-gold">
                    <span className="min-w-0"><span className="block font-semibold">{idx + 1}. {b.item.ticker ?? b.item.label} <span className="text-xs font-normal text-muted">· {b.code.grupo}-{b.code.codigo}</span></span><span className="block truncate text-xs text-muted">{b.text}</span></span>
                    <span className="shrink-0 text-right"><span className="block text-xs text-muted">31/12/{ws.year}</span><span className="font-semibold">{b.total !== null ? fmtField(b.total) : "—"}</span>{b.warnings.length > 0 && <span className="block text-[11px] text-yellow-300">{b.warnings.length} aviso(s)</span>}</span>
                  </button>
                ))}
              </div>
              {Object.entries(ws.edits).some(([, e]) => e.skip) && (
                <p className="text-xs text-muted">Fora da declaração: {Object.entries(ws.edits).filter(([, e]) => e.skip).map(([k]) => items.find((i) => i.key === k)?.ticker ?? k).join(", ")}. <button type="button" className="text-gold-soft underline" onClick={() => update((w) => ({ ...w, edits: Object.fromEntries(Object.entries(w.edits).map(([k, e]) => [k, { ...e, skip: false }])) }))}>incluir de novo</button></p>
              )}
              <CustomBens ws={ws} update={update} />
              <PrevBens ws={ws} update={update} />
            </>
          ) : (() => {
            const idx = bens.findIndex((x) => x.key === openBem);
            const b = bens[idx];
            if (!b) return <button type="button" className="btn btn-ghost" onClick={() => setOpenBem(null)}>‹ Voltar à lista</button>;
            const pc = programCode(b.code.grupo, b.code.codigo);
            const needsCnpj = b.item.kind === "acao" || b.item.kind === "fii";
            const e = ws.edits[b.item.key];
            const setE = (patch: Partial<NonNullable<typeof e>>) => update((w) => ({ ...w, edits: { ...w.edits, [b.item.key]: { ...w.edits[b.item.key], ...patch } } }));
            const tag = (from: string | null) => (from ? <span className="ml-1 rounded bg-panel-2 px-1.5 py-0.5 text-[10px] text-muted">{from === "você" ? "digitado" : `do ${from}`}</span> : null);
            return (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" className="btn btn-ghost !py-1" onClick={() => setOpenBem(null)}>‹ Voltar à lista</button>
                  <span className="flex gap-2">
                    <button type="button" className="btn btn-ghost !py-1" disabled={idx === 0} onClick={() => setOpenBem(bens[idx - 1].key)}>‹ Anterior</button>
                    <button type="button" className="btn btn-ghost !py-1" disabled={idx === bens.length - 1} onClick={() => setOpenBem(bens[idx + 1].key)}>Próximo ›</button>
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold">Bem {idx + 1} de {bens.length}: {b.item.ticker ?? b.item.label}</h3>

                <div className="card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Passo 1 · No Niza: confira estes dados (não existem no programa)</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div><label className="label">Quantidade em 31/12{tag(b.qtyFrom)}</label><input className="input w-full" inputMode="decimal" autoComplete="off" value={b.qty === null ? "" : String(b.qty).replace(".", ",")} onChange={(ev) => setE({ qty: parseNum(ev.target.value) })} /></div>
                    <div><label className="label">{b.item.kind === "acao_us" ? "Preço médio (US$)" : "Preço médio (R$)"}{tag(b.avgFrom)}</label><input className="input w-full" inputMode="decimal" autoComplete="off" value={b.avg === null ? "" : String(Math.round(b.avg * 1e6) / 1e6).replace(".", ",")} onChange={(ev) => setE({ avg: parseNum(ev.target.value) })} /></div>
                    <Field label="Corretora / exchange" value={b.custody} text onChange={(v) => setE({ custody: v })} />
                    {needsCnpj ? <Field label="CNPJ" value={b.cnpj} text onChange={(v) => setE({ cnpj: v })} /> : <div />}
                  </div>
                  {b.warnings.length > 0 && <ul className="mt-3 space-y-1 text-xs text-yellow-300">{b.warnings.map((x) => <li key={x}>● {x}</li>)}</ul>}
                </div>

                <div className="rounded-xl border border-gold/40 bg-black/20 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold-soft">Passo 2 · No programa da Receita: Bens e Direitos › Novo</p>
                  <p className="mb-2 text-xs text-muted">Os campos abaixo estão na ordem do programa. Toque em <strong className="text-white">Copiar</strong> e cole no campo igual.</p>
                  <Mirror label="Grupo" value={pc.grupo} />
                  <Mirror label="Código" value={pc.codigo} />
                  <Mirror label="Localização (País)" value={`${b.pais.codigo} - ${b.pais.nome}`} />
                  {needsCnpj && <Mirror label="CNPJ" value={b.cnpj} empty="Preencha o CNPJ no Passo 1" />}
                  <div className="border-t border-line/60 py-2">
                    <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted">Discriminação <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[10px]">{b.source === "dec" ? "texto do .DEC" : b.source === "editado" ? "editado por você" : "automático"}</span></span><span className={`text-[10px] ${b.text.length > 512 ? "text-down" : "text-muted"}`}>{b.text.length}/512</span></div>
                    <textarea aria-label="Discriminação" className="input mt-1 w-full text-sm" rows={4} value={b.text} spellCheck={false} onChange={(ev) => setE({ text: ev.target.value })} />
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <button type="button" className="btn btn-ghost !py-1" onClick={() => void navigator.clipboard.writeText(b.text).then(() => setMsg("Discriminação copiada. Cole no campo Discriminação do programa."))}>Copiar</button>
                      {e?.text !== undefined && <button type="button" className="btn btn-ghost !py-1" onClick={() => setE({ text: undefined })}>Desfazer minha edição</button>}
                    </div>
                  </div>
                  <Mirror label={`Situação em 31/12/${ws.year - 1}`} value={b.prev !== null ? fmtField(b.prev) : ""} empty="Sem valor (bem novo ou .DEC não importado)" />
                  <Mirror label={`Situação em 31/12/${ws.year}`} value={b.total !== null ? fmtField(b.total) : ""} empty="Informe quantidade e preço médio" note={b.foreign ? "Ativo no exterior: converta para reais pela PTAX da compra." : undefined} />
                </div>
                <button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => { setE({ skip: true }); setOpenBem(null); }}>Não incluir na declaração (já vendi)</button>
              </section>
            );
          })()}
        </div>
      )}

      {(tab === "isentos" || tab === "exclusivos" || tab === "exterior") && (() => {
        const want: ProvType[] = tab === "isentos" ? ["dividendos", "fii"] : tab === "exclusivos" ? ["jcp"] : ["exterior"];
        const rows = prov.filter((p) => want.includes(p.type));
        const others = prov.filter((p) => !want.includes(p.type));
        const ficha = tab === "isentos" ? "Rendimentos Isentos e Não Tributáveis" : tab === "exclusivos" ? "Rendimentos Sujeitos à Tributação Exclusiva/Definitiva" : "Ativos no exterior (dividendos dos EUA)";
        const sum = rows.reduce((a, r) => a + (r.type === "jcp" ? r.gross - r.irrf : r.gross), 0);
        return (
          <div className="space-y-4">
            <p role="note" className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">Os valores são <strong>estimativas</strong> (proventos do ano × quantidade de hoje). O número oficial está no <strong>informe de rendimentos</strong> da corretora (sai em fevereiro). Ajuste cada valor para bater com ele.</p>
            {tab === "exterior" && <p className="card p-4 text-sm text-muted">Dividendos de ações dos EUA seguem a Lei 14.754 (15%) e ficam em ficha própria do programa. Não vi essa ficha no print do seu programa, então procure pelo nome &quot;exterior&quot; no menu Fichas. Converta para reais pela cotação do dólar de cada recebimento e confira com um contador.</p>}
            {ws.lastYear && tab !== "exterior" && (
              <p className="card p-4 text-sm text-muted">No ano passado ({ws.lastYear.anoBase ?? "?"}) você declarou nesta ficha: {Object.entries(tab === "isentos" ? ws.lastYear.isentos : ws.lastYear.exclusivos).map(([k, v]) => `código ${k}: ${brl(v)}`).join(" · ") || "nada"}. Use como referência.</p>
            )}
            {rows.length === 0 && <p className="card p-4 text-sm text-muted">Nada a lançar nesta ficha com os ativos da carteira.</p>}
            {rows.map((p) => {
              const pg = PROV_PROGRAM[p.type];
              const valor = p.type === "jcp" ? p.gross - p.irrf : p.gross;
              const setP = (patch: Partial<ProvEdit>) => update((w) => ({ ...w, prov: { ...w.prov, [p.item.key]: { ...w.prov[p.item.key], ...patch } } }));
              return (
                <section key={p.key} className="space-y-3">
                  <h3 className="font-semibold">{p.item.ticker} <span className="text-xs font-normal text-muted">· {p.payer} · {p.lines} provento(s) em {ws.year}</span></h3>
                  <div className="card p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Passo 1 · No Niza: confira</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                      <div><label className="label" htmlFor={`pt-${p.key}`}>Tipo</label>
                        <select id={`pt-${p.key}`} className="input w-full" value={p.type} onChange={(e) => setP({ type: e.target.value as ProvType, irrf: null })}>
                          {(["dividendos", "jcp", "fii", "exterior"] as ProvType[]).filter((t) => (p.item.kind === "acao_us" ? t === "exterior" : p.item.kind === "fii" ? t === "fii" : t === "dividendos" || t === "jcp")).map((t) => <option key={t} value={t}>{PROV_INFO[t].titulo}</option>)}
                        </select></div>
                      <Field label={`Valor ${p.type === "jcp" ? "bruto " : ""}recebido no ano (${p.currency === "USD" ? "US$" : "R$"})`} value={String(p.gross).replace(".", ",")} onChange={(v) => setP({ gross: parseNum(v) ?? 0 })} />
                      {p.type === "jcp" && <Field label="IR retido na fonte (R$)" value={String(p.irrf).replace(".", ",")} onChange={(v) => setP({ irrf: parseNum(v) ?? 0 })} />}
                    </div>
                    <p className="mt-2 text-xs text-muted">{PROV_INFO[p.type].dica}</p>
                  </div>
                  {p.type !== "exterior" && (
                    <div className="rounded-xl border border-gold/40 bg-black/20 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-soft">Passo 2 · No programa da Receita: {ficha} › Novo</p>
                      <Mirror label="Tipo de Rendimento" value={`${pg.codigo} - ${pg.nome}`} />
                      <Mirror label="Beneficiário" value="Titular" />
                      <Mirror label="CNPJ da Fonte Pagadora" value={p.cnpj} empty="Sem CNPJ: veja no informe de rendimentos" />
                      <Mirror label="Nome da Fonte Pagadora" value={p.payer} />
                      <Mirror label={p.type === "jcp" ? "Valor (líquido, já sem os 15%)" : "Valor"} value={fmtField(valor)} note={p.type === "jcp" ? "No informe de rendimentos, use o valor líquido de JCP. Confirme lá." : undefined} />
                    </div>
                  )}
                </section>
              );
            })}
            {rows.length > 0 && <p className="text-sm text-muted">Total desta ficha: <strong className="text-white">{tab === "exterior" ? usd(sum) : brl(sum)}</strong></p>}
            {others.length > 0 && <p className="text-xs text-muted">Os demais proventos estão nas outras fichas, na tela inicial.</p>}
            <p className="text-xs text-muted">Regra nova (Lei 15.270/2025): desde 1/1/2026, dividendos acima de R$ 50 mil por mês de uma mesma empresa para você têm 10% retidos na fonte. Se acontecer, o informe mostra o valor. Confirme com um contador.</p>
          </div>
        );
      })()}

      {tab === "salvar" && (
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="font-display text-lg font-bold text-gold-soft">1. Salvar o cofre (criptografado)</h2>
            <p className="mt-2 text-sm text-muted">Gera o arquivo <strong className="text-white">irpf-{ws.year}.niza</strong> no seu aparelho. Ele só abre com as suas 24 palavras. Ano que vem, abra este arquivo aqui e atualizamos tudo para a nova declaração.</p>
            <button type="button" disabled={busy} className="btn btn-gold mt-3" onClick={() => void save()}>{busy ? "Criptografando…" : "Salvar cofre (.niza)"}</button>
          </section>
          <section className="card border-gold/40 p-5">
            <h2 className="font-display text-lg font-bold text-gold-soft">Concluir: gerar o PDF do passo a passo</h2>
            <p className="mt-2 text-sm text-muted">Gera um PDF como uma declaração final, com as fichas na ordem do programa da Receita (Bens e Direitos, Rendimentos), cada bem com Grupo, Código, País, CNPJ, Discriminação e Situações, para você ir copiando para o programa oficial.</p>
            <p role="note" className="mt-2 text-xs text-yellow-300">O PDF é feito no seu aparelho e não é criptografado: guarde com cuidado e apague depois de usar.</p>
            <button type="button" disabled={busy} className="btn btn-gold mt-3" onClick={() => void makePdf()}>{busy ? "Gerando…" : "Gerar PDF do passo a passo"}</button>
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

/** Linha espelhada do programa da Receita, com botão de copiar o valor exatamente como o campo espera. */
function Mirror({ label, value, empty, note }: { label: string; value: string; empty?: string; note?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 py-2 first:border-t-0">
      <div className="min-w-0 flex-1"><p className="text-xs text-muted">{label}</p><p className={`break-words text-sm font-semibold ${value ? "text-white" : "text-yellow-300"}`}>{value || empty || "—"}</p>{note && <p className="text-[11px] text-yellow-300">{note}</p>}</div>
      {value && <button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => void navigator.clipboard.writeText(value).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); })}>{ok ? "Copiado ✓" : "Copiar"}</button>}
    </div>
  );
}

function Field({ label, value, onChange, text }: { label: string; value: string; onChange: (v: string) => void; text?: boolean }) {
  return <div><label className="label">{label}</label><input className="input w-full" inputMode={text ? "text" : "decimal"} autoComplete="off" spellCheck={false} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function download(name: string, content: string, type: string) { downloadBlob(name, new Blob([content], { type })); }
function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
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
        <li>Opcional: &quot;lembrar neste aparelho&quot; guarda as palavras criptografadas só aqui e passa a pedir 3 palavras; 3 erros apagam isso e voltam a pedir as 24.</li>
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
          {c.review && <p className="text-xs text-yellow-300">● {c.review}</p>}
          <label className="mt-1 block text-xs text-muted">Valor em 31/12/{ws.year} (R$): <input className="input ml-1 w-40" inputMode="decimal" autoComplete="off" value={String(c.valor).replace(".", ",")} onChange={(e) => update((w) => ({ ...w, custom: w.custom.map((x) => (x.id === c.id ? { ...x, valor: parseNum(e.target.value) ?? 0, review: undefined } : x)) }))} /></label>
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
      <p className="text-xs text-muted">Se você abriu o cofre do ano passado, isso já veio sozinho. Se é a primeira vez no cofre, digite os valores de 31/12/{ws.year - 1} da sua última declaração (copie a discriminação, com o código do ativo, ex.: PETR4). Ou importe o arquivo .DEC no topo desta aba.</p>
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
