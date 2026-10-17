"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BLOCKS, type BlockKey } from "@/lib/protocol";
import { decodeCsvBytes, parseB3, sheetFromCsv, type B3Item } from "@/lib/b3import";
import { readXlsx } from "@/lib/xlsx-lite";
import { brl } from "@/lib/format";

interface Row extends B3Item { on: boolean }

const MAX_FILE = 15 * 1024 * 1024;

export function B3Import() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"replace" | "add">("replace");
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setError(null);
    setInfo(null);
    setRows([]);
    if (!file) return;
    if (file.size > MAX_FILE) return setError("Arquivo grande demais. A planilha da B3 costuma ter poucos KB.");
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const isXlsx = /\.xlsx$/i.test(file.name) || new Uint8Array(buf, 0, 2).join() === "80,75"; // "PK"
      const sheets = isXlsx ? await readXlsx(buf) : [sheetFromCsv(file.name.replace(/\.\w+$/, ""), decodeCsvBytes(buf))];
      const res = parseB3(sheets);
      if (res.items.length === 0) {
        setError(
          res.sheetsRead === 0
            ? "Não encontrei colunas de ativo e valor neste arquivo. Use a planilha de Posição da Área do Investidor da B3 (formato .xlsx)."
            : "O arquivo foi lido, mas nenhuma linha tinha valor atualizado.",
        );
      } else {
        setFileName(file.name);
        setRows(res.items.map((i) => ({ ...i, on: true })));
        setInfo(`${res.items.length} posições encontradas em ${res.sheetsRead} aba(s)${res.skipped ? `, ${res.skipped} linha(s) ignorada(s) (totais ou sem valor)` : ""}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não consegui ler o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  const chosen = rows.filter((r) => r.on);
  const total = chosen.reduce((a, r) => a + r.value, 0);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/portfolio/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, items: chosen.map((r) => ({ block: r.block, label: r.label, value: r.value })) }),
    });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setError(body.error || "Erro ao importar.");
    setRows([]);
    setFileName("");
    setInfo(`${body.imported} posições importadas${body.replaced ? ` (${body.replaced} importadas antes foram substituídas)` : ""}.`);
    router.refresh();
  }

  const update = (i: number, patch: Partial<Row>) => setRows((cur) => cur.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>
          Entre na{" "}
          <a className="text-gold-soft underline" href="https://www.investidor.b3.com.br/" target="_blank" rel="noopener noreferrer">Área do Investidor da B3 ↗</a>{" "}
          (login pelo gov.br).
        </li>
        <li>Abra <strong className="text-white">Extratos</strong>, escolha <strong className="text-white">Posição</strong> e baixe o arquivo em Excel. Os nomes dos menus podem mudar um pouco.</li>
        <li>Envie o arquivo aqui. Você confere as linhas e o bloco de cada uma antes de salvar.</li>
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <label className="btn btn-gold cursor-pointer">
          {busy && rows.length === 0 ? "Lendo…" : "Escolher arquivo da B3"}
          <input type="file" accept=".xlsx,.csv,.txt" className="sr-only" onChange={onFile} disabled={busy} />
        </label>
        <span className="text-xs text-muted">Aceita .xlsx ou .csv. O arquivo é lido no seu navegador e não é enviado: só as linhas que você confirmar (nome e valor) são salvas.</span>
      </div>

      {error && <p role="alert" className="text-sm text-down">{error}</p>}
      {info && !error && <p className="text-sm text-up">{info}</p>}

      {rows.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted">Arquivo: {fileName}. Desmarque o que não quer importar e ajuste o bloco se precisar. Linhas em amarelo são um palpite: confira.</p>
          <div className="overflow-x-auto">
            <table className="data">
              <thead><tr><th></th><th>Posição</th><th>Bloco do Protocolo</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.block}|${r.label}`} className={r.on ? "" : "opacity-45"}>
                    <td><input type="checkbox" checked={r.on} onChange={(e) => update(i, { on: e.target.checked })} aria-label={`Importar ${r.label}`} /></td>
                    <td title={r.product}>{r.label}{r.qty !== null && <span className="ml-1 text-xs text-muted">({r.qty.toLocaleString("pt-BR")})</span>}</td>
                    <td>
                      <select
                        className={`input !py-1 !text-sm ${r.review ? "!border-gold" : ""}`}
                        value={r.block}
                        onChange={(e) => update(i, { block: e.target.value as BlockKey, review: false })}
                        aria-label={`Bloco de ${r.label}`}
                      >
                        {BLOCKS.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}
                      </select>
                    </td>
                    <td className="num">{brl(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <strong>{chosen.length}</strong> selecionadas, total <strong>{brl(total)}</strong>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <label className="inline-flex cursor-pointer items-center gap-1.5"><input type="radio" name="b3mode" checked={mode === "replace"} onChange={() => setMode("replace")} /> Substituir o que importei da B3 antes</label>
                <label className="inline-flex cursor-pointer items-center gap-1.5"><input type="radio" name="b3mode" checked={mode === "add"} onChange={() => setMode("add")} /> Apenas acrescentar</label>
              </div>
            </div>
            <button type="button" className="btn btn-gold" disabled={busy || chosen.length === 0} onClick={save}>{busy ? "Salvando…" : "Importar selecionadas"}</button>
          </div>
        </div>
      )}

      <p className="rounded-lg border border-line p-3 text-xs text-muted">
        <strong className="text-white">Conexão automática com login na B3:</strong> a B3 não libera acesso direto para aplicativos comuns. Ele exige contrato com a B3 ou um agregador
        autorizado (serviço pago). Por enquanto, a importação do arquivo oficial é o caminho mais seguro: você baixa a posição quando quiser e o app faz o resto em segundos.
        Criptomoedas não vêm da B3: registre-as manualmente.
      </p>
    </div>
  );
}
