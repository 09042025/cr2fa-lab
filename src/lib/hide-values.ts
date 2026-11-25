"use client";

import { useSyncExternalStore } from "react";

const KEY = "niza-ocultar-valores";
const listeners = new Set<() => void>();
let hiddenNow = false;

function read(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

/** Liga/desliga o modo "ocultar valores" (lembrado neste aparelho). Todas as telas do orçamento usam o mesmo. */
export function useHideValues() {
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  hiddenNow = hidden;
  const toggle = () => {
    try { localStorage.setItem(KEY, hidden ? "0" : "1"); } catch { /* sem armazenamento: vale só até recarregar */ }
    hiddenNow = !hidden;
    listeners.forEach((f) => f());
  };
  return { hidden, toggle };
}

const MASK = "R$ ••••";
export const money0 = (v: number) => (hiddenNow ? MASK : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }));
export const money2 = (v: number) => (hiddenNow ? MASK : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
/** Estilo para campos de valor: mostra bolinhas no lugar dos números. */
export const maskStyle = (hidden: boolean) => (hidden ? ({ WebkitTextSecurity: "disc" } as React.CSSProperties) : undefined);
