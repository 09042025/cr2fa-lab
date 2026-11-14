"use client";

import { Fragment, useState } from "react";
import { DeleteHolding } from "@/components/DeleteHolding";
import { HoldingActions } from "@/components/HoldingActions";

export interface PositionRowData {
  id: number;
  block: string;
  label: string;
  b3: boolean;
  canTrade: boolean;
  qty: string;
  avg: string | null;
  needsAvg: boolean;
  price: string;
  result: string;
  resultTone: "up" | "down" | "none";
  value: string;
}

/** Tabela de posições: clicar numa linha abre as opções (compra, venda, ajustar, remover). */
export function PositionsTable({ rows }: { rows: PositionRowData[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
    <div className="space-y-2 sm:hidden">
      {rows.map((r) => {
        const isOpen = open === r.id;
        return (
          <div key={r.id} className={`rounded-lg border bg-panel-2 text-xs ${isOpen ? "border-gold/60" : "border-line"}`}>
            <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="block w-full p-3 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold"><span className="truncate">{r.label}</span>{r.b3 && <span className="shrink-0 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold-soft">B3</span>}</span>
                <span className="shrink-0 text-sm font-semibold">{r.value}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted">{r.block}</p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-muted">
                <div><p className="text-[10px] uppercase">Qtd.</p><p className="text-white">{r.qty}</p></div>
                <div><p className="text-[10px] uppercase">P. médio</p><p className="text-white">{r.avg ?? (r.needsAvg ? "ajustar" : "—")}</p></div>
                <div><p className="text-[10px] uppercase">Atual</p><p className="text-white">{r.price}</p></div>
                <div><p className="text-[10px] uppercase">Result.</p><p className={r.resultTone === "up" ? "text-up" : r.resultTone === "down" ? "text-down" : "text-white"}>{r.result}</p></div>
              </div>
            </button>
            {isOpen && (
              <div className="flex flex-wrap items-start gap-x-6 gap-y-2 border-t border-line p-3">
                {r.canTrade && <HoldingActions id={r.id} />}
                <div className="pt-0.5 text-xs"><DeleteHolding id={r.id} /></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
    <table className="hidden sm:table data w-full table-fixed text-xs [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:text-[10px]">
      <thead><tr><th className="w-[14%]">Bloco</th><th className="w-[20%]">Posição</th><th className="num w-[9%]">Qtd.</th><th className="num w-[15%]">Preço médio</th><th className="num w-[14%]">Atual</th><th className="num w-[11%]">Result.</th><th className="num w-[17%]">Valor</th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const isOpen = open === r.id;
          return (
            <Fragment key={r.id}>
              <tr onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className={`cursor-pointer hover:bg-panel-2 ${isOpen ? "bg-panel-2" : ""}`}>
                <td>{r.block}</td>
                <td className="break-words font-semibold">{r.label}{r.b3 && <span className="ml-2 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold-soft">B3</span>}</td>
                <td className="num">{r.qty}</td>
                <td className="num">{r.avg ?? (r.needsAvg ? <span className="text-[10px] text-muted">clique e ajuste</span> : "—")}</td>
                <td className="num">{r.price}</td>
                <td className={`num ${r.resultTone === "up" ? "text-up" : r.resultTone === "down" ? "text-down" : ""}`}>{r.result}</td>
                <td className="num">{r.value}</td>
              </tr>
              {isOpen && (
                <tr className="bg-panel-2">
                  <td colSpan={7} className="!py-3">
                    <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
                      {r.canTrade && <HoldingActions id={r.id} />}
                      <div className="pt-0.5 text-xs"><DeleteHolding id={r.id} /></div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
    </>
  );
}
