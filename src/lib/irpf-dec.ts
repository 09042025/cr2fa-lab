/**
 * Leitura do arquivo .DEC da declaração anterior (leiaute oficial da Receita: registros de tamanho fixo, uma linha por registro).
 * Lê só o que o simulado usa: ano da declaração, Bens e Direitos (registro 27), Rendimentos Isentos (23) e Exclusivos (24).
 * CPF, nome e demais dados pessoais do arquivo são IGNORADOS de propósito. Roda no navegador; nada é enviado.
 *
 * Atenção: baseado no leiaute publicado pela Receita (ex. 2022). Posições podem mudar entre anos, então tudo é validado
 * e mostrado para o usuário conferir antes de aplicar.
 */
import type { CustomBem, PrevBem, Workspace } from "./irpf";

export interface DecBem { grupo: string; codigo: string; exterior: boolean; pais: string; texto: string; anterior: number; atual: number }
export interface DecResult {
  ok: boolean; error?: string; warnings: string[];
  exercicio: number | null; anoBase: number | null;
  bens: DecBem[]; isentos: Record<string, number>; exclusivos: Record<string, number>; linhas: number;
}

const MAX_BYTES = 5_000_000;
const sl = (l: string, a: number, b: number) => l.slice(a - 1, b); // posições 1-based, inclusivas, como no leiaute
const money = (s: string): number | null => (/^\d{13}$/.test(s) ? Number(s) / 100 : null);

function decodeText(latin1: string): string {
  const bytes = Uint8Array.from(latin1, (c) => c.charCodeAt(0) & 0xff);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return latin1; }
}

export function parseDec(input: Uint8Array): DecResult {
  const r: DecResult = { ok: false, warnings: [], exercicio: null, anoBase: null, bens: [], isentos: {}, exclusivos: {}, linhas: 0 };
  if (input.length > MAX_BYTES) { r.error = "Arquivo grande demais para ser uma declaração."; return r; }
  // latin1: 1 byte = 1 caractere, então as posições do leiaute (em bytes) valem.
  let text = "";
  for (let i = 0; i < input.length; i += 8192) text += String.fromCharCode(...input.subarray(i, i + 8192));
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  r.linhas = lines.length;
  if (!lines.length) { r.error = "Arquivo vazio."; return r; }

  const head = lines[0];
  const ex = sl(head, 9, 12), ab = sl(head, 13, 16);
  if (/^\d{4}$/.test(ex) && /^\d{4}$/.test(ab) && Number(ab) === Number(ex) - 1) { r.exercicio = Number(ex); r.anoBase = Number(ab); }
  else r.warnings.push("Não reconheci o cabeçalho do arquivo; não consegui confirmar o ano da declaração.");

  for (const l of lines) {
    const reg = l.slice(0, 2);
    if (reg === "27") {
      if (l.length < 1102 || !/^\d{2}$/.test(sl(l, 14, 15))) { r.warnings.push("Uma linha de bem veio fora do formato esperado e foi ignorada."); continue; }
      const anterior = money(sl(l, 532, 544)), atual = money(sl(l, 545, 557));
      if (anterior === null || atual === null) { r.warnings.push("Um bem com valores ilegíveis foi ignorado."); continue; }
      r.bens.push({
        codigo: sl(l, 14, 15), exterior: sl(l, 16, 16) === "1", pais: sl(l, 17, 19).trim(),
        texto: decodeText(sl(l, 20, 531)).replace(/\s+/g, " ").trim(), anterior, atual, grupo: sl(l, 1101, 1102).trim(),
      });
    } else if (reg === "23" || reg === "24") {
      const cod = sl(l, 14, 17), v = money(sl(l, 18, 30));
      if (/^\d{4}$/.test(cod) && v !== null) { const k = String(Number(cod)).padStart(2, "0"); const t = reg === "23" ? r.isentos : r.exclusivos; t[k] = Math.round(((t[k] ?? 0) + v) * 100) / 100; }
    }
  }
  if (!r.bens.length && !Object.keys(r.isentos).length && !Object.keys(r.exclusivos).length) { r.error = "Não encontrei bens nem rendimentos neste arquivo. Ele é mesmo um .DEC de declaração (não o recibo nem o backup .DBK)?"; return r; }
  if (r.bens.some((b) => !/^\d{2}$/.test(b.grupo))) r.warnings.push("O grupo de alguns bens não foi lido; confira os códigos.");
  r.ok = true;
  return r;
}

const INVEST_GROUPS = new Set(["03", "07", "08"]);

/** Tickers citados no texto do bem (PETR4, KNRI11, BTC...). */
const mentions = (texto: string, ticker: string) => new RegExp(`\\b${ticker.replace(/[^A-Z0-9]/gi, "")}\\b`, "i").test(texto);

/**
 * Aplica o histórico no cofre: a situação "atual" da declaração anterior vira a situação anterior deste ano;
 * bens que não são da carteira (imóvel, veículo, conta) são mantidos para só atualizar; ações/FIIs/cripto que não estão
 * mais na carteira entram com valor zero para você conferir.
 */
export function applyDec(ws: Workspace, dec: DecResult, tickers: string[]): Workspace {
  const previous: PrevBem[] = dec.bens.map((b, i) => ({ id: `dec-${i}`, grupo: b.grupo, codigo: b.codigo, discriminacao: b.texto, valor: b.atual }));
  const custom: CustomBem[] = ws.custom.filter((c) => !c.fromDec);
  dec.bens.forEach((b, i) => {
    if (tickers.some((t) => mentions(b.texto, t))) return; // vem da carteira: o simulado recalcula
    const invest = INVEST_GROUPS.has(b.grupo);
    custom.push({
      id: `dec-${i}`, grupo: b.grupo, codigo: b.codigo, discriminacao: b.texto, valor: invest ? 0 : b.atual, prev: b.atual, fromDec: true,
      review: invest ? "Estava na declaração anterior e não está na sua carteira. Se ainda tem, informe o valor; se vendeu, deixe zero e confira o ganho de capital." : "Mantido da declaração anterior: atualize o valor se mudou.",
    });
  });
  return { ...ws, previous, custom, lastYear: { exercicio: dec.exercicio, anoBase: dec.anoBase, isentos: dec.isentos, exclusivos: dec.exclusivos } };
}
